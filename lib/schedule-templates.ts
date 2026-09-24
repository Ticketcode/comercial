import type { Modality } from "@/lib/types";

export interface ScheduleTemplateItem {
  week_number: number;
  hito: string;
  comentario: string | null;
}

/**
 * Punto de partida por modalidad (basado en "Plantilla cronograma
 * 2026.xlsx") — es una plantilla editable, no un cronograma fijo: cada
 * propuesta ajusta semanas/hitos según la negociación con el cliente.
 */
const TEMPLATES: Record<Modality, ScheduleTemplateItem[]> = {
  presencial: [
    { week_number: 1, hito: "Onboarding", comentario: null },
    { week_number: 1, hito: "Configuración y puesta a punto de la plataforma", comentario: null },
    { week_number: 2, hito: "Configuración y puesta a punto de la plataforma", comentario: null },
    { week_number: 3, hito: "Capacitaciones", comentario: null },
    { week_number: 4, hito: "Capacitaciones sobre el flujo de logística", comentario: null },
    { week_number: 5, hito: "Visita preoperativa", comentario: null },
    { week_number: 6, hito: "Pruebas del sistema", comentario: null },
    { week_number: 6, hito: "Cierre y corte de los registros en la plataforma", comentario: null },
  ],
  hibrido: [
    { week_number: 1, hito: "Onboarding", comentario: null },
    { week_number: 1, hito: "Configuración y puesta a punto de la plataforma", comentario: null },
    { week_number: 2, hito: "Pre-producción", comentario: null },
    { week_number: 3, hito: "Capacitaciones", comentario: null },
    { week_number: 4, hito: "Capacitaciones sobre el flujo de logística", comentario: null },
    { week_number: 5, hito: "Visita preoperativa", comentario: null },
    { week_number: 5, hito: "Mundo virtual", comentario: null },
    { week_number: 6, hito: "Pruebas del sistema", comentario: null },
    { week_number: 6, hito: "Cierre y corte de los registros en la plataforma", comentario: null },
  ],
  virtual: [
    { week_number: 1, hito: "Onboarding", comentario: null },
    { week_number: 2, hito: "Configuración y puesta a punto de la plataforma", comentario: null },
    { week_number: 3, hito: "Pre-producción", comentario: null },
    { week_number: 4, hito: "Capacitaciones", comentario: null },
    { week_number: 5, hito: "Pruebas del sistema", comentario: null },
    { week_number: 6, hito: "Cierre y corte de los registros en la plataforma", comentario: null },
  ],
  mundo_virtual: [
    { week_number: 1, hito: "Onboarding", comentario: null },
    { week_number: 2, hito: "Mundo virtual", comentario: null },
    { week_number: 3, hito: "Mundo virtual", comentario: null },
    { week_number: 4, hito: "Configuración y puesta a punto de la plataforma", comentario: null },
    { week_number: 5, hito: "Capacitaciones", comentario: null },
    { week_number: 6, hito: "Pruebas del sistema", comentario: null },
  ],
};

export function defaultScheduleFor(modality: Modality): ScheduleTemplateItem[] {
  return TEMPLATES[modality] ?? TEMPLATES.presencial;
}

export const REQUERIMIENTOS_OPERATIVOS_TEMPLATE = `Escarapelas/manillas: enviar el arte (espacio QR 6cm alto x 8cm ancho) con 20 días hábiles de anticipación para la producción gráfica.
Personal de logística: el organizador debe suministrar personas de apoyo logístico para ser capacitadas en el manejo de la plataforma.
Canal de internet dedicado y cableado de 30MB-50MB para todos los puntos de registro.
WiFi dedicado de 20MB-30MB para los equipos de control de acceso.
Salón de capacitación adecuado (internet, proyector, sillas, mesa).
Centro de operaciones (salón-bodega) para almacenamiento de elementos, equipos, supervisión técnica, mesas, sillas, conexiones eléctricas e internet dedicado.
Mobiliario: mesas, sillas, conexiones eléctricas, coleros.`;
