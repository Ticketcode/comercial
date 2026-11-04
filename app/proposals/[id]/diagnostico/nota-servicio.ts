import type { Proposal } from "@/lib/types";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";

/** Cómo se define la cantidad de un servicio, para mostrarlo bajo su nombre y decidir si se edita a mano. */
export function notaServicio(label: string, p: Proposal): { editable: boolean; nota: string } {
  const n = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (computedServiceQuantity(label, p) !== null) return { editable: false, nota: "Según el aforo y los días" };
  if (n.includes("pre acreditacion")) return { editable: false, nota: "Por día; los días se definen en la pregunta de pre-acreditación" };
  if (n.includes("venta de boleteria en sitio")) return { editable: false, nota: "Un punto de venta por unidad; se define en la pregunta de puntos de venta" };
  if (n.includes("manillas") || n.includes("escarapelas fisicas")) return { editable: false, nota: "Una por asistente; se define en la pregunta de credenciales" };
  if (n.includes("branding") || n.includes("labels de seguridad")) return { editable: false, nota: "Se define en la pregunta de branding y labels" };
  if (n.includes("sitios simultaneos")) return { editable: false, nota: "Un salón por unidad; se define con los salones internos" };
  return { editable: true, nota: "Catálogo" };
}
