/**
 * Empaquetado de la oferta para la Presentación. En vez de mostrar tablas con
 * cada componente, logística y servicio por separado, se agrupan en paquetes
 * con un nombre, una promesa de valor y los componentes que incluyen.
 *
 * Los ítems siguen saliendo de lo que se marcó en la propuesta; aquí solo se
 * decide a qué paquete pertenece cada uno según su nombre en el catálogo. Lo
 * que no calza con ningún paquete cae en un paquete "Otros ..." de su familia,
 * para que nunca se pierda un ítem.
 */

export type Familia = "componente" | "logistica" | "servicio";

export type GrupoPaquetes =
  | "Plataforma base"
  | "Logística 360"
  | "Streaming"
  | "Mundo virtual"
  | "Servicios personalizados";

export interface ItemParaPaquete {
  familia: Familia;
  /** Nombre original del catálogo (sirve para ubicarlo en un paquete). */
  baseName: string;
  /** Nombre que se muestra: el original o el que el comercial editó con el lápiz. */
  name: string;
}

export interface Paquete {
  nombre: string;
  promesa: string;
  items: string[];
}

export interface PaquetesDeGrupo {
  grupo: GrupoPaquetes;
  paquetes: Paquete[];
}

export const GRUPOS_ORDEN: GrupoPaquetes[] = [
  "Plataforma base",
  "Logística 360",
  "Streaming",
  "Mundo virtual",
  "Servicios personalizados",
];

export const GRUPO_INFO: Record<GrupoPaquetes, { titulo: string; intro: string }> = {
  "Plataforma base": {
    titulo: "Todo en un solo sistema",
    intro: "Cada pieza depende de la anterior: sin diseño no hay registro, sin registro no hay boleta.",
  },
  "Logística 360": {
    titulo: "Personas y equipos en sitio",
    intro: "Un equipo que opera el evento para que nadie haga fila ni se pierda.",
  },
  Streaming: {
    titulo: "Tu transmisión completa",
    intro: "De la preparación al informe final, todo en un solo servicio.",
  },
  "Mundo virtual": {
    titulo: "Tu mundo virtual",
    intro: "Un entorno 3D propio para el contenido, la interacción y tus aliados.",
  },
  "Servicios personalizados": {
    titulo: "Ajustes a la medida",
    intro: "Servicios adicionales elegidos para este evento, agrupados por lo que resuelven.",
  },
};

interface Regla {
  patron: RegExp;
  /** Si se indica, la regla solo aplica a ítems de esas familias. */
  familias?: Familia[];
}

interface Definicion {
  grupo: GrupoPaquetes;
  nombre: string;
  promesa: string;
  reglas: Regla[];
}

const r = (patron: RegExp, familias?: Familia[]): Regla => ({ patron, familias });

