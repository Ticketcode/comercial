// Plantilla fija de actividades de producción — transcrita del ClickUp real
// del equipo. Se clona (seedActivitiesFromTemplate) en cada evento cuando
// entra a Producción.
//
// La mayoría de tareas del ClickUp tienen subtareas o checklists cuyo
// CONTEO se veía (ej. "0/15") pero no el texto de cada ítem — esas quedan
// sin precargar (el equipo las agrega desde la app) para no inventar
// contenido que no se vio. Los 2 checklists cuyo detalle completo SÍ se
// compartió ("Actividades logísticas durante/después del evento") están
// completos.

export type ActivityMomento = "antes_evento" | "durante_evento" | "despues_evento";
export type ActivityCategoria =
  | "produccion"
  | "actividades_logisticas"
  | "actividades_operativas"
  | "proveedores"
  | "administrativo"
  | "area_tecnica";

export interface ActivityTemplateChecklistGroup {
  nombre: string;
  items: string[];
}

export interface ActivityTemplateTask {
  nombre: string;
  momento: ActivityMomento;
  checklistGroups?: ActivityTemplateChecklistGroup[];
}

export const ACTIVITY_CATEGORIES: { key: ActivityCategoria; label: string; colorClass: string }[] = [
  { key: "produccion", label: "Producción", colorClass: "bg-rose-100 text-rose-700 border-rose-200" },
  { key: "actividades_logisticas", label: "Actividades Logísticas", colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { key: "actividades_operativas", label: "Actividades Operativas", colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "proveedores", label: "Proveedores", colorClass: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "administrativo", label: "Administrativo", colorClass: "bg-red-100 text-red-700 border-red-200" },
  { key: "area_tecnica", label: "Área Técnica", colorClass: "bg-amber-100 text-amber-700 border-amber-200" },
];

const ACTIVIDADES_LOGISTICAS_DURANTE_CHECKLIST: ActivityTemplateChecklistGroup[] = [
  {
    nombre: "Actividades previas al inicio del evento",
    items: [
      "Estar pendiente a la llegada de los supervisores",
      "Llamar asistencia a la hora estipulada",
      "Revisar la presentación personal de los logísticos",
      "Entregar y marcar chalecos",
      "Revisar que todos los logísticos tengan saldo (así sea mínimo) para realizar una llamada de urgencia al coordinador",
      "Revisar si se tienen los grupos de WhatsApp con los logísticos (esto aplica para eventos con varios lugares de control de acceso)",
      "Distribuir al personal en cada punto de atención",
      "Decidir estrategia para ingreso inicial (Acreditación en fila u organización de filas en la puerta)",
    ],
  },
  {
    nombre: "Inicio de operación del evento",
    items: [
      "Apertura de Puertas",
      "Realizar sincronización en los equipos (media mañana)",
      "Realizar recorrido de verificación por los puntos del evento",
      "Realizar recolección de fotos del flujo de asistentes y operación de logísticos",
      "Realizar sincronización en los equipos (media tarde)",
      "Coordinar con Supervisores la entrega de Refrigerios AM - PM",
      "Coordinar entrega de almuerzos",
      "Coordinar los horarios para entregar informes pre-liminares al organizador/encargado",
    ],
  },
];

const ACTIVIDADES_LOGISTICAS_DESPUES_CHECKLIST: ActivityTemplateChecklistGroup[] = [
  {
    nombre: "Actividades clave inmediatamente finaliza el evento",
    items: [
      "Realizar levantamiento de puntos (personal y equipos)",
      "Recoger y hacer conteo de Chalecos",
      "Reunión equipo de ticketcode de cierre de día",
      "Realizar inventario de equipos (portátiles, celulares, impresoras, etc)",
      "Poner a cargar equipos utilizados en la operación",
      "Realizar inventario del material sobrante (Escarapelas-Kits)",
    ],
  },
  {
    nombre: "Coordinar entrega de cuentas de cobro logística",
    items: [
      "Revisar planilla de asistencia durante el evento",
      "Crear cuentas de cobro de acuerdo con días laborados",
      "Enviar cuenta de cobro a todo el equipo",
      "Hacer seguimiento a la recepción de todas las cuentas de cobro",
      "Enviar correo a contabilidad con todas las cuentas de cobro diligenciadas del equipo",
    ],
  },
  {
    nombre: "Confirmación de pagos",
    items: [
      "Avisar al equipo cuando los pagos estén realizados.",
      "Coordinar con contabilidad si hay pagos rebotados",
      "Incluir valor ejecutado en presupuesto",
    ],
  },
];

export const ACTIVITY_TEMPLATE: Record<ActivityCategoria, ActivityTemplateTask[]> = {
  produccion: [
    { nombre: "Reunión de empalme con comercial", momento: "antes_evento" },
    { nombre: "Creación de carpeta de producción en drive", momento: "antes_evento" },
    { nombre: "Alistamiento Reunión #1 Onboarding", momento: "antes_evento" },
    { nombre: "Reunión #1 - ONBOARDING", momento: "antes_evento" },
    { nombre: "Enviar correo a las áreas que se involucran en el proceso de pr…", momento: "antes_evento" },
    { nombre: "Hacer revisión de acuerdo comercial", momento: "antes_evento" },
    { nombre: "Coordinar envío de Encuestas de satisfacción", momento: "antes_evento" },
    { nombre: "Coordinar envío de correo de agradecimiento", momento: "antes_evento" },
    { nombre: "Coordinar envío de Certificados de asistencia", momento: "antes_evento" },
    { nombre: "Informe final de producción", momento: "despues_evento" },
    { nombre: "Entrega final de presupuesto", momento: "despues_evento" },
  ],
  actividades_logisticas: [
    { nombre: "Contratar supervisores", momento: "antes_evento" },
    { nombre: "Realizar búsqueda y contratación del personal", momento: "antes_evento" },
    { nombre: "Crear grupo de whatsapp de logística", momento: "antes_evento" },
    { nombre: "Realizar afiliación a ARL", momento: "antes_evento" },
    { nombre: "Capacitar al personal del evento", momento: "antes_evento" },
    { nombre: "Definir los roles de cada punto de logística", momento: "antes_evento" },
    { nombre: "Registrar personal de Logística en el evento", momento: "antes_evento" },
    { nombre: "Pintar en los planos los diferentes flujos de la pre-acreditación y d…", momento: "antes_evento" },
    { nombre: "Solicitar la agenda del evento", momento: "antes_evento" },
    {
      nombre: "Actividades logísticas durante el evento",
      momento: "durante_evento",
      checklistGroups: ACTIVIDADES_LOGISTICAS_DURANTE_CHECKLIST,
    },
    {
      nombre: "Actividades logísticas después del evento",
      momento: "despues_evento",
      checklistGroups: ACTIVIDADES_LOGISTICAS_DESPUES_CHECKLIST,
    },
  ],
  actividades_operativas: [
    { nombre: "Verificación de equipos y logística", momento: "durante_evento" },
    { nombre: "Coordinar visita pre-operativa", momento: "antes_evento" },
    { nombre: "Atender entrega de Pre-acreditaciones", momento: "antes_evento" },
    { nombre: "Alistamiento de equipos e indumentario", momento: "antes_evento" },
    { nombre: "Revisión tecni-operativa antes del evento", momento: "antes_evento" },
    { nombre: "Coordinar actividades de pre-impresión", momento: "antes_evento" },
    { nombre: "Definir transporte del staff principal del evento", momento: "antes_evento" },
    { nombre: "Armar presupuesto", momento: "antes_evento" },
    { nombre: "Realizar viáticos del staff principal del evento", momento: "antes_evento" },
    { nombre: "Definir Hotel/AIRBNB", momento: "antes_evento" },
    { nombre: "Realizar configuración y activación de escarapela digital", momento: "antes_evento" },
  ],
  proveedores: [
    { nombre: "Solicitud de equipos", momento: "antes_evento" },
    { nombre: "Definir la alimentación del equipo", momento: "antes_evento" },
    { nombre: "Coordinar transporte del Case", momento: "antes_evento" },
    { nombre: "Realizar producción de escarapelas y Manillas", momento: "antes_evento" },
    { nombre: "Actividades de cierre con proveedores", momento: "despues_evento" },
  ],
  administrativo: [
    { nombre: "Realizar las compras de equipos y utilitarios fa…", momento: "antes_evento" },
    { nombre: "Legalizar ARL de todo el personal del equipo", momento: "antes_evento" },
    { nombre: "Organizar Trasteo de equipos para el evento", momento: "antes_evento" },
    { nombre: "Enviar factura del evento y hacer seguimiento", momento: "despues_evento" },
    { nombre: "Legalizar y solicitar anticipo del evento según corresponda", momento: "antes_evento" },
    { nombre: "Recibir y hacer inventario de equipos en la oficina", momento: "despues_evento" },
    { nombre: "Mandar a la lavandería chalecos", momento: "despues_evento" },
  ],
  area_tecnica: [
    { nombre: "Configuración del evento en Ticketcode", momento: "antes_evento" },
    { nombre: "Generación de códigos QR's para uso dentro del evento", momento: "antes_evento" },
    { nombre: "Envío de Correos de Recordación", momento: "antes_evento" },
    { nombre: "Preparar operación Offline de registro y control de ingre…", momento: "antes_evento" },
    { nombre: "Preparar Plataforma e Infraestructura", momento: "antes_evento" },
    { nombre: "Soporte", momento: "antes_evento" },
    { nombre: "Informe Final", momento: "despues_evento" },
  ],
};
