// Siembra el catálogo de precios fijos (logistics_rate_items + catalog_items
// de servicios personalizados) desde la hoja "Lista de precios" de
// Tarifario Ticketcode 2026.xlsx — esta hoja es la lista maestra de precios
// unitarios fijos (a diferencia de la hoja "Tarifario", que es una
// instancia ya diligenciada para un evento puntual).
//
// Uso: node scripts/seed-tarifario.mjs
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SOURCE_FILE =
  process.env.TARIFARIO_XLSX ||
  "C:/Users/Personal/Downloads/PROPUESTA COMERIAL TICKETCODE/Tarifario Ticketcode 2026.xlsx";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const wb = xlsx.readFile(SOURCE_FILE);
const listaPrecios = xlsx.utils.sheet_to_json(wb.Sheets["Lista de precios"], {
  header: 1,
  raw: true,
  defval: null,
});
const calculoLogistica = xlsx.utils.sheet_to_json(
  wb.Sheets["Calculo Logistica"],
  { header: 1, raw: true, defval: null }
);

// ---------------------------------------------------------------
// 1) Rubros de logística — precios fijos (columna A/B, filas 2-20),
//    más los dos rubros con tarifa de medio día (columna C).
//
//    Tres rubros tienen fórmula condicional por ciudad en el Excel
//    ('Lista de precios'!D3, D5, D6: IF(Ciudad="Bogotá", x, y)) — se
//    siembran como dos filas (una por ciudad="Bogotá", otra genérica
//    para las demás ciudades con city=null) en vez de un valor plano.
// ---------------------------------------------------------------
const CITY_CONDITIONAL_RATES = {
  "Transporte Case (Trayecto)": { bogota: 20000, otras: 150000 },
  "Transporte aeropuerto - hotel": { bogota: 0, otras: 60000 },
  "Transporte Local (dentro de la ciudad)": { bogota: 20000, otras: 15000 },
};

const logisticsRateItems = [];
let sortOrder = 0;
for (let i = 2; i <= 20; i++) {
  const row = listaPrecios[i];
  if (!row) continue;
  const name = row[1];
  const unitCost = row[2];
  if (!name || typeof name !== "string") continue;
  const trimmedName = name.trim();

  const cityRates = CITY_CONDITIONAL_RATES[trimmedName];
  if (cityRates) {
    logisticsRateItems.push({
      category: "logistica",
      name: trimmedName,
      unit: "por_dia",
      default_unit_cost: cityRates.bogota,
      city: "Bogotá",
      notes: "Tarifa Bogotá",
      sort_order: sortOrder++,
    });
    logisticsRateItems.push({
      category: "logistica",
      name: trimmedName,
      unit: "por_dia",
      default_unit_cost: cityRates.otras,
      city: null,
      notes: "Tarifa fuera de Bogotá",
      sort_order: sortOrder++,
    });
    continue;
  }

  logisticsRateItems.push({
    category: "logistica",
    name: trimmedName,
    unit: "por_dia",
    default_unit_cost: typeof unitCost === "number" ? unitCost : 0,
    city: null,
    notes: null,
    sort_order: sortOrder++,
  });
  // Honorarios Logístico / Supervisor llevan además tarifa de medio día
  // en la columna C de esa misma fila.
  const medioDia = row[3];
  if (typeof medioDia === "number" && medioDia > 0) {
    logisticsRateItems.push({
      category: "logistica",
      name: `${trimmedName} (medio día)`,
      unit: "por_dia",
      default_unit_cost: medioDia,
      city: null,
      notes: null,
      sort_order: sortOrder++,
    });
  }
}

// Escala de Honorarios Productor por aforo (filas 5-8, columnas E/F/G).
const honorariosProductorEscalas = [];
for (let i = 5; i <= 8; i++) {
  const row = listaPrecios[i];
  if (!row) continue;
  const escala = row[4];
  const valor = row[5];
  if (typeof escala === "string" && typeof valor === "number") {
    honorariosProductorEscalas.push({ escala, valor, condicion: row[6] });
  }
}

// ---------------------------------------------------------------
// 2) Servicios personalizados de la plataforma — precios fijos
//    (columnas A/B/C, filas 23-61).
//
//    "Pre acreditación" sale en $0 en esta hoja, pero el precio real
//    está en la hoja "Opcionales" del Excel de Componentes: $350.000/día
//    + IVA ("Acreditación anticipada (x) días antes del evento").
// ---------------------------------------------------------------
const PRICE_OVERRIDES = {
  "Pre acreditación": 350000,
};

const servicios = [];
for (let i = 23; i <= 61; i++) {
  const row = listaPrecios[i];
  if (!row) continue;
  const description = row[1];
  const unitPrice = row[2];
  if (!description || typeof description !== "string") continue;
  const name = description.trim();
  servicios.push({
    modality: "general",
    category: "servicio_personalizado",
    name,
    description: null,
    unit: "por_unidad",
    has_price: true,
    default_unit_price: name in PRICE_OVERRIDES ? PRICE_OVERRIDES[name] : (typeof unitPrice === "number" ? unitPrice : 0),
    default_included: false,
    sort_order: i,
  });
}

