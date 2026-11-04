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

/** Servicios que se definen en un cuadro del Diagnóstico (pre-acreditación) y no se eligen a mano en la lista. */
const CONTROLADOS_POR_PREGUNTA = ["pre acreditacion"];

export type Alcance = "ambas" | "presencial" | "virtual";

export function alcanceServicio(label: string): Alcance {
  const n = norm(label);
  if (SOLO_VIRTUAL.some((x) => n.includes(x))) return "virtual";
  if (SOLO_PRESENCIAL.some((x) => n.includes(x))) return "presencial";
  return "ambas";
}

/** Servicios que solo existen si el evento lleva logística 360. */
const NECESITAN_LOGISTICA = [
  "pre acreditacion",
  "escarapelas fisicas",
  "manillas",
  "venta de boleteria en sitio",
  "sitios simultaneos",
  "control suministro",
  "pre-impresion de escarapelas",
  "modulo de branding",
  "labels de seguridad",
];

/** Servicios que solo tienen sentido si el evento vende boletas. */
const NECESITAN_BOLETERIA = ["pasarela de pagos", "transferencia de tarifa", "venta de boleteria en sitio"];

export const necesitaLogistica = (label: string) => NECESITAN_LOGISTICA.some((x) => norm(label).includes(x));
export const necesitaBoleteria = (label: string) => NECESITAN_BOLETERIA.some((x) => norm(label).includes(x));

type DatosServicio = { modality: Modality; con_logistica?: boolean; vende_boletas?: boolean };

/** ¿Se puede ofrecer este servicio en esta propuesta? Mira modalidad y si vende boletas (sin logística de Ticketcode el evento igual los necesita, solo no se cobran). */
export function servicioDisponible(label: string, p: DatosServicio): boolean {
  if (!servicioAplica(label, p.modality)) return false;
  if (p.vende_boletas === false && necesitaBoleteria(label)) return false;
  return true;
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
