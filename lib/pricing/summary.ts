import type { Proposal, ProposalCostItem } from "@/lib/types";
import {
  computeLogisticsBreakdown,
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
      extraCamisetasStaff: proposal.extra_camisetas_staff,
      extraLavadoChalecos: proposal.extra_lavado_chalecos,
      extraCompraAgua: proposal.extra_compra_agua,
      extraCompraBloqueadorSolar: proposal.extra_compra_bloqueador_solar,
      extraActividadCierre: proposal.extra_actividad_cierre,
    },
    logisticsRates,
    honorariosProductorScale
  );

  const subtotalServicios = serviceItems
    .filter((item) => item.included)
    .reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  const totalCosto = logistica.totalCostoLogisticaConImprevistos + subtotalServicios;
  const rentabilidad = totalCosto * Number(proposal.rentabilidad_pct);
  const valorPropuestaInicial = totalCosto + rentabilidad;
  const costoDirectorComercial = valorPropuestaInicial * Number(proposal.comision_director_pct);
  const costoAsesorComercial = valorPropuestaInicial * Number(proposal.comision_asesor_pct);
  const valorPropuestaFinal = valorPropuestaInicial + costoDirectorComercial + costoAsesorComercial;

  return {
    logistica,
    subtotalServicios,
    totalCosto,
    rentabilidad,
    valorPropuestaInicial,
    costoDirectorComercial,
    costoAsesorComercial,
    valorPropuestaFinal,
    iva: valorPropuestaFinal * IVA_RATE,
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
