import type { Proposal, ProposalCostItem } from "@/lib/types";
import type { TarifarioSummary } from "@/lib/pricing/summary";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";
import type { ResumenPrecio } from "@/app/proposals/[id]/diagnostico/resumen-y-servicios";

/** Servicios con la cantidad que de verdad entra al precio (cloud y correos usan el aforo). */
export function conCantidadesCalculadas(items: ProposalCostItem[], p: Proposal): ProposalCostItem[] {
  return items.map((i) => ({ ...i, quantity: computedServiceQuantity(i.label, p) ?? i.quantity }));
}

/** Datos de la tarjeta de resumen de precio (Diagnóstico y Propuesta). */
export function armarResumen(summary: TarifarioSummary, p: Proposal): ResumenPrecio {
  return {
    logistica: summary.logistica.totalCostoLogisticaConImprevistos,
    acompanamientoEve: summary.eveAcompanamiento?.totalCostoLogisticaConImprevistos ?? 0,
    eve: summary.eve?.total ?? 0,
    servicios: summary.subtotalServicios,
    totalCosto: summary.totalCosto,
    rentabilidadPct: Number(p.rentabilidad_pct),
    rentabilidad: summary.rentabilidad,
    comisionesPct: Number(p.comision_director_pct) + Number(p.comision_asesor_pct),
    comisiones: summary.costoDirectorComercial + summary.costoAsesorComercial,
    valorFinal: summary.valorPropuestaFinal,
    iva: summary.iva,
    ivaRate: summary.ivaRate,
    total: summary.valorPropuestaFinal + summary.iva,
  };
}
