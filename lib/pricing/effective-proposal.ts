import type { Proposal, ProposalCostItem } from "@/lib/types";
import { totalLogisticosSalones } from "./logistics";

const SALONES_INTERNOS_SERVICE_LABEL =
  "Módulo para obtención de datos en diferentes sitios simultáneos";
const PREACREDITACION_SERVICE_LABEL = "Pre acreditación";

/**
 * Dos campos de Logística 360 dependen de servicios personalizados en vez
 * de guardarse directo en `proposals` (para no pedir el dato dos veces):
 * "Pre acreditación" suma días operativos extra, y "Módulo ... sitios
 * simultáneos" define los logísticos de salones internos según el aforo de
 * cada salón (`salones_internos_aforos`). Esta función centraliza el mismo
 * ajuste que ya hace tarifario-editor.tsx antes de calcular el resumen, para
 * que Producción (y cualquier otro consumidor) parta de los mismos números
 * finales que el comercial vio y guardó.
 */
export function effectiveProposal(proposal: Proposal, serviceItems: ProposalCostItem[]): Proposal {
  const preacreditacionItem = serviceItems.find((i) => i.label === PREACREDITACION_SERVICE_LABEL);
  const preacreditacionDias =
    preacreditacionItem && preacreditacionItem.included ? Number(preacreditacionItem.quantity) : 0;

  return {
    ...proposal,
    dias: Number(proposal.dias) + preacreditacionDias,
    qty_logistica_salones_internos: totalLogisticosSalones(proposal.salones_internos_aforos ?? []),
  };
}

export { SALONES_INTERNOS_SERVICE_LABEL, PREACREDITACION_SERVICE_LABEL };
