import type { Modality } from "@/lib/types";

/**
 * Motor de cálculo de Logística 360 — reconstruido y verificado contra
 * Tarifario Ticketcode 2026.xlsx (hojas "Calculo Logistica" + "Lista de
 * precios"), cuadra al peso con el caso real del PDF de referencia
 * (Presencial, Bogotá, 1 día, aforo 500 → Honorarios $1.909.840,
 * Alimentación y hotel $403.000, Transporte $120.000, Equipos $1.715.600,
 * Costos Varios $195.000).
 *
 * El comercial NO marca estos ítems uno por uno: solo llena "Datos del
 * evento" (días, aforo, ciudad, modalidad) y esto se calcula solo, con una
 * dotación de personal/equipos por defecto que casi nunca se toca.
 */

/** Tarifa que cambia según si el evento es en Bogotá o en otra ciudad. */
export interface CityRate {
  bogota: number;
  otras: number;
}

export interface LogisticsRates {
  transporteCase: CityRate; // "Transporte Case (Trayecto)"
  tiqueteAereo: number; // "Tiquete aéreo 1 destino"
  transporteAeropuertoHotel: CityRate; // "Transporte aeropuerto - hotel"
  transporteLocal: CityRate; // "Transporte Local (dentro de la ciudad)"
  transporteNacional: number; // "Transporte nacional (casa -aeropuerto-casa)"
  hospedaje: number; // "Hospedaje (Noche)"
  impresoras: number; // "Impresoras"
  alquilerPortatil: number; // "Alquiler portatil"
  papelImpresora: number; // "Papel impresora"
  honorariosLogistico: number; // "Honorarios Logístico"
  honorariosSupervisor: number; // "Honorarios Supervisor"
  arl: number; // "ARL"
  desayunoStaff: number; // "Desayuno (Staff)"
  almuerzoStaff: number; // "Almuerzo (Staff)"
  cenasStaff: number; // "Cenas (Staff)"
  refrigerioLogistica: number; // "Refrigerio (Lógistica)*2"
  almuerzoLogistica: number; // "Almuerzo (Lógistica)"
  recargas: number; // "Recargas"
}

interface RateRow {
  name: string;
  city: string | null;
  default_unit_cost: number | string;
}

/**
 * Arma LogisticsRates desde las filas crudas de logistics_rate_items.
 * Los 3 rubros con tarifa distinta por ciudad (Transporte Case, Transporte
 * aeropuerto-hotel, Transporte Local) quedan con AMBOS valores (bogota y
 * otras) — la elección de cuál usar se hace en computeLogisticsBreakdown,
 * en base a la ciudad que esté en pantalla en ese momento (reactivo, no
 * congelado con la ciudad guardada en la base de datos).
 */
export function buildLogisticsRates(rows: RateRow[]): LogisticsRates {
  function flat(name: string): number {
    const row = rows.find((r) => r.name === name && r.city === null);
    return row ? Number(row.default_unit_cost) : 0;
  }
  function cityRate(name: string): CityRate {
    const bogotaRow = rows.find((r) => r.name === name && r.city === "Bogotá");
    const otrasRow = rows.find((r) => r.name === name && r.city === null);
    return {
      bogota: bogotaRow ? Number(bogotaRow.default_unit_cost) : 0,
      otras: otrasRow ? Number(otrasRow.default_unit_cost) : 0,
    };
  }
  return {
    transporteCase: cityRate("Transporte Case (Trayecto)"),
    tiqueteAereo: flat("Tiquete aéreo 1 destino"),
    transporteAeropuertoHotel: cityRate("Transporte aeropuerto - hotel"),
    transporteLocal: cityRate("Transporte Local (dentro de la ciudad)"),
    transporteNacional: flat("Transporte nacional (casa -aeropuerto-casa)"),
    hospedaje: flat("Hospedaje (Noche)"),
    impresoras: flat("Impresoras"),
    alquilerPortatil: flat("Alquiler portatil"),
    papelImpresora: flat("Papel impresora"),
    honorariosLogistico: flat("Honorarios Logístico"),
    honorariosSupervisor: flat("Honorarios Supervisor"),
    arl: flat("ARL"),
    desayunoStaff: flat("Desayuno (Staff)"),
    almuerzoStaff: flat("Almuerzo (Staff)"),
    cenasStaff: flat("Cenas (Staff)"),
    refrigerioLogistica: flat("Refrigerio (Lógistica)*2"),
    almuerzoLogistica: flat("Almuerzo (Lógistica)"),
    recargas: flat("Recargas"),
  };
}

