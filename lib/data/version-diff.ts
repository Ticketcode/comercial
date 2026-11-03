import type { Proposal } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import type { DeckData } from "@/app/proposals/[id]/presentacion/deck-shell";
import { versionTotals } from "./deck-data";

const MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrido: "Híbrido",
  mundo_virtual: "Mundo virtual",
};

/** Campos de la propuesta que se comparan entre versiones, con su nombre para mostrar. */
const FIELDS: [keyof Proposal, string][] = [
  ["modality", "Modalidad"],
  ["aforo", "Aforo"],
  ["aforo_virtual", "Aforo virtual"],
  ["dias", "Días del evento"],
  ["city", "Ciudad"],
  ["lugar", "Lugar"],
  ["event_start_date", "Inicio del evento"],
  ["event_end_date", "Fin del evento"],
  ["qty_logistico", "Logísticos"],
  ["qty_supervisor", "Supervisores"],
  ["qty_productor", "Productores"],
  ["qty_computadores", "Computadores"],
  ["qty_impresoras", "Impresoras"],
  ["visita_preoperativa_dias", "Días de visita preoperativa"],
  ["preacreditacion_medio_dia", "Pre-acreditación de medio día"],
  ["rentabilidad_pct", "Rentabilidad"],
  ["acuerdo_comercial_pct_global", "Descuento por acuerdo comercial (%)"],
];

function show(key: keyof Proposal, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (key === "modality") return MODALIDAD[String(value)] ?? String(value);
  if (key === "rentabilidad_pct") return `${Math.round(Number(value) * 100)}%`;
  return String(value);
}

function selectedNames(data: DeckData, category: string): string[] {
  const selected = new Map(data.catalogSelections.map((s) => [s.catalog_item_id, s]));
  return data.catalogItems
    .filter((c) => c.category === category && selected.get(c.id)?.included)
    .map((c) => selected.get(c.id)?.custom_name || c.name);
}

function listChanges(label: string, before: string[], after: string[]): string[] {
  const out: string[] = [];
  const b = new Set(before);
  const a = new Set(after);
  const added = after.filter((x) => !b.has(x));
  const removed = before.filter((x) => !a.has(x));
  if (added.length) out.push(`${label}: se agregó ${added.join(", ")}`);
  if (removed.length) out.push(`${label}: se quitó ${removed.join(", ")}`);
  return out;
}

/**
 * Qué cambió entre dos fotos de una propuesta (la anterior y la nueva), en
 * frases cortas para mostrar. No compara textos libres de las láminas.
 */
export function diffDeckData(before: DeckData, after: DeckData): string[] {
  const out: string[] = [];

  const tb = versionTotals(before);
  const ta = versionTotals(after);
  if (Math.round(tb.antesIva) !== Math.round(ta.antesIva)) {
    const d = ta.antesIva - tb.antesIva;
    out.push(
      `Valor antes de IVA: ${formatCOP(tb.antesIva)} → ${formatCOP(ta.antesIva)} (${d > 0 ? "+" : "−"} ${formatCOP(Math.abs(d))})`
    );
  }

  for (const [key, label] of FIELDS) {
    const x = before.proposal[key];
    const y = after.proposal[key];
    if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null)) out.push(`${label}: ${show(key, x)} → ${show(key, y)}`);
  }

  out.push(...listChanges("Servicios personalizados", before.includedServices.map((s) => s.name), after.includedServices.map((s) => s.name)));
  out.push(...listChanges("Componentes básicos", selectedNames(before, "componente_basico"), selectedNames(after, "componente_basico")));
  out.push(...listChanges("Logística 360", selectedNames(before, "logistica_360"), selectedNames(after, "logistica_360")));
  out.push(
    ...listChanges(
      "Acuerdo comercial",
      before.agreementItems.filter((a) => a.included).map((a) => `${a.label} ${a.pct}%`),
      after.agreementItems.filter((a) => a.included).map((a) => `${a.label} ${a.pct}%`)
    )
  );
  out.push(
    ...listChanges(
      "Modelo de pagos",
      before.paymentMilestones.map((m) => `${m.label} ${m.pct}%`),
      after.paymentMilestones.map((m) => `${m.label} ${m.pct}%`)
    )
  );
  out.push(...listChanges("Cronograma", before.scheduleItems.map((s) => `${s.week_number}: ${s.hito}`), after.scheduleItems.map((s) => `${s.week_number}: ${s.hito}`)));
  out.push(...listChanges("Requerimientos operativos", before.operationalRequirements.map((r) => r.text), after.operationalRequirements.map((r) => r.text)));
  out.push(...listChanges("Informes y entregables", before.informes, after.informes));

  return out;
}
