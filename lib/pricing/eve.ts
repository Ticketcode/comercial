import type { Proposal } from "@/lib/types";
import { computeLogisticsBreakdown, type LogisticsBreakdown, type LogisticsRates } from "./logistics";

/**
 * EVE, la IA de eventos. Su precio es de venta directo (no lleva rentabilidad ni comisiones encima):
 *   fee fijo por evento + valor por asistente × aforo total (presencial + virtual).
 *   El valor por asistente baja con el aforo (escala); todo vive en logistics_rate_items (categoría "eve"), editable como las demás tarifas.
 */
/** Rubro del acompañamiento que no aplica a EVE (el case de equipos). */
const CASE_LABEL = "Transporte del case (equipos)";

export interface EvePrecio {
  asistentes: number;
  fee: number;
  porAsistente: number;
  valorAsistentes: number;
  total: number;
}

/** Aforo total del evento sobre el que se cobra EVE. */
export function eveAsistentes(p: Pick<Proposal, "aforo" | "aforo_virtual">): number {
  return Math.max(Number(p.aforo ?? 0), 0) + Math.max(Number(p.aforo_virtual ?? 0), 0);
}

/** Valor por asistente según el aforo total: el primer tramo "hasta N" que lo cubra; sin escala, la tarifa plana. */
export function valorPorAsistente(asistentes: number, rates: LogisticsRates): number {
  const escala = rates.eveEscala ?? [];
  if (escala.length === 0) return rates.evePorAsistente;
  const tramo = escala.find((t) => t.hasta !== null && asistentes <= t.hasta) ?? escala.find((t) => t.hasta === null) ?? escala[escala.length - 1];
  return tramo.valor;
}

export function computeEvePrecio(p: Pick<Proposal, "aforo" | "aforo_virtual" | "con_eve">, rates: LogisticsRates): EvePrecio {
  const asistentes = eveAsistentes(p);
  const activo = p.con_eve === true;
  const fee = activo ? rates.eveFee : 0;
  const porAsistente = valorPorAsistente(asistentes, rates);
  const valorAsistentes = activo ? asistentes * porAsistente : 0;
  return { asistentes, fee, porAsistente, valorAsistentes, total: fee + valorAsistentes };
}

/**
 * Acompañamiento en sitio solo para EVE: el equipo viaja y opera como en la logística (honorarios, ARL, alimentación,
 * hotel, tiquetes y transporte según ciudad, días y visita preoperativa), sin logísticos, equipos ni case.
 * Es un costo: entra al total con imprevistos, rentabilidad y comisiones como la logística.
 */
export function computeEveAcompanamiento(
  p: Proposal,
  rates: LogisticsRates
): LogisticsBreakdown | null {
  if (p.con_eve !== true || p.eve_acompanamiento !== true) return null;
  // Sin presencia en sitio (virtual o mundo virtual) no hay viaje ni equipo que acompañe.
  if (p.modality === "virtual" || p.modality === "mundo_virtual") return null;
  return computeLogisticsBreakdown(
    {
      dias: Number(p.dias),
      aforoPresencial: Number(p.aforo ?? 0),
      ciudad: p.city,
      modalidad: p.modality,
      visitaPreoperativaDias: Number(p.visita_preoperativa_dias),
      qtyLogistico: 0,
      qtySupervisor: Math.max(Number(p.eve_qty_equipo ?? 0), 0),
      qtyLogisticaSalonesInternos: 0,
      qtyProductor: 0,
      qtyTransporteAeropuerto: 0,
      qtyComputadores: 0,
      qtyImpresoras: 0,
      qtyRollosLabels: 0,
      extraCamisetasStaff: false,
      extraLavadoChalecos: false,
      extraCompraAgua: false,
      extraCompraBloqueadorSolar: false,
      extraActividadCierre: false,
      overrides: { [CASE_LABEL]: { quantity: 0 } },
    },
    rates,
    []
  );
}
