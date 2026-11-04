/**
 * Cantidades de la Logística 360 para la presentación: qué se pone en el evento y cuánto de cada cosa.
 * Todo sale de lo configurado en el Diagnóstico (equipo, salones internos, equipos, pre-acreditación); no hay textos fijos con cifras.
 * Si el evento no lleva logística de Ticketcode, las mismas cantidades se muestran como lo que debe disponer el organizador.
 */
import { logisticosPorSalon, logisticosPreacreditacion } from "@/lib/pricing/logistics";
import type { Proposal } from "@/lib/types";

export interface FilaCantidad {
  /** Número grande; null = ítem sin cantidad (lleva ✓). */
  cantidad: number | null;
  etiqueta: string;
  detalle?: string;
}

export interface PaqueteCantidades {
  nombre: string;
  promesa: string;
  filas: FilaCantidad[];
}

export interface CantidadesLogistica {
  /** true = lo dispone el organizador (el evento no lleva logística de Ticketcode). */
  sinLogistica: boolean;
  paquetes: PaqueteCantidades[];
}

type DatosProposal = Pick<
  Proposal,
  | "modality"
  | "con_logistica"
  | "qty_productor"
  | "qty_supervisor"
  | "qty_logistico"
  | "qty_logistica_salones_internos"
  | "salones_internos_aforos"
  | "qty_computadores"
  | "qty_impresoras"
  | "qty_rollos_labels"
  | "visita_preoperativa_dias"
  | "preacreditacion_medio_dia"
>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const fmt = (n: number) => n.toLocaleString("es-CO");

/** "4 en el salón de 2.000 · 3 en cada uno de 2 salones de 500" — cómo se reparten los logísticos de salón. */
export function distribucionSalones(aforos: number[]): string {
  const grupos: { aforo: number; cuantos: number }[] = [];
  for (const a of aforos) {
    const g = grupos.find((x) => x.aforo === a);
    if (g) g.cuantos += 1;
    else grupos.push({ aforo: a, cuantos: 1 });
  }
  // Con más de tres aforos distintos el detalle no cabe en la lámina: se resume.
  if (grupos.length > 3) return `${aforos.length} salones, según el aforo de cada uno`;
  return grupos
    .map((g) => {
      const por = logisticosPorSalon(g.aforo);
      return g.cuantos === 1
        ? `${por} en el salón de ${fmt(g.aforo)}`
        : `${por} en cada uno de ${g.cuantos} salones de ${fmt(g.aforo)}`;
    })
    .join(" · ");
}

/**
 * @param preDias días de pre-acreditación (0 = no hay; sale de la cantidad del servicio "Pre acreditación")
 * @param catalogo ítems de Logística 360 del catálogo con su marca de incluido (para respetar lo que se desmarcó)
 * @param capacitacionStaff si el servicio de capacitación al staff está incluido (lo único que se cobra sin logística)
 */
