import type { Proposal } from "@/lib/types";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";

/** Cómo se define la cantidad de un servicio, para mostrarlo bajo su nombre y decidir si se edita a mano. */
export function notaServicio(label: string, p: Proposal): { editable: boolean; nota: string } {
  const n = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (computedServiceQuantity(label, p) !== null) return { editable: false, nota: "Según el aforo y los días" };
  if (n.includes("pre acreditacion")) return { editable: false, nota: "Por día; los días se definen en el cuadro de pre-acreditación" };
  if (n.includes("sitios simultaneos")) return { editable: false, nota: "Un salón por unidad; se define en los salones internos" };
  return { editable: true, nota: "Catálogo" };
}
