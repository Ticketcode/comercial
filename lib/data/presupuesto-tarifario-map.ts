import type { TarifarioSummary } from "@/lib/pricing/summary";
import type { LogisticsLineItem } from "@/lib/pricing/logistics";

export interface PresupuestoValorConocido {
  dias: number | null;
  cantidad: number | null;
  valor_unitario: number | null;
  total: number;
}

function fromLine(line: LogisticsLineItem | undefined): PresupuestoValorConocido | null {
  if (!line) return null;
  return {
    dias: line.dias,
    cantidad: line.quantity,
    valor_unitario: line.rate,
    total: Math.round(line.subtotal),
  };
}

// dias=1, cantidad=1 para que el total siga saliendo de dias × cantidad ×
// valor_unitario en el editor (que ahora siempre recalcula el total así),
// en vez de depender de un total suelto sin desglose.
function fromTotal(total: number): PresupuestoValorConocido {
  const rounded = Math.round(total);
  return { dias: 1, cantidad: 1, valor_unitario: rounded, total: rounded };
}

function find(items: LogisticsLineItem[], label: string) {
  return items.find((i) => i.label === label);
}

/**
 * Rubros de la plantilla de Presupuesto que ya se pueden traer calculados
 * del Tarifario (Logística 360 + comisiones), en vez de arrancar en cero.
 * Solo se mapean los que tienen una fuente 1:1 clara — el resto se deja en
 * blanco para que el equipo de producción los complete a mano. Todo queda
 * editable después: esto solo prellena el punto de partida.
 */
export function valoresConocidosDesdeTarifario(
  summary: TarifarioSummary
): Record<string, PresupuestoValorConocido> {
  const { lineItems } = summary.logistica;
  const map: Record<string, PresupuestoValorConocido> = {};

  function set(nombre: string, value: PresupuestoValorConocido | null) {
    if (value) map[nombre] = value;
  }

  // Proveedores
  set("Computadores", fromLine(find(lineItems.equipos, "Computadores (alquiler portátil)")));
  set("Impresora", fromLine(find(lineItems.equipos, "Impresoras")));

  // Honorarios
  set("Honorarios Productor", fromLine(find(lineItems.honorarios, "Productor (según aforo)")));
  set(
    "Comisión del Comercial (Cierre del negocio)",
    fromTotal(summary.costoDirectorComercial + summary.costoAsesorComercial)
  );
  set(
    "Honorarios personal Staff (acompañamiento evento)",
    fromLine(find(lineItems.honorarios, "Supervisor"))
  );
  set(
    "Honorarios auxiliares logística para el evento",
    fromLine(find(lineItems.honorarios, "Logístico"))
  );

  // Alimentación y Hotel
  set(
    "Almuerzos logística para visita pre-operativa (incluido supervisores)",
    fromLine(find(lineItems.alimentacionHotel, "Almuerzo (día antes, staff que viaja)"))
  );
  set(
    "Refrigerios logística para visita pre-operativa (incluido supervisores)",
    fromLine(find(lineItems.alimentacionHotel, "Refrigerio AM+PM (día antes, staff que viaja)"))
  );
  set(
    "Almuerzos para logística durante evento (incluido supervisores)",
    fromLine(find(lineItems.alimentacionHotel, "Almuerzo (Logística — días del evento, todo el equipo)"))
  );
  set(
    "Refrigerios para logística durante evento (incluido supervisores)",
    fromLine(find(lineItems.alimentacionHotel, "Refrigerio AM+PM (días evento, todo el equipo)"))
  );
  set("Hotel supervisores", fromLine(find(lineItems.alimentacionHotel, "Hotel (noches, staff que viaja)")));
  set("Desayunos (Staff principal)", fromLine(find(lineItems.alimentacionHotel, "Desayuno (Staff que viaja)")));
  set("Cenas (Staff principal)", fromLine(find(lineItems.alimentacionHotel, "Cena (Staff que viaja)")));

  // Transporte
  set(
    "Transportes ciudad Origen",
    fromLine(find(lineItems.transporte, "Transporte nacional (casa-aeropuerto-casa, origen)"))
  );
  const destino = [
    "Transporte aeropuerto → hotel (día 1 de llegada)",
    "Transporte local hotel↔evento (todos los días en tierra)",
    "Transporte local del Productor (Bogotá)",
  ].reduce((sum, label) => sum + (find(lineItems.transporte, label)?.subtotal ?? 0), 0);
  if (destino > 0) set("Transportes Ciudad de destino", fromTotal(destino));
  set("Transporte equipos", fromLine(find(lineItems.transporte, "Transporte del case (equipos)")));
  set("Tiquetes Aéreos", fromLine(find(lineItems.transporte, "Tiquetes aéreos (ida y regreso)")));

  // Varios
  set(
    "Recarga de Datos para Smartphones",
    fromLine(find(lineItems.costosVarios, "Recarga de datos smartphones"))
  );
  set(
    "Camisetas para Staff (supervisores, acompañantes)",
    fromLine(find(lineItems.costosVarios, "Camisetas para Staff"))
  );
  set("Lavado de chalecos", fromLine(find(lineItems.costosVarios, "Lavado de chalecos")));
  set("Compra de Agua", fromLine(find(lineItems.costosVarios, "Compra de agua")));
  set("Compra de bloqueador Solar", fromLine(find(lineItems.costosVarios, "Compra de bloqueador solar")));
  set("Actividad de cierre (cena, almuerzo)", fromLine(find(lineItems.costosVarios, "Actividad de cierre")));

  return map;
}
