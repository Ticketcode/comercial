// Siembra catalog_items (componente_basico + logistica_360) por modalidad,
// parseando directamente "Componentes para propuesta Integral 2026.xlsx"
// (hojas Presenciales/Virtuales/Híbridos), y actualiza la descripción de
// los servicios personalizados ya sembrados (por match de nombre).
//
// Uso: node scripts/seed-componentes.mjs
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SOURCE_FILE =
  "C:/Users/Personal/Downloads/PROPUESTA COMERIAL TICKETCODE/Componentes para propuesta Integral 2026.xlsx";

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

function parseSheet(sheetName) {
  const sheet = wb.Sheets[sheetName];
  const range = xlsx.utils.decode_range(sheet["!ref"]);
  const items = [];
  let currentSection = null;
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cells = [];
    for (let col = 1; col <= 4; col++) {
      const addr = xlsx.utils.encode_cell({ r: row, c: col });
      const cell = sheet[addr];
      if (cell && typeof cell.v === "string" && cell.v.trim()) cells.push(cell.v);
      if (cell && typeof cell.v === "number") cells.push(String(cell.v));
    }
    const text = cells.join(" ||| ");
    if (!text) continue;
    if (/componentes básicos/i.test(text)) { currentSection = "componente_basico"; continue; }
    if (/servicios personalizados/i.test(text)) { currentSection = "servicio_personalizado_desc"; continue; }
    if (/logística.?-?\s*360/i.test(text)) { currentSection = "logistica_360"; continue; }
    if (/virtual\s*-\s*streaming/i.test(text)) { currentSection = "componente_basico"; continue; }
    if (/virtual\s*-\s*mundo virtual/i.test(text) || /^mundo virtual$/i.test(text)) { currentSection = "componente_basico"; continue; }
    if (/inteligencia artificial/i.test(text)) { currentSection = null; continue; } // fuera de alcance por ahora
    if (!currentSection) continue;

    const longest = [...cells].sort((a, b) => b.length - a.length)[0];
    if (!longest || longest.length < 3) continue;
    const parts = longest.split("\n").map((p) => p.trim()).filter(Boolean);
    const name = parts[0].replace(/^\d+\s*\|?\s*/, "").trim();
    const description = parts.slice(1).join("\n") || null;
    if (name.length < 3) continue;
    items.push({ section: currentSection, name, description });
  }
  return items;
}

const SHEET_TO_MODALITY = {
  Presenciales: "presencial",
  Virtuales: "virtual",
  Híbridos: "hibrido",
};

const componentRows = [];
const logisticaRows = [];
const serviceDescByName = new Map(); // name (lowercase, trimmed) -> description

for (const [sheetName, modality] of Object.entries(SHEET_TO_MODALITY)) {
  const items = parseSheet(sheetName);
  let sortOrder = 0;
  for (const item of items) {
    if (item.section === "componente_basico") {
      componentRows.push({
        modality,
        category: "componente_basico",
        name: item.name,
        description: item.description,
        unit: "incluido",
        has_price: false,
        default_unit_price: null,
        default_included: true,
        sort_order: sortOrder++,
      });
    } else if (item.section === "logistica_360") {
      logisticaRows.push({
        modality,
        category: "logistica_360",
        name: item.name,
        description: item.description,
        unit: "incluido",
        has_price: false,
        default_unit_price: null,
        default_included: true,
        sort_order: sortOrder++,
      });
    } else if (item.section === "servicio_personalizado_desc") {
      const key = item.name.toLowerCase().trim();
      if (!serviceDescByName.has(key)) serviceDescByName.set(key, item.description);
    }
  }
}

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  console.log("Borrando componente_basico / logistica_360 anteriores...");
  const del1 = await supabase.from("catalog_items").delete().eq("category", "componente_basico");
  if (del1.error) throw del1.error;
  const del2 = await supabase.from("catalog_items").delete().eq("category", "logistica_360");
  if (del2.error) throw del2.error;

  console.log(`Sembrando ${componentRows.length} componentes básicos...`);
  const { error: e1 } = await supabase.from("catalog_items").insert(componentRows);
  if (e1) throw e1;

  console.log(`Sembrando ${logisticaRows.length} ítems de Logística 360...`);
  const { error: e2 } = await supabase.from("catalog_items").insert(logisticaRows);
  if (e2) throw e2;

  console.log("Actualizando descripciones de servicios personalizados (match por nombre)...");
  const { data: services } = await supabase
    .from("catalog_items")
    .select("id, name")
    .eq("category", "servicio_personalizado");

  const descEntries = Array.from(serviceDescByName.entries()).map(([name, desc]) => ({
    norm: normalize(name),
    desc,
  }));

  let matched = 0;
  for (const svc of services ?? []) {
    const svcNorm = normalize(svc.name);
    const hit = descEntries.find(
      (d) => d.norm === svcNorm || d.norm.startsWith(svcNorm) || svcNorm.startsWith(d.norm)
    );
    if (hit && hit.desc) {
      const { error } = await supabase
        .from("catalog_items")
        .update({ description: hit.desc })
        .eq("id", svc.id);
      if (error) throw error;
      matched++;
    }
  }
  console.log(`Descripciones actualizadas: ${matched}/${services?.length ?? 0}`);
  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