export interface LogisticsInput {
  dias: number;
  aforoPresencial: number;
  ciudad: string | null;
  modalidad: Modality;
  visitaPreoperativaDias: number;
  qtyLogistico: number;
  qtySupervisor: number;
  qtyLogisticaSalonesInternos: number;
  qtyProductor: number;
  qtyTransporteAeropuerto: number;
  qtyComputadores: number;
  qtyImpresoras: number;
  qtyRollosLabels: number;
  extraCamisetasStaff: boolean;
  extraLavadoChalecos: boolean;
  extraCompraAgua: boolean;
  extraCompraBloqueadorSolar: boolean;
  extraActividadCierre: boolean;
}

export interface LogisticsLineItem {
  label: string;
  quantity: number;
  rate: number;
  subtotal: number;
  /** Explica en una frase corta de qué depende la cantidad (aforo, días, ciudad...). */
  basis: string;
}

export interface LogisticsBreakdown {
  honorarios: number;
  alimentacionHotel: number;
  transporte: number;
  equipos: number;
  costosVarios: number;
  subTotalCostoLogistica: number;
  // El Excel aplica un 10% de imprevistos sobre el subtotal de logística.
  totalCostoLogisticaConImprevistos: number;
  lineItems: {
    honorarios: LogisticsLineItem[];
    alimentacionHotel: LogisticsLineItem[];
    transporte: LogisticsLineItem[];
    equipos: LogisticsLineItem[];
    costosVarios: LogisticsLineItem[];
  };
}

export interface AforoStaffingRule {
  logistico: number;
  supervisor: number;
  productor: number;
  computadores: number;
  impresoras: number;
  rollos_labels: number;
}

export interface AforoScaleRow {
  min_assistants: number;
  max_assistants: number | null;
  staffing_rules: AforoStaffingRule;
}

/**
 * Dotación de personal/equipos sugerida según el aforo — de la "Tabla de
 * Cantidades X Aforo" de la hoja "Calculo Logistica". Es el punto de
 * partida; el comercial puede seguir editándolo a mano por evento.
 */
export function staffingForAforo(
  aforo: number,
  scales: AforoScaleRow[]
): AforoStaffingRule | null {
  const sorted = [...scales].sort((a, b) => a.min_assistants - b.min_assistants);
  const match = sorted.find(
    (s) => aforo >= s.min_assistants && (s.max_assistants === null || aforo <= s.max_assistants)
  );
  if (match) return match.staffing_rules;
  // Aforo menor al tramo más bajo (ej. eventos muy pequeños) -> usa el
  // tramo mínimo; por encima del techo -> usa el más alto.
  return sorted[0]?.staffing_rules ?? sorted.at(-1)?.staffing_rules ?? null;
}

/**
 * Logísticos necesarios para UN salón interno, según SU PROPIO aforo (no
 * un logístico fijo por salón — cada salón puede tener un aforo distinto).
 */
export function logisticosPorSalon(aforo: number): number {
  if (aforo <= 100) return 1;
  if (aforo <= 400) return 2;
  if (aforo <= 800) return 3;
  return 4;
}

/** Total de logísticos para "Logística salones internos" — suma la
 * dotación de cada salón según su propio aforo. */
export function totalLogisticosSalones(aforos: number[]): number {
  return aforos.reduce((sum, aforo) => sum + logisticosPorSalon(aforo), 0);
}

const IMPREVISTOS_FACTOR = 1.1;

/** Normaliza para comparar ciudades sin importar tildes/mayúsculas
 * ("Bogotá", "bogota", "BOGOTÁ D.C." → todas reconocidas). */
