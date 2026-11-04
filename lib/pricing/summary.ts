import type { Proposal, ProposalCostItem } from "@/lib/types";
import { necesitaLogistica } from "@/lib/data/servicios-alcance";
import {
  computeLogisticsBreakdown,
  PREACREDITACION_SERVICE_LABEL,
  type LogisticsBreakdown,
  type LogisticsRates,
  type QuantityTier,
} from "./logistics";

export const IVA_RATE = 0.19;

export interface TarifarioSummary {
  logistica: LogisticsBreakdown;
  subtotalServicios: number;
  totalCosto: number;
  rentabilidad: number;
  valorPropuestaInicial: number;
  costoDirectorComercial: number;
  costoAsesorComercial: number;
  valorPropuestaFinal: number;
  iva: number;
  ivaRate: number;
  baseGravable: number;
}

/**
 * Motor de cálculo del Tarifario — verificado contra
 * Tarifario Ticketcode 2026.xlsx:
 *
 *   Total Costo Logística (con 10% imprevistos) + Subtotal Servicios
 *   Personalizados = Total costo
 *   Valor Propuesta Inicial = Total costo × (1 + rentabilidad%)
 *   Costo Director Comercial = Valor Propuesta Inicial × comisión director%
 *   Costo Asesor Comercial   = Valor Propuesta Inicial × comisión asesor%
 *   Valor Propuesta Final = Valor Propuesta Inicial + ambas comisiones
 */
export function computeTarifarioSummary(
  proposal: Proposal,
  logisticsRates: LogisticsRates,
  serviceItems: ProposalCostItem[],
  honorariosProductorScale: QuantityTier[]
): TarifarioSummary {
  // Los días de pre-acreditación salen de la cantidad del servicio "Pre
  // acreditación" cuando está incluido — así todos los pasos (Tarifario,
  // Propuesta, Presentación, Contrato) calculan lo mismo.
  const preacreditacion = serviceItems.find(
    (item) => item.label === PREACREDITACION_SERVICE_LABEL && item.included
  );
  const logistica = computeLogisticsBreakdown(
    {
      dias: Number(proposal.dias),
      aforoPresencial: Number(proposal.aforo ?? 0),
      ciudad: proposal.city,
      modalidad: proposal.modality,
      visitaPreoperativaDias: Number(proposal.visita_preoperativa_dias),
      qtyLogistico: Number(proposal.qty_logistico),
      qtySupervisor: Number(proposal.qty_supervisor),
      qtyLogisticaSalonesInternos: Number(proposal.qty_logistica_salones_internos),
      qtyProductor: Number(proposal.qty_productor),
      qtyTransporteAeropuerto: Number(proposal.qty_transporte_aeropuerto),
      qtyComputadores: Number(proposal.qty_computadores),
      qtyImpresoras: Number(proposal.qty_impresoras),
      qtyRollosLabels: Number(proposal.qty_rollos_labels),
      preacreditacionDias: preacreditacion ? Number(preacreditacion.quantity) : 0,
      preacreditacionMedioDia: proposal.preacreditacion_medio_dia,
      sinLogistica: proposal.con_logistica === false,
      extraCamisetasStaff: proposal.extra_camisetas_staff,
      extraLavadoChalecos: proposal.extra_lavado_chalecos,
      extraCompraAgua: proposal.extra_compra_agua,
      extraCompraBloqueadorSolar: proposal.extra_compra_bloqueador_solar,
      extraActividadCierre: proposal.extra_actividad_cierre,
      overrides: proposal.logistics_overrides ?? undefined,
    },
    logisticsRates,
    honorariosProductorScale
  );

  // Sin logística de Ticketcode, los servicios de logística (pre-acreditación, credenciales, etc.) siguen en la propuesta
  // con sus cantidades para que el organizador sepa qué debe poner, pero no se cobran. La capacitación al staff sí.
  const sinCobro = (label: string) => proposal.con_logistica === false && necesitaLogistica(label);
  const subtotalServicios = serviceItems
    .filter((item) => item.included)
    .reduce((sum, item) => sum + (sinCobro(item.label) ? 0 : item.quantity * item.unit_cost), 0);

  const totalCosto = logistica.totalCostoLogisticaConImprevistos + subtotalServicios;
  const rentabilidad = totalCosto * Number(proposal.rentabilidad_pct);
  const valorPropuestaInicial = totalCosto + rentabilidad;
  const costoDirectorComercial = valorPropuestaInicial * Number(proposal.comision_director_pct);
  const costoAsesorComercial = valorPropuestaInicial * Number(proposal.comision_asesor_pct);
  const valorPropuestaFinal = valorPropuestaInicial + costoDirectorComercial + costoAsesorComercial;

  // Tasa de IVA y base gravable: por defecto se calcula igual que siempre
  // (19% sobre el valor final), pero el comercial puede fijarlas a mano
  // en el resumen del Tarifario para ese caso puntual.
  const ivaRate = proposal.iva_rate_override ?? IVA_RATE;
  const baseGravable = proposal.base_gravable_override ?? valorPropuestaFinal;

  return {
    logistica,
    subtotalServicios,
    totalCosto,
    rentabilidad,
    valorPropuestaInicial,
    costoDirectorComercial,
    costoAsesorComercial,
    valorPropuestaFinal,
    ivaRate,
    baseGravable,
    iva: baseGravable * ivaRate,
  };
}

export function applyCommercialDiscount(
  valorPropuestaFinal: number,
  totalDiscountPct: number
) {
  const descuento = valorPropuestaFinal * (totalDiscountPct / 100);
  const valorConDescuento = valorPropuestaFinal - descuento;
  return {
    descuento,
    valorConDescuento,
    ivaFinal: valorConDescuento * IVA_RATE,
  };
}

export function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
