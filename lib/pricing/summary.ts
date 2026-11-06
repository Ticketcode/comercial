import type { Proposal, ProposalCostItem } from "@/lib/types";
import { necesitaLogistica, noAplicaDescuento } from "@/lib/data/servicios-alcance";
import { computeEveAcompanamiento, computeEvePrecio, type EvePrecio } from "./eve";
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
  /** EVE: precio de venta directo (fee + valor por asistente). Sin rentabilidad ni comisiones. */
  eve: EvePrecio;
  /** Acompañamiento en sitio solo para EVE: costo con imprevistos (entra al total con rentabilidad y comisiones). */
  eveAcompanamiento: LogisticsBreakdown | null;
  /** Lo que el cliente paga por el acompañamiento de EVE: el costo con rentabilidad y comisiones. */
  eveAcompanamientoPrecio: number;
  /** Parte del valor final que el acuerdo comercial no descuenta (servicios tercerizados: manillas y escarapelas físicas). */
  valorNoDescontable: number;
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

  // Solo EVE: se cotiza únicamente la IA, sin logística ni servicios adicionales.
  const soloEve = proposal.solo_eve === true;
  const logisticaCobrada = soloEve ? { ...logistica, totalCostoLogisticaConImprevistos: 0 } : logistica;
  const subtotalServiciosCobrado = soloEve ? 0 : subtotalServicios;

  const eve = computeEvePrecio(proposal, logisticsRates);
  const eveAcompanamiento = computeEveAcompanamiento(proposal, logisticsRates);
  const costoAcompanamiento = eveAcompanamiento?.totalCostoLogisticaConImprevistos ?? 0;

  const totalCosto = logisticaCobrada.totalCostoLogisticaConImprevistos + subtotalServiciosCobrado + costoAcompanamiento;
  const rentabilidad = totalCosto * Number(proposal.rentabilidad_pct);
  const valorPropuestaInicial = totalCosto + rentabilidad;
  const costoDirectorComercial = valorPropuestaInicial * Number(proposal.comision_director_pct);
  const costoAsesorComercial = valorPropuestaInicial * Number(proposal.comision_asesor_pct);
  // Lo que se cobra por cada peso de costo: costo + rentabilidad + comisiones.
  const factorCosto =
    (1 + Number(proposal.rentabilidad_pct)) * (1 + Number(proposal.comision_director_pct) + Number(proposal.comision_asesor_pct));
  const valorPropuestaFinal = valorPropuestaInicial + costoDirectorComercial + costoAsesorComercial + eve.total;

  // Los servicios tercerizados (manillas y escarapelas físicas) no entran al descuento del acuerdo comercial.
  const costoNoDescontable = soloEve
    ? 0
    : serviceItems
        .filter((item) => item.included && noAplicaDescuento(item.label) && !sinCobro(item.label))
        .reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  const valorNoDescontable = costoNoDescontable * factorCosto;

  // Tasa de IVA y base gravable: por defecto se calcula igual que siempre
  // (19% sobre el valor final), pero el comercial puede fijarlas a mano
  // en el resumen del Tarifario para ese caso puntual.
  const ivaRate = proposal.iva_rate_override ?? IVA_RATE;
  const baseGravable = proposal.base_gravable_override ?? valorPropuestaFinal;

  return {
    logistica: logisticaCobrada,
    subtotalServicios: subtotalServiciosCobrado,
    totalCosto,
    rentabilidad,
    valorPropuestaInicial,
    costoDirectorComercial,
    costoAsesorComercial,
    valorPropuestaFinal,
    ivaRate,
    baseGravable,
    iva: baseGravable * ivaRate,
    eve,
    eveAcompanamiento,
    eveAcompanamientoPrecio: costoAcompanamiento * factorCosto,
    valorNoDescontable,
  };
}

/**
 * Aplica el descuento del acuerdo comercial. `valorNoDescontable` es la parte del valor que el descuento no toca
 * (servicios tercerizados: manillas y escarapelas físicas); el porcentaje se calcula sobre el resto.
 */
export function applyCommercialDiscount(
  valorPropuestaFinal: number,
  totalDiscountPct: number,
  valorNoDescontable = 0
) {
  const descontable = Math.max(valorPropuestaFinal - Math.max(valorNoDescontable, 0), 0);
  const descuento = descontable * (totalDiscountPct / 100);
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