/** El orden importa: gana la primera definición cuyo patrón calce. */
const DEFINICIONES: Definicion[] = [
  /* Plataforma base: componentes básicos */
  {
    grupo: "Plataforma base",
    nombre: "Tu evento en línea",
    promesa: "Una página propia con la imagen de tu evento, lista para registros.",
    reglas: [r(/landing page|^diseno$|formulario de registro/, ["componente"])],
  },
  {
    grupo: "Plataforma base",
    nombre: "Entradas y acceso",
    promesa: "Tú defines quién entra y con qué condiciones.",
    reglas: [r(/boleter|tipos de entrada|codigos de descuento|invitados especiales/, ["componente"])],
  },
  {
    grupo: "Plataforma base",
    nombre: "Comunicación con tus asistentes",
    promesa: "Cada persona recibe su entrada y la información del evento.",
    reglas: [r(/correos electronicos a todos los registrados/, ["componente"])],
  },
  {
    grupo: "Plataforma base",
    nombre: "Control y datos",
    promesa: "Ves lo que pasa en tiempo real y te quedas con los datos.",
    reglas: [r(/colaboradores|dashboard estandar|base de datos/, ["componente"])],
  },

  /* Logística 360 */
  {
    grupo: "Logística 360",
    nombre: "Tu equipo en sitio",
    promesa: "Un equipo entrenado que opera el evento por ti.",
    reglas: [r(/acompanamiento durante|personal logistico|capacitaciones a logisticos|soporte tecnico/, ["logistica"])],
  },
  {
    grupo: "Logística 360",
    nombre: "Acreditación y acceso",
    promesa: "Cada asistente entra rápido y con su credencial.",
    reglas: [
      r(/pre-?acreditacion|suministro de equipos|control de ace?so|consumibles|escarapelas|manillas|branding|labels/, [
        "logistica",
      ]),
    ],
  },
  {
    grupo: "Logística 360",
    nombre: "Preparación y operación",
    promesa: "Lo resolvemos antes y durante el evento.",
    reglas: [r(/visita preoperativa|venta de boleteria/, ["logistica"])],
  },

  /* Streaming (componentes antiguos y servicios personalizados de virtual/híbrido) */
  {
    grupo: "Streaming",
    nombre: "Tu plataforma de transmisión",
    promesa: "Tus asistentes entran a un solo lugar, sin caídas.",
    reglas: [r(/landing de transmision|canal dedicado|salas de streaming/)],
  },
  {
    grupo: "Streaming",
    nombre: "Producción en vivo",
    promesa: "Tu evento se ve y se escucha como una producción profesional.",
    reglas: [r(/master de transmision|^camaras|^sonido|personal soporte audiovisual|chroma key|pregrabados/)],
  },
  {
    grupo: "Streaming",
    nombre: "Alcance y accesibilidad",
    promesa: "Tu transmisión llega a más personas y a más idiomas.",
    reglas: [r(/retransmision a redes|traduccion simultanea|lenguaje de senas/)],
  },
  {
    grupo: "Streaming",
    nombre: "Preparación y pruebas",
    promesa: "Lo probamos todo antes del día del evento.",
    reglas: [r(/visita pre-?produccion|preproduccion remota|asesoria pre-?produccion/)],
  },
  {
    grupo: "Streaming",
    nombre: "Acompañamiento y entregables",
    promesa: "No estás solo durante el evento y te quedas con el material.",
    reglas: [
      r(/soporte tecnico \(streaming\)|entrega de material|informes \(streaming\)/),
      r(/^soporte tecnico$|^informes$/, ["componente"]),
    ],
  },

  /* Mundo virtual */
  {
    grupo: "Mundo virtual",
    nombre: "Infraestructura y transmisión",
    promesa: "Funciona el día del evento, con la carga real.",
    reglas: [r(/infraestructura \(cloud server\)|landing de transmision \(mundo virtual\)/)],
  },
  {
    grupo: "Mundo virtual",
    nombre: "Tu mundo virtual",
    promesa: "Un espacio 3D con la identidad de tu evento.",
    reglas: [r(/alcance global|construccion mundo virtual|experiencia de usuario/)],
  },
  {
    grupo: "Mundo virtual",
    nombre: "Interacción y patrocinadores",
    promesa: "Tus asistentes se conocen y tus aliados tienen dónde mostrarse.",
    reglas: [r(/interactividad|desarrollos, implementaciones/)],
  },
  {
    grupo: "Mundo virtual",
    nombre: "Condiciones de entrega",
    promesa: "Lo que hace falta para que el mundo virtual salga a tiempo.",
    reglas: [r(/tiempo de produccion|^material$|notas y no incluidos/)],
  },

  /* Servicios personalizados generales */
  {
    grupo: "Servicios personalizados",
    nombre: "Acompañamiento previo",
    promesa: "Reuniones con el productor para dejar todo claro antes.",
    reglas: [r(/asesoria pre-evento/, ["servicio"])],
  },
  {
    grupo: "Servicios personalizados",
    nombre: "Interacción en línea",
    promesa: "Tus asistentes conversan y se conectan durante el evento.",
    reglas: [r(/chat|salas de transmision|i-?frame de transmision/, ["servicio"])],
  },
  {
    grupo: "Servicios personalizados",
    nombre: "Registro y recaudo a la medida",
    promesa: "El registro y el pago adaptados a cómo vende tu evento.",
    reglas: [
      r(/formulario de registro|importacion de bases|iframe de registro|pasarela de pagos|transferencia de tarifa|proteccion de datos/, [
        "servicio",
      ]),
    ],
  },
  {
    grupo: "Servicios personalizados",
    nombre: "Acreditación y credenciales",
    promesa: "Credenciales y acceso listos para cada tipo de asistente.",
    reglas: [
      r(/pre acreditacion|escarapela|manillas|branding|pre-impresion|labels|venta de boleteria|capacitacion al staff/, [
        "servicio",
      ]),
    ],
  },
  {
    grupo: "Servicios personalizados",
    nombre: "Comunicación personalizada",
    promesa: "Mensajes a tus asistentes antes, durante y después del evento.",
    reglas: [r(/correos|whatsapp|sms|encuestas|certificados|notificaciones push|pixeles/, ["servicio"])],
  },
  {
    grupo: "Servicios personalizados",
    nombre: "Control y datos avanzados",
    promesa: "Más información de tu evento, en tiempo real y al final.",
    reglas: [
      r(/dashboard personalizado|informes finales|visitas a stands|beneficios asociados|sitios simultaneos|control (de )?suministro/, [
        "servicio",
      ]),
    ],
  },
  {
    grupo: "Servicios personalizados",
    nombre: "Conexión e infraestructura",
    promesa: "La capacidad y la conexión para soportar el evento.",
    reglas: [r(/cloud server|internet dedicado/, ["servicio"])],
  },
];

