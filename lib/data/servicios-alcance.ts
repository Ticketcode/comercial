/**
 * A qué modalidades aplica cada servicio personalizado del catálogo. Un evento presencial no ofrece
 * servicios de transmisión o chat; uno virtual no ofrece los de acreditación en sitio.
 * Los servicios que usan ambas modalidades no aparecen aquí.
 */
import type { Modality } from "@/lib/types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

/** Solo tienen sentido con evento presencial (o híbrido). */
const SOLO_PRESENCIAL = [
  "visitas a stands",
  "beneficios asociados al qr",
  "control suministro",
  "pre-impresion de escarapelas",
  "capacitacion al staff",
  "internet dedicado",
  "pre acreditacion",
  "escarapelas fisicas",
  "manillas",
  "modulo de branding",
  "labels de seguridad",
  "venta de boleteria en sitio",
  "sitios simultaneos",
];

/** Solo tienen sentido con asistentes virtuales (virtual, híbrido o mundo virtual). */
const SOLO_VIRTUAL = [
  "salas privadas de chats",
  "chat completo",
  "notificaciones push",
  "salas de transmision",
  "i-frame de transmision",
  "cloud server virtual",
];

/** Servicios que se definen con una pregunta del Diagnóstico y no se eligen a mano en la lista. */
const CONTROLADOS_POR_PREGUNTA = [
  "pre acreditacion",
  "escarapelas fisicas",
  "manillas",
  "modulo de branding",
  "labels de seguridad",
  "venta de boleteria en sitio",
];

export type Alcance = "ambas" | "presencial" | "virtual";

export function alcanceServicio(label: string): Alcance {
  const n = norm(label);
  if (SOLO_VIRTUAL.some((x) => n.includes(x))) return "virtual";
  if (SOLO_PRESENCIAL.some((x) => n.includes(x))) return "presencial";
  return "ambas";
}

/** ¿Se puede ofrecer este servicio en esta modalidad? */
export function servicioAplica(label: string, modalidad: Modality): boolean {
  const a = alcanceServicio(label);
  if (a === "ambas") return true;
  if (a === "presencial") return modalidad === "presencial" || modalidad === "hibrido";
  return modalidad === "virtual" || modalidad === "hibrido" || modalidad === "mundo_virtual";
}

export function controladoPorPregunta(label: string): boolean {
  const n = norm(label);
  return CONTROLADOS_POR_PREGUNTA.some((x) => n.includes(x));
}