export function esBogota(ciudad: string | null) {
  const normalizado = (ciudad ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  return normalizado.startsWith("bogota");
}

function esVirtual(modalidad: Modality) {
  return modalidad === "virtual";
}

export interface QuantityTier {
  tier_min: number;
  tier_max: number | null;
  unit_value: number;
}

/**
 * Busca el tramo cuyo rango [tier_min, tier_max] contiene `qty`. Si `qty`
 * está por DEBAJO del tramo más bajo (ej. aforo todavía en 0, evento sin
 * configurar) devuelve 0 en vez del tramo más alto — antes caía al último
 * tramo ordenado, mostrando honorarios de aforo grande para un evento
 * vacío. Si `qty` supera el tramo más alto, sí se usa ese tramo (tope).
 */
export function findTier(tiers: QuantityTier[], qty: number): number {
  const sorted = [...tiers].sort((a, b) => a.tier_min - b.tier_min);
  if (sorted.length === 0) return 0;
  const match = sorted.find(
    (t) => qty >= t.tier_min && (t.tier_max === null || qty <= t.tier_max)
  );
  if (match) return Number(match.unit_value);
  if (qty < sorted[0].tier_min) return 0;
  return Number(sorted.at(-1)!.unit_value);
}

export function computeLogisticsBreakdown(
  input: LogisticsInput,
  rates: LogisticsRates,
  honorariosProductorScale: QuantityTier[]
): LogisticsBreakdown {
  const {
    dias,
    aforoPresencial,
    ciudad,
    modalidad,
    visitaPreoperativaDias,
    qtyLogistico,
    qtySupervisor,
    qtyLogisticaSalonesInternos,
    qtyProductor,
    qtyComputadores,
    qtyImpresoras,
    qtyRollosLabels,
  } = input;

  const virtual = esVirtual(modalidad);
  const bogota = esBogota(ciudad);
  const pick = (r: CityRate) => (bogota ? r.bogota : r.otras);

  const qtyStaffApoyo = qtySupervisor + qtyLogisticaSalonesInternos + qtyProductor;
  const qtyArl = qtyLogistico + qtyStaffApoyo;
  const qtyAlmuerzoLogistica = bogota ? qtyArl : qtyLogistico;
  const qtyTransporteCase = dias === 0 ? 0 : 2;

  // Staff que viaja (necesita tiquete/hotel) — los logísticos se contratan
  // localmente en la ciudad del evento y no viajan.
  const qtyStaffViaja = qtySupervisor + qtyProductor;
  // Días "en tierra" en la ciudad del evento: día(s) antes de llegada +
  // los días del evento — se cuenta desde el día 1 de llegada.
  const diasEnTierra = visitaPreoperativaDias + dias;

  const diasPersonal = dias + visitaPreoperativaDias;
  const ciudadLabel = bogota ? "Bogotá — no aplica" : "fuera de Bogotá";

  // 1) Honorarios
  const honorariosLogistico = virtual ? 0 : qtyLogistico * dias * rates.honorariosLogistico;
  const honorariosSupervisor = virtual
    ? 0
    : qtySupervisor * diasPersonal * rates.honorariosSupervisor;
  const honorariosSalonesInternos = virtual
    ? 0
    : qtyLogisticaSalonesInternos * dias * rates.honorariosLogistico;
  const honorariosProductor = qtyProductor > 0 ? findTier(honorariosProductorScale, aforoPresencial) : 0;
  const arl = virtual ? 0 : qtyArl * dias * rates.arl;
  const honorarios =
    honorariosLogistico + honorariosSupervisor + honorariosSalonesInternos + honorariosProductor + arl;

  const honorariosItems: LogisticsLineItem[] = [
    { label: "Logístico", quantity: qtyLogistico, rate: rates.honorariosLogistico, subtotal: honorariosLogistico, basis: `${qtyLogistico} logísticos × ${dias} día(s)` },
    { label: "Supervisor", quantity: qtySupervisor, rate: rates.honorariosSupervisor, subtotal: honorariosSupervisor, basis: `${qtySupervisor} supervisores × ${diasPersonal} día(s) (incl. preoperativa)` },
    { label: "Logística salones internos", quantity: qtyLogisticaSalonesInternos, rate: rates.honorariosLogistico, subtotal: honorariosSalonesInternos, basis: `${qtyLogisticaSalonesInternos} × ${dias} día(s)` },
    { label: "Productor (según aforo)", quantity: qtyProductor > 0 ? 1 : 0, rate: honorariosProductor, subtotal: honorariosProductor, basis: qtyProductor > 0 ? `Aforo ${aforoPresencial} → tarifa fija por escala` : "Sin productor asignado (cantidad en 0)" },
    { label: "ARL", quantity: qtyArl, rate: rates.arl, subtotal: arl, basis: `${qtyArl} personas (logístico+staff apoyo) × ${dias} día(s)` },
  ];

  // 2) Alimentación y hotel — solo para el staff que viaja (Supervisor +
  // Productor). El día antes de llegada se liquidan los 3 tiempos de
  // comida; los días del evento solo desayuno y cena (el almuerzo de esos
  // días ya va en "Almuerzo Logística", que cubre a todo el equipo).
  const desayunoStaff = bogota ? 0 : diasEnTierra * qtyStaffViaja * rates.desayunoStaff;
  const almuerzoDiaAntes = bogota
    ? 0
    : visitaPreoperativaDias * qtyStaffViaja * rates.almuerzoStaff;
  const cenaStaff = bogota ? 0 : diasEnTierra * qtyStaffViaja * rates.cenasStaff;
  const almuerzoLogistica = virtual ? 0 : qtyAlmuerzoLogistica * rates.almuerzoLogistica * dias;
  // Refrigerio AM+PM: el día antes solo para el staff que viaja; los días
  // del evento para todo el equipo (logísticos + staff).
  const refrigerioDiaAntes = virtual
    ? 0
    : 2 * visitaPreoperativaDias * qtyStaffViaja * rates.refrigerioLogistica;
  const refrigerioDiasEvento = virtual ? 0 : 2 * dias * qtyArl * rates.refrigerioLogistica;
  const hotel = bogota ? 0 : qtyStaffViaja * diasEnTierra * rates.hospedaje;
  const alimentacionHotel =
    desayunoStaff +
    almuerzoDiaAntes +
    cenaStaff +
    almuerzoLogistica +
    refrigerioDiaAntes +
    refrigerioDiasEvento +
    hotel;

  const alimentacionItems: LogisticsLineItem[] = [
    { label: "Desayuno (Staff que viaja)", quantity: bogota ? 0 : qtyStaffViaja, rate: rates.desayunoStaff, subtotal: desayunoStaff, basis: `${qtyStaffViaja} × ${diasEnTierra} día(s) en tierra — solo fuera de Bogotá (hoy: ${ciudadLabel})` },
    { label: "Almuerzo (día antes, staff que viaja)", quantity: bogota ? 0 : qtyStaffViaja, rate: rates.almuerzoStaff, subtotal: almuerzoDiaAntes, basis: `${qtyStaffViaja} × ${visitaPreoperativaDias} día(s) antes — solo fuera de Bogotá (hoy: ${ciudadLabel})` },
    { label: "Cena (Staff que viaja)", quantity: bogota ? 0 : qtyStaffViaja, rate: rates.cenasStaff, subtotal: cenaStaff, basis: `${qtyStaffViaja} × ${diasEnTierra} día(s) en tierra — solo fuera de Bogotá (hoy: ${ciudadLabel})` },
    { label: "Almuerzo (Logística — días del evento, todo el equipo)", quantity: qtyAlmuerzoLogistica, rate: rates.almuerzoLogistica, subtotal: almuerzoLogistica, basis: `${qtyAlmuerzoLogistica} × ${dias} día(s) de evento` },
    { label: "Refrigerio AM+PM (día antes, staff que viaja)", quantity: bogota ? 0 : qtyStaffViaja * 2, rate: rates.refrigerioLogistica, subtotal: refrigerioDiaAntes, basis: `${qtyStaffViaja} × ${visitaPreoperativaDias} día(s) antes × 2 (AM+PM)` },
    { label: "Refrigerio AM+PM (días evento, todo el equipo)", quantity: qtyArl * 2, rate: rates.refrigerioLogistica, subtotal: refrigerioDiasEvento, basis: `${qtyArl} × ${dias} día(s) × 2 (AM+PM)` },
    { label: "Hotel (noches, staff que viaja)", quantity: bogota ? 0 : qtyStaffViaja, rate: rates.hospedaje, subtotal: hotel, basis: `${qtyStaffViaja} × ${diasEnTierra} noche(s) — solo fuera de Bogotá (hoy: ${ciudadLabel})` },
  ];

  // 3) Transporte — para el staff que viaja: vuelo ida/regreso, transporte
  // en la ciudad de origen, y el transporte interno diario en el destino
  // (contado desde el día 1 de llegada: día 1 = aeropuerto→hotel +
  // hotel→evento + evento→hotel; días siguientes = hotel→evento +
  // evento→hotel).
  const tiquetesAereos = bogota ? 0 : qtyStaffViaja * rates.tiqueteAereo * 2;
  const transportesCiudadOrigen = bogota ? 0 : qtyStaffViaja * rates.transporteNacional;
  const transporteAeropuertoHotelDia1 = bogota || diasEnTierra === 0
    ? 0
    : qtyStaffViaja * pick(rates.transporteAeropuertoHotel);
  const diasSiguientes = Math.max(diasEnTierra - 1, 0);
  const legsDia1 = diasEnTierra === 0 ? 0 : 2; // hotel→evento + evento→hotel del día 1
  const legsDiasSiguientes = diasSiguientes * 2;
  // Fuera de Bogotá: transporte local del staff que viaja, día 1 +
  // siguientes (ver arriba). En Bogotá no hay viaje/hotel — el transporte
  // es solo para el Productor, pero SIEMPRE cuenta el día antes del evento
  // (visita preoperativa) además de los días del evento — la ciudad solo
  // cambia la tarifa (pick), no si esos días se cuentan.
  const diasTransporteProductorBogota = dias + visitaPreoperativaDias;
  const transporteLocalDestino = virtual || bogota
    ? 0
    : qtyStaffViaja * (legsDia1 + legsDiasSiguientes) * pick(rates.transporteLocal);
  const transporteLocalBogota =
    virtual || !bogota
      ? 0
      : qtyProductor * diasTransporteProductorBogota * 2 * pick(rates.transporteLocal);
  const transporteCase = virtual ? 0 : pick(rates.transporteCase) * qtyTransporteCase;
  const transporte =
    tiquetesAereos +
    transportesCiudadOrigen +
    transporteAeropuertoHotelDia1 +
    transporteLocalDestino +
    transporteLocalBogota +
    transporteCase;

  const transporteItems: LogisticsLineItem[] = [
    { label: "Tiquetes aéreos (ida y regreso)", quantity: bogota ? 0 : qtyStaffViaja, rate: rates.tiqueteAereo * 2, subtotal: tiquetesAereos, basis: `${qtyStaffViaja} personas — solo fuera de Bogotá (hoy: ${ciudadLabel})` },
    { label: "Transporte nacional (casa-aeropuerto-casa, origen)", quantity: bogota ? 0 : qtyStaffViaja, rate: rates.transporteNacional, subtotal: transportesCiudadOrigen, basis: `${qtyStaffViaja} personas — solo fuera de Bogotá (hoy: ${ciudadLabel})` },
    { label: "Transporte aeropuerto → hotel (día 1 de llegada)", quantity: bogota ? 0 : qtyStaffViaja, rate: pick(rates.transporteAeropuertoHotel), subtotal: transporteAeropuertoHotelDia1, basis: `${qtyStaffViaja} personas, 1 vez` },
    { label: "Transporte local hotel↔evento (todos los días en tierra)", quantity: bogota ? 0 : qtyStaffViaja * (legsDia1 + legsDiasSiguientes), rate: pick(rates.transporteLocal), subtotal: transporteLocalDestino, basis: `Solo fuera de Bogotá — ${qtyStaffViaja} personas × (2 tramos día 1 + 2 tramos × ${diasSiguientes} día(s) siguientes)` },
    { label: "Transporte local del Productor (Bogotá)", quantity: bogota ? qtyProductor * diasTransporteProductorBogota * 2 : 0, rate: pick(rates.transporteLocal), subtotal: transporteLocalBogota, basis: `Solo en Bogotá — ${qtyProductor} productor(es) × ${diasTransporteProductorBogota} día(s) (día antes + evento) × 2` },
    { label: "Transporte del case (equipos)", quantity: qtyTransporteCase, rate: pick(rates.transporteCase), subtotal: transporteCase, basis: `Fijo por evento presencial/híbrido` },
  ];

  // 4) Equipos
  const computadores = virtual ? 0 : qtyComputadores * rates.alquilerPortatil;
  const impresoras = virtual ? 0 : qtyImpresoras * rates.impresoras;
  const rollosLabels = virtual ? 0 : qtyRollosLabels * rates.papelImpresora;
  const equipos = computadores + impresoras + rollosLabels;

  const equiposItems: LogisticsLineItem[] = [
    { label: "Computadores (alquiler portátil)", quantity: qtyComputadores, rate: rates.alquilerPortatil, subtotal: computadores, basis: `Según escala de aforo (editable)` },
    { label: "Impresoras", quantity: qtyImpresoras, rate: rates.impresoras, subtotal: impresoras, basis: `Según escala de aforo (editable)` },
    { label: "Rollos / Labels (papel impresora)", quantity: qtyRollosLabels, rate: rates.papelImpresora, subtotal: rollosLabels, basis: `Según escala de aforo (editable)` },
  ];

  // 5) Costos varios
  const recargaDatos = virtual ? 0 : qtyArl * rates.recargas;
  const extras =
    (input.extraCamisetasStaff ? 150000 : 0) +
    (input.extraLavadoChalecos ? 48000 : 0) +
    (input.extraCompraAgua ? 50000 : 0) +
    (input.extraCompraBloqueadorSolar ? 50000 : 0) +
    (input.extraActividadCierre ? 350000 : 0);
  const costosVarios = recargaDatos + extras;

  const costosVariosItems: LogisticsLineItem[] = [
    { label: "Recarga de datos smartphones", quantity: qtyArl, rate: rates.recargas, subtotal: recargaDatos, basis: `${qtyArl} personas` },
    ...(input.extraCamisetasStaff ? [{ label: "Camisetas para Staff", quantity: 1, rate: 150000, subtotal: 150000, basis: "Extra activado" }] : []),
    ...(input.extraLavadoChalecos ? [{ label: "Lavado de chalecos", quantity: 1, rate: 48000, subtotal: 48000, basis: "Extra activado" }] : []),
    ...(input.extraCompraAgua ? [{ label: "Compra de agua", quantity: 1, rate: 50000, subtotal: 50000, basis: "Extra activado" }] : []),
    ...(input.extraCompraBloqueadorSolar ? [{ label: "Compra de bloqueador solar", quantity: 1, rate: 50000, subtotal: 50000, basis: "Extra activado" }] : []),
    ...(input.extraActividadCierre ? [{ label: "Actividad de cierre", quantity: 1, rate: 350000, subtotal: 350000, basis: "Extra activado" }] : []),
  ];

  const subTotalCostoLogistica = honorarios + alimentacionHotel + transporte + equipos + costosVarios;

  return {
    honorarios,
    alimentacionHotel,
    transporte,
    equipos,
    costosVarios,
    subTotalCostoLogistica,
    totalCostoLogisticaConImprevistos: subTotalCostoLogistica * IMPREVISTOS_FACTOR,
    lineItems: {
      honorarios: honorariosItems,
      alimentacionHotel: alimentacionItems,
      transporte: transporteItems,
      equipos: equiposItems,
      costosVarios: costosVariosItems,
    },
  };
}
