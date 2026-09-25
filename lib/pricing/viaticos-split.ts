import type { LogisticsBreakdown, LogisticsLineItem } from "./logistics";

/**
 * Dentro de Transporte y Alimentación/hotel, algunas líneas son GASTO
 * PERSONAL de cada persona que viaja (Supervisor, Productor — los
 * logísticos se contratan localmente y no viajan): su propio transporte
 * origen↔aeropuerto y sus propias comidas antes/después del evento. Se
 * giran a CADA persona por separado (confirmado con la liquidación real de
 * un Supervisor: trae su propio transporte/alimentación/varios, SIN
 * honorarios).
 *
 * El resto (comida del equipo durante el evento, transporte del case,
 * transporte local compartido, honorarios de todos, varios) se gira en
 * bloque al Productor, quien lo administra y luego lo legaliza.
 */
const PERSONAL_TRANSPORTE_LABELS = new Set([
  "Tiquetes aéreos (ida y regreso)",
  "Transporte nacional (casa-aeropuerto-casa, origen)",
  "Transporte aeropuerto → hotel (día 1 de llegada)",
]);

const PERSONAL_ALIMENTACION_LABELS = new Set([
  "Desayuno (Staff que viaja)",
  "Almuerzo (día antes, staff que viaja)",
  "Cena (Staff que viaja)",
  "Refrigerio AM+PM (día antes, staff que viaja)",
  "Hotel (noches, staff que viaja)",
]);

const HONORARIOS_PRODUCTOR_LABEL = "Productor (según aforo)";

function splitBy(items: LogisticsLineItem[], personalLabels: Set<string>) {
  const personal = items.filter((i) => personalLabels.has(i.label));
  const equipo = items.filter((i) => !personalLabels.has(i.label));
  return {
    personal,
    equipo,
    personalTotal: personal.reduce((s, i) => s + i.subtotal, 0),
    equipoTotal: equipo.reduce((s, i) => s + i.subtotal, 0),
  };
}

export interface ViaticosSplit {
  /** Anticipo de equipo — se gira al Productor. */
  productor: {
    total: number;
    transporte: { total: number; items: LogisticsLineItem[] };
    alimentacion: { total: number; items: LogisticsLineItem[] };
    honorarios: { total: number; items: LogisticsLineItem[] };
    varios: { total: number; items: LogisticsLineItem[] };
  };
  /** Viático individual — se gira a CADA persona que viaja (Supervisor,
   * Productor), dividido en partes iguales (la tarifa no distingue rol). */
  individual: {
    porPersonaTotal: number;
    qtyPersonasQueViajan: number;
    transporte: { total: number; items: LogisticsLineItem[] };
    alimentacion: { total: number; items: LogisticsLineItem[] };
  };
}

export function splitViaticos(
  breakdown: LogisticsBreakdown,
  qtyStaffViaja: number
): ViaticosSplit {
  const transporteSplit = splitBy(breakdown.lineItems.transporte, PERSONAL_TRANSPORTE_LABELS);
  const alimentacionSplit = splitBy(breakdown.lineItems.alimentacionHotel, PERSONAL_ALIMENTACION_LABELS);

  const honorariosEquipo = breakdown.lineItems.honorarios.filter(
    (i) => i.label !== HONORARIOS_PRODUCTOR_LABEL
  );
  const honorariosEquipoTotal = honorariosEquipo.reduce((s, i) => s + i.subtotal, 0);

  const personalTotalCombinado = transporteSplit.personalTotal + alimentacionSplit.personalTotal;
  const porPersonaTotal = qtyStaffViaja > 0 ? personalTotalCombinado / qtyStaffViaja : 0;

  const productorTotal =
    transporteSplit.equipoTotal + alimentacionSplit.equipoTotal + honorariosEquipoTotal + breakdown.costosVarios;

  return {
    productor: {
      total: productorTotal,
      transporte: { total: transporteSplit.equipoTotal, items: transporteSplit.equipo },
      alimentacion: { total: alimentacionSplit.equipoTotal, items: alimentacionSplit.equipo },
      honorarios: { total: honorariosEquipoTotal, items: honorariosEquipo },
      varios: { total: breakdown.costosVarios, items: breakdown.lineItems.costosVarios },
    },
    individual: {
      porPersonaTotal,
      qtyPersonasQueViajan: qtyStaffViaja,
      transporte: { total: transporteSplit.personalTotal, items: transporteSplit.personal },
      alimentacion: { total: alimentacionSplit.personalTotal, items: alimentacionSplit.personal },
    },
  };
}