/** Dónde cae lo que no calza con ningún paquete, por familia. */
const OTROS: Record<Familia, { grupo: GrupoPaquetes; nombre: string; promesa: string }> = {
  componente: { grupo: "Plataforma base", nombre: "Otros componentes", promesa: "Componentes adicionales de la plataforma." },
  logistica: { grupo: "Logística 360", nombre: "Otros de logística", promesa: "Apoyo logístico adicional para tu evento." },
  servicio: { grupo: "Servicios personalizados", nombre: "Otros servicios", promesa: "Servicios adicionales para este evento." },
};

/** Minúsculas y sin tildes, para comparar nombres del catálogo. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nombre corto para una viñeta: quita lo que va entre paréntesis y lo que
 * sigue a una barra, y el "Módulo para ..." del principio. Si el comercial
 * editó el nombre a mano (lápiz), se respeta tal cual.
 */
export function nombreCorto(item: Pick<ItemParaPaquete, "name" | "baseName">): string {
  if (item.name !== item.baseName) return item.name;
  let s = item.baseName
    .replace(/\([^)]*\)/g, "")
    .split(" / ")[0]
    .replace(/^Módulo para (la |el )?(definición de |obtención de )?/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) s = item.baseName;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ubicar(item: ItemParaPaquete): { grupo: GrupoPaquetes; nombre: string; promesa: string } {
  const n = normalizar(item.baseName);
  for (const d of DEFINICIONES) {
    if (d.reglas.some((regla) => (!regla.familias || regla.familias.includes(item.familia)) && regla.patron.test(n))) {
      return { grupo: d.grupo, nombre: d.nombre, promesa: d.promesa };
    }
  }
  return OTROS[item.familia];
}

/** Agrupa los ítems marcados en paquetes, por grupo y en el orden del diseño. */
export function agruparEnPaquetes(items: ItemParaPaquete[]): PaquetesDeGrupo[] {
  const orden = new Map<string, number>();
  DEFINICIONES.forEach((d, i) => orden.set(`${d.grupo}|${d.nombre}`, i));
  (Object.values(OTROS) as { grupo: GrupoPaquetes; nombre: string }[]).forEach((o, i) =>
    orden.set(`${o.grupo}|${o.nombre}`, 1000 + i)
  );

  const porPaquete = new Map<string, { grupo: GrupoPaquetes; nombre: string; promesa: string; items: string[] }>();
  for (const item of items) {
    const u = ubicar(item);
    const key = `${u.grupo}|${u.nombre}`;
    const p = porPaquete.get(key) ?? { ...u, items: [] };
    const nombre = nombreCorto(item);
    if (!p.items.includes(nombre)) p.items.push(nombre);
    porPaquete.set(key, p);
  }

  const resultado: PaquetesDeGrupo[] = [];
  for (const grupo of GRUPOS_ORDEN) {
    const paquetes = Array.from(porPaquete.entries())
      .filter(([, p]) => p.grupo === grupo)
      .sort((a, b) => (orden.get(a[0]) ?? 0) - (orden.get(b[0]) ?? 0))
      .map(([, p]) => ({ nombre: p.nombre, promesa: p.promesa, items: p.items }));
    if (paquetes.length > 0) resultado.push({ grupo, paquetes });
  }
  return resultado;
}

/** Un paquete con muchos ítems ocupa el ancho completo de la lámina. */
export const ITEMS_POR_PAQUETE_ANCHO = 4;
const CAPACIDAD_POR_LAMINA = 4;
const MAX_ITEMS_VISIBLES = 12;

export function esPaqueteAncho(p: Paquete): boolean {
  return p.items.length > ITEMS_POR_PAQUETE_ANCHO;
}

/** Reparte los paquetes de un grupo en láminas: caben 4 "casillas" y un paquete ancho vale 2. */
export function repartirPaquetes(paquetes: Paquete[]): Paquete[][] {
  const laminas: Paquete[][] = [];
  let actual: Paquete[] = [];
  let peso = 0;
  for (const p of paquetes) {
    const w = esPaqueteAncho(p) ? 2 : 1;
    if (actual.length > 0 && peso + w > CAPACIDAD_POR_LAMINA) {
      laminas.push(actual);
      actual = [];
      peso = 0;
    }
    actual.push(p);
    peso += w;
  }
  if (actual.length > 0) laminas.push(actual);
  return laminas;
}

/** Ítems visibles de un paquete (el resto se resume como "+ N más"). */
export function itemsVisibles(p: Paquete): { visibles: string[]; ocultos: number } {
  const visibles = p.items.slice(0, MAX_ITEMS_VISIBLES);
  return { visibles, ocultos: p.items.length - visibles.length };
}

/** Los ítems del catálogo que no aplican a este evento (sin logística, o sin venta de boletas) no entran a los paquetes. */
export function itemCatalogoAplica(
  c: { name: string; category: string },
  p: { con_logistica?: boolean; vende_boletas?: boolean }
): boolean {
  if (c.category === "logistica_360" && p.con_logistica === false) return false;
  if (c.category === "componente_basico" && p.vende_boletas === false && normalizar(c.name).includes("venta de boleter")) return false;
  return true;
}