// ---------------------------------------------------------------
// 3) Escalas por aforo (tabla "Tabla de Cantidades X Aforo" de la
//    hoja "Calculo Logistica" — cuántos logísticos/supervisores/etc.
//    se necesitan según el aforo).
// ---------------------------------------------------------------
const aforoScales = [];
for (let i = 9; i <= 32; i++) {
  const row = calculoLogistica[i];
  if (!row) continue;
  const aforo = row[6];
  if (typeof aforo !== "number") continue;
  aforoScales.push({
    city: null,
    min_assistants: aforo,
    max_assistants: null,
    conversion_rate_pct: null,
    staffing_rules: {
      logistico: row[7],
      supervisor: row[8],
      productor: row[9],
      rollos_labels: row[10],
      computadores: row[11],
      impresoras: row[12],
    },
    sort_order: i,
  });
}
for (let i = 0; i < aforoScales.length; i++) {
  aforoScales[i].max_assistants = aforoScales[i + 1]
    ? aforoScales[i + 1].min_assistants - 1
    : null;
}

// ---------------------------------------------------------------
// 4) Escalas de precio (Honorarios Productor por aforo, Escarapelas y
//    Manillas por cantidad) — hoja "Lista de precios", filas 5-8 (F/G/H)
//    y 16-18 / 22-24 (F-N).
// ---------------------------------------------------------------
const priceScaleItems = [
  // Honorarios Productor (valor fijo por tramo de aforo).
  { scale_group: "honorarios_productor", tier_min: 1, tier_max: 500, unit_value: 500000, sort_order: 0 },
  { scale_group: "honorarios_productor", tier_min: 501, tier_max: 2500, unit_value: 750000, sort_order: 1 },
  { scale_group: "honorarios_productor", tier_min: 2501, tier_max: 5000, unit_value: 900000, sort_order: 2 },
  { scale_group: "honorarios_productor", tier_min: 5001, tier_max: null, unit_value: 1000000, sort_order: 3 },
];

const QUANTITY_TIERS = [
  { min: 1, max: 100 },
  { min: 101, max: 200 },
  { min: 201, max: 500 },
  { min: 501, max: 1000 },
  { min: 1001, max: 2000 },
  { min: 2001, max: 3000 },
  { min: 3001, max: 5000 },
  { min: 5001, max: null },
];

function addQuantityScale(scaleGroup, values) {
  values.forEach((unitValue, idx) => {
    const tier = QUANTITY_TIERS[idx];
    priceScaleItems.push({
      scale_group: scaleGroup,
      tier_min: tier.min,
      tier_max: tier.max,
      unit_value: unitValue,
      sort_order: idx,
    });
  });
}

// Precio por unidad, de menor a mayor cantidad (100, 200, 500, 1000, 2000,
// 3000, 5000, 10000) — valores reales cacheados de "Lista de precios".
addQuantityScale("escarapelas_colaminada", [2975, 2677.5, 2356.2, 1445.85, 1207.85, 954.975, 702.1, 618.8]);
addQuantityScale("escarapelas_tinta_16mm", [3451, 3094, 2856, 2618, 2356.2, 2309.076, 2262.89448, 1545]);
addQuantityScale("manillas_full_color", [7735, 5355, 2975, 1566.04, 1309, 1071, 818.72, 714]);

async function main() {
  console.log("Borrando catálogo anterior...");
  const del1 = await supabase
    .from("logistics_rate_items")
    .delete()
    .not("id", "is", null);
  if (del1.error) throw del1.error;
  const del2 = await supabase
    .from("catalog_items")
    .delete()
    .eq("category", "servicio_personalizado");
  if (del2.error) throw del2.error;
  const del3 = await supabase.from("aforo_scales").delete().not("id", "is", null);
  if (del3.error) throw del3.error;
  const del4 = await supabase.from("price_scale_items").delete().not("id", "is", null);
  if (del4.error) throw del4.error;

  console.log(`Sembrando ${logisticsRateItems.length} rubros de logística (precios fijos)...`);
  const { error: e1 } = await supabase
    .from("logistics_rate_items")
    .insert(logisticsRateItems);
  if (e1) throw e1;

  console.log(`Sembrando ${aforoScales.length} escalas de aforo...`);
  const { error: e2 } = await supabase.from("aforo_scales").insert(aforoScales);
  if (e2) throw e2;

  console.log(`Sembrando ${servicios.length} servicios personalizados (precios fijos)...`);
  const { error: e3 } = await supabase.from("catalog_items").insert(servicios);
  if (e3) throw e3;

  console.log(`Sembrando ${priceScaleItems.length} filas de escalas de precio...`);
  const { error: e4 } = await supabase.from("price_scale_items").insert(priceScaleItems);
  if (e4) throw e4;

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
