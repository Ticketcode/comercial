import type { Modality } from "@/lib/types";

/**
 * Textos por defecto del contrato. La plantilla (templates/contrato-template.docx)
 * trae las variables {objeto_general} y {objeto_particular}; si el comercial no
 * escribe nada en el paso Contrato se usan estos textos.
 */

/** Cláusula PRIMERA (objeto general): texto antes y después del nombre del evento, por modalidad. */
const OBJETO_GENERAL: Record<Modality, [string, string]> = {
  presencial: [
    "El OBJETO GENERAL del contrato consiste en la prestación de los servicios integrales de la plataforma (TICKETCODE) para la gestión y producción logística que involucra el acompañamiento y el soporte técnico especializado en operación logística de eventos, suministro de equipos, transferencia de conocimiento, habilitación de múltiples funciones de gestión, organización, control, registro, acreditación, entrega de kits, control de acceso, módulo de Inteligencia Artificial para realizar actividades de networking, obtención de información real y segmentada de todo el flujo en tiempo real de los participantes al evento: ",
    " (EL EVENTO) cubriendo todos los requerimientos relacionados en la propuesta aprobada por EL CONTRATANTE en la realización y producción del EVENTO. Esta operación es transversal y cubre el ANTES (apoyo y/o acompañamiento en la configuración, parametrización y publicación del EVENTO), DURANTE (suministro de personal/capacitación de personal suministrado por el organizador, suministro de equipos, producción logística de registro, acreditación y control de acceso de EL EVENTO) y DESPUÉS (entrega de informes, suministro de DATA real y segmentada de todo el flujo de asistentes y participantes al EVENTO).",
  ],
  hibrido: [
    "El OBJETO GENERAL del contrato consiste en la prestación de los servicios integrales de la plataforma (TICKETCODE) para la gestión, producción logística y transmisión virtual que involucra el acompañamiento y el soporte técnico especializado en operación logística de eventos, suministro de equipos, transferencia de conocimiento, habilitación de múltiples funciones de gestión, organización, control, registro, acreditación, entrega de kits, control de acceso, módulo de Inteligencia Artificial para realizar actividades de networking, obtención de información real y segmentada de todo el flujo en tiempo real de los participantes al evento: ",
    " (EL EVENTO) cubriendo todos los requerimientos relacionados en la propuesta aprobada por EL CONTRATANTE en la realización y producción del EVENTO. Esta operación es transversal y cubre el ANTES (apoyo y/o acompañamiento en la configuración, parametrización, publicación y pruebas de la transmisión del EVENTO), DURANTE (suministro de personal/capacitación de personal suministrado por el organizador, suministro de equipos, producción logística de registro, acreditación y control de acceso de EL EVENTO y operación de su transmisión virtual) y DESPUÉS (entrega de informes, suministro de DATA real y segmentada de todo el flujo de asistentes y participantes al EVENTO).",
  ],
  virtual: [
    "El OBJETO GENERAL del contrato consiste en la prestación de los servicios integrales de la plataforma (TICKETCODE) para la gestión y transmisión virtual del evento que involucra el soporte técnico especializado en la operación de la transmisión, transferencia de conocimiento, habilitación de múltiples funciones de gestión, organización, control, registro, control de acceso a la transmisión, módulo de Inteligencia Artificial para realizar actividades de networking, obtención de información real y segmentada de todo el flujo en tiempo real de los participantes al evento: ",
    " (EL EVENTO) cubriendo todos los requerimientos relacionados en la propuesta aprobada por EL CONTRATANTE en la realización y producción del EVENTO. Esta operación es transversal y cubre el ANTES (apoyo y/o acompañamiento en la configuración, parametrización, publicación y pruebas de la transmisión del EVENTO), DURANTE (soporte técnico y operación de la transmisión, el registro y el control de acceso virtual de EL EVENTO) y DESPUÉS (entrega de informes, suministro de DATA real y segmentada de todo el flujo de asistentes y participantes al EVENTO).",
  ],
  mundo_virtual: [
    "El OBJETO GENERAL del contrato consiste en la prestación de los servicios integrales de la plataforma (TICKETCODE) para la construcción, gestión y operación del mundo virtual del evento que involucra el soporte técnico especializado en la operación del entorno, transferencia de conocimiento, habilitación de múltiples funciones de gestión, organización, control, registro, control de acceso al mundo virtual, módulo de Inteligencia Artificial para realizar actividades de networking, obtención de información real y segmentada de todo el flujo en tiempo real de los participantes al evento: ",
    " (EL EVENTO) cubriendo todos los requerimientos relacionados en la propuesta aprobada por EL CONTRATANTE en la realización y producción del EVENTO. Esta operación es transversal y cubre el ANTES (apoyo y/o acompañamiento en la configuración, parametrización, construcción, publicación y pruebas del mundo virtual del EVENTO), DURANTE (soporte técnico y operación del mundo virtual, el registro y el control de acceso de EL EVENTO) y DESPUÉS (entrega de informes, suministro de DATA real y segmentada de todo el flujo de asistentes y participantes al EVENTO).",
  ],
};

/**
 * Modalidades cuyo texto base es un borrador que debe revisar el equipo
 * legal antes de usarse: el texto original del formato es el de presencial y
 * las demás variantes solo adaptan las partes operativas.
 */
export const OBJETO_GENERAL_POR_REVISAR: Modality[] = ["hibrido", "virtual", "mundo_virtual"];

/** Cláusula PRIMERA (objeto general) con el nombre del evento ya puesto. */
export function objetoGeneralBase(evento: string, modalidad: Modality = "presencial"): string {
  const [antes, despues] = OBJETO_GENERAL[modalidad] ?? OBJETO_GENERAL.presencial;
  return antes + evento + despues;
}

/** Cláusula SEGUNDA (objeto particular) cuando no se escribe uno. */
export const OBJETO_PARTICULAR_BASE =
  "El alcance detallado del servicio corresponde a lo definido en la propuesta comercial aprobada (componentes básicos, servicios personalizados, logística 360 y acuerdo comercial).";
