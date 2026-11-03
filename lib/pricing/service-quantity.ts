import type { Proposal } from "@/lib/types";

/** Módulo que habilita salones internos: su cantidad define cuántos salones hay. */
export const SALONES_INTERNOS_SERVICE_LABEL =
  "Módulo para obtención de datos en diferentes sitios simultáneos";

// Servicios cuya cantidad se calcula sola (de solo lectura) en vez de digitarse a mano.
export const CLOUD_SERVER_LABEL = "Cloud server";
export const CLOUD_SERVER_VIRTUAL_LABEL = "Cloud server virtual";
export const AFORO_TOTAL_SERVICE_LABELS = new Set([
  "Envío de correos electrónicos de confirmación personalizados",
  "Envío de correos de recordación (hasta 2 envíos)",
  "Envío de correos electrónicos de agradecimiento",
  "Envío de certificados de asistencia",
]);

type DatosCantidad = Pick<Proposal, "aforo" | "aforo_virtual" | "dias" | "tasa_conversion_pct">;

/**
 * Cantidad calculada (no digitada) para los servicios que dependen de
 * aforo/días/tasa. Devuelve null si el servicio no es uno de estos (se usa la
 * cantidad digitada). Es la misma regla del Diagnóstico y de lo que Claude propone.
 */
export function computedServiceQuantity(label: string, p: DatosCantidad): number | null {
  const aforo = Number(p.aforo ?? 0);
  const aforoVirtual = Number(p.aforo_virtual ?? 0);
  const dias = Number(p.dias);
  const tasa = Number(p.tasa_conversion_pct);
  if (label === CLOUD_SERVER_LABEL) return Math.round(aforo * dias * tasa);
  if (label === CLOUD_SERVER_VIRTUAL_LABEL) return Math.round(aforoVirtual * dias * tasa);
  if (AFORO_TOTAL_SERVICE_LABELS.has(label)) return Math.round(aforo + aforoVirtual);
  return null;
}
