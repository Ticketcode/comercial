import type { Proposal } from "@/lib/types";

/** Datos del diagnóstico que faltan para que el valor de la propuesta sea completo. */
export function faltantesDiagnostico(p: Proposal): string[] {
  const falta: string[] = [];
  const pres = p.modality === "presencial" || p.modality === "hibrido";
  const virt = p.modality !== "presencial";
  if (!p.event_name?.trim()) falta.push("el nombre del evento");
  if (!(Number(p.dias) > 0)) falta.push("los días");
  if (pres && !(Number(p.aforo ?? 0) > 0)) falta.push("el aforo presencial");
  if (virt && !(Number(p.aforo_virtual ?? 0) > 0)) falta.push("el aforo virtual");
  if (pres && p.con_logistica !== false && !p.city?.trim()) falta.push("la ciudad");
  return falta;
}
