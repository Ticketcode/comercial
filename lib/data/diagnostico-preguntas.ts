import type { Modality } from "@/lib/types";

/** Preguntas del Diagnóstico guiado que aplican a cada modalidad (mismo orden que en pantalla). */
export function idsPreguntas(m: Modality): string[] {
  const pres = m === "presencial" || m === "hibrido";
  return ["evento", ...(pres ? ["equipo", "puntos", "pre", "cred"] : [])];
}

/** Cuántas preguntas faltan por contestar o por confirmar (las que dejó NOVA cuentan como por confirmar). */
export function pendientesDiagnostico(m: Modality, estado: Record<string, unknown>): { sinResponder: number; porConfirmar: number } {
  const ids = idsPreguntas(m);
  return {
    sinResponder: ids.filter((id) => !estado[id]).length,
    porConfirmar: ids.filter((id) => estado[id] === "ia").length,
  };
}