export function cantidadesLogistica(
  p: DatosProposal,
  preDias: number,
  catalogo: { name: string; included: boolean }[],
  capacitacionStaff: boolean
): CantidadesLogistica | null {
  if (p.modality !== "presencial" && p.modality !== "hibrido") return null;
  const sin = p.con_logistica === false;

  // Con logística de Ticketcode se respeta lo que el comercial desmarcó en el catálogo; sin ella se muestra todo lo que hace falta.
  const lleva = (patron: RegExp) => {
    if (sin) return true;
    const encontrados = catalogo.filter((c) => patron.test(norm(c.name)));
    return encontrados.length === 0 || encontrados.some((c) => c.included);
  };

  const logisticos = Number(p.qty_logistico);
  const aforosSalones = (p.salones_internos_aforos ?? []).map(Number).filter((n) => n > 0);
  const salones = Number(p.qty_logistica_salones_internos);

  const equipo: FilaCantidad[] = [];
  if (lleva(/acompanamiento|personal logistico/)) {
    if (Number(p.qty_productor) > 0) equipo.push({ cantidad: Number(p.qty_productor), etiqueta: Number(p.qty_productor) === 1 ? "Productor" : "Productores", detalle: "Acompaña todo el evento" });
    if (Number(p.qty_supervisor) > 0) equipo.push({ cantidad: Number(p.qty_supervisor), etiqueta: Number(p.qty_supervisor) === 1 ? "Supervisor" : "Supervisores" });
    if (logisticos > 0) equipo.push({ cantidad: logisticos, etiqueta: "Logísticos", detalle: "Registro y acreditación" });
    if (salones > 0) {
      equipo.push({
        cantidad: salones,
        etiqueta: "Logísticos de salón",
        detalle: aforosSalones.length > 0 ? `Distribuidos así: ${distribucionSalones(aforosSalones)}` : undefined,
      });
    }
  }

  const acreditacion: FilaCantidad[] = [];
  if (lleva(/suministro de equipos/)) {
    if (Number(p.qty_computadores) > 0) acreditacion.push({ cantidad: Number(p.qty_computadores), etiqueta: "Portátiles" });
    if (Number(p.qty_impresoras) > 0) acreditacion.push({ cantidad: Number(p.qty_impresoras), etiqueta: "Impresoras" });
    if (logisticos > 0) acreditacion.push({ cantidad: logisticos, etiqueta: "Smartphones de lectura" });
  }
  if (lleva(/consumibles|suministro de equipos/) && Number(p.qty_rollos_labels) > 0) {
    acreditacion.push({ cantidad: Number(p.qty_rollos_labels), etiqueta: "Rollos de labels", detalle: "Papel térmico para las credenciales" });
  }

  const operacion: FilaCantidad[] = [];
  if (!sin && lleva(/visita preoperativa/) && Number(p.visita_preoperativa_dias) > 0) {
    const d = Number(p.visita_preoperativa_dias);
    operacion.push({ cantidad: d, etiqueta: d === 1 ? "Día de visita preoperativa" : "Días de visita preoperativa" });
  }
  if (preDias > 0 && logisticos > 0) {
    operacion.push({
      cantidad: logisticosPreacreditacion(logisticos),
      etiqueta: "Logísticos de pre-acreditación",
      detalle: `${preDias} ${preDias === 1 ? "día" : "días"} · ${p.preacreditacion_medio_dia ? "medio día" : "día completo"}`,
    });
  }
  if (sin) {
    if (capacitacionStaff) operacion.push({ cantidad: null, etiqueta: "Capacitación a tu equipo", detalle: "2 horas con Ticketcode: plataforma, roles y contingencias" });
  } else {
    if (lleva(/capacitaciones a logisticos/)) operacion.push({ cantidad: null, etiqueta: "Capacitación a logísticos", detalle: "2 horas: plataforma, roles y contingencias" });
    if (lleva(/soporte tecnico/)) operacion.push({ cantidad: null, etiqueta: "Soporte técnico permanente" });
  }

  const paquetes: PaqueteCantidades[] = [
    {
      nombre: sin ? "Personal en sitio" : "Tu equipo en sitio",
      promesa: sin ? "El equipo que el organizador debe disponer." : "Un equipo entrenado que opera el evento por ti.",
      filas: equipo,
    },
    {
      nombre: sin ? "Equipos de acreditación" : "Acreditación y acceso",
      promesa: sin ? "Lo que debe estar listo para acreditar." : "Cada asistente entra rápido y con su credencial.",
      filas: acreditacion,
    },
    {
      nombre: sin ? "Pre-acreditación y capacitación" : "Preparación y operación",
      promesa: sin ? "Antes del evento y para tu equipo." : "Lo resolvemos antes y durante el evento.",
      filas: operacion,
    },
  ].filter((x) => x.filas.length > 0);

  return paquetes.length > 0 ? { sinLogistica: sin, paquetes } : null;
}
