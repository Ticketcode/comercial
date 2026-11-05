/**
 * Edición genérica de lo que vive en tablas propias de la propuesta: cronograma, modelo de pagos, requerimientos operativos,
 * conceptos del acuerdo comercial, componentes y logística del catálogo, campos del contrato y datos del cliente.
 *
 * Igual que el resto de lo que propone NOVA: aquí solo se valida y se calcula el efecto. Nada se escribe hasta que el asesor
 * acepta la tarjeta, y el servidor vuelve a validar cada cambio antes de escribirlo.
 */

export type Entidad = "cronograma" | "pagos" | "requerimientos" | "acuerdo" | "catalogo" | "contrato" | "cliente";
export type EntidadLista = "cronograma" | "pagos" | "requerimientos" | "acuerdo" | "catalogo";
export type Op = "crear" | "editar" | "borrar";
export type ValorEnt = string | number | boolean | null;
export type Fila = { id: string } & Record<string, ValorEnt>;

export interface DatosEnt {
  entidad: Entidad;
  op: Op;
  /** Fila afectada (las listas). En "crear" lo genera el servidor al validar, para poder deshacer. */
  id?: string;
  datos?: Record<string, ValorEnt>;
}

export interface EstadoExtra {
  listas: Record<EntidadLista, Fila[]>;
  /** Campos del contrato (vacío si el contrato aún no se ha creado). */
  contrato: Record<string, ValorEnt>;
  contratoExiste: boolean;
  /** Datos del cliente de la propuesta; null si no tiene cliente. */
  cliente: Record<string, ValorEnt> | null;
}

type TipoCampo = "texto" | "entero" | "numero" | "bool" | "fecha";
interface CampoSpec {
  etiqueta: string;
  tipo: TipoCampo;
  min?: number;
  max?: number;
  maxLen?: number;
  nullable?: boolean;
}
interface EntidadSpec {
  etiqueta: string;
  singular: boolean;
  ops: Op[];
  campos: Record<string, CampoSpec>;
  /** Campos que hay que dar al crear una fila. */
  requeridos: string[];
  nombreFila: (f: Record<string, ValorEnt>) => string;
}

const t = (etiqueta: string, maxLen: number, nullable = true): CampoSpec => ({ etiqueta, tipo: "texto", maxLen, nullable });
const f = (etiqueta: string): CampoSpec => ({ etiqueta, tipo: "fecha", nullable: true });

export const ESPEC: Record<Entidad, EntidadSpec> = {
  cronograma: {
    etiqueta: "Cronograma",
    singular: false,
    ops: ["crear", "editar", "borrar"],
    campos: {
      week_number: { etiqueta: "Semana", tipo: "entero", min: 1, max: 52 },
      day_number: { etiqueta: "Día", tipo: "entero", min: 1, max: 31, nullable: true },
      hito: t("Hito", 200, false),
      comentario: t("Comentario", 400),
    },
    requeridos: ["hito"],
    nombreFila: (r) => `S${r.week_number ?? "?"}${r.day_number ? ` D${r.day_number}` : ""} · ${r.hito ?? ""}`,
  },
  pagos: {
    etiqueta: "Modelo de pagos",
    singular: false,
    ops: ["crear", "editar", "borrar"],
    campos: {
      label: t("Hito de pago", 150, false),
      pct: { etiqueta: "Porcentaje", tipo: "numero", min: 0, max: 100 },
    },
    requeridos: ["label", "pct"],
    nombreFila: (r) => String(r.label ?? ""),
  },
  requerimientos: {
    etiqueta: "Requerimientos operativos",
    singular: false,
    ops: ["crear", "editar", "borrar"],
    campos: { text: t("Requerimiento", 500, false) },
    requeridos: ["text"],
    nombreFila: (r) => String(r.text ?? "").slice(0, 60),
  },
  acuerdo: {
    etiqueta: "Acuerdo comercial",
    singular: false,
    ops: ["editar"],
    campos: {
      included: { etiqueta: "Incluido", tipo: "bool" },
      pct: { etiqueta: "Peso dentro del acuerdo (%)", tipo: "numero", min: 0, max: 100 },
    },
    requeridos: [],
    nombreFila: (r) => String(r.label ?? ""),
  },
  catalogo: {
    etiqueta: "Componentes y logística",
    singular: false,
    ops: ["editar"],
    campos: {
      included: { etiqueta: "Incluido", tipo: "bool" },
      custom_name: t("Título", 120),
      custom_description: t("Descripción", 800),
    },
    requeridos: [],
    nombreFila: (r) => String(r.nombre ?? ""),
  },
  contrato: {
    etiqueta: "Contrato",
    singular: true,
    ops: ["editar"],
    campos: {
      contratante_nombre: t("Contratante", 120),
      contratante_cedula: t("Cédula del contratante", 40),
      contratante_cedula_ciudad: t("Ciudad de expedición de la cédula", 80),
      contratante_nit: t("NIT del contratante", 40),
      contratante_ciudad: t("Ciudad del contratante", 80),
      contratante_direccion: t("Dirección del contratante", 160),
      contratante_direccion_ciudad: t("Ciudad de la dirección", 80),
      contratante_representante_legal: t("Representante legal", 120),
      contrato_numero: t("Número de contrato", 40),
      contrato_fecha: f("Fecha del contrato"),
      objeto: t("Objeto", 2000),
      objeto_particular: t("Objeto particular", 2000),
      objeto_general: t("Objeto general (cláusula primera)", 4000),
      valor_total: { etiqueta: "Valor total", tipo: "numero", min: 0, max: 100000000000, nullable: true },
      ciudad_firma: t("Ciudad de firma", 80, false),
      fecha_firma: f("Fecha de firma"),
      plazo_inicio: f("Inicio del plazo"),
      plazo_fin: f("Fin del plazo"),
      tiempo_servicio_inicio: f("Inicio del servicio"),
      tiempo_servicio_fin: f("Fin del servicio"),
    },
    requeridos: [],
    nombreFila: () => "Contrato",
  },
  cliente: {
    etiqueta: "Cliente",
    singular: true,
    ops: ["editar"],
    campos: {
      name: t("Nombre del cliente", 120, false),
      company: t("Empresa", 120),
      nit: t("NIT", 40),
      city: t("Ciudad", 80),
      contact_name: t("Contacto: nombre", 120),
      contact_cargo: t("Contacto: cargo", 120),
      contact_email: t("Contacto: correo", 120),
      contact_phone: t("Contacto: teléfono", 40),
    },
    requeridos: [],
    nombreFila: (r) => String(r.name ?? "Cliente"),
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fechaValida(x: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const d = new Date(`${x}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}

function validarValor(c: CampoSpec, v: unknown): { ok: true; valor: ValorEnt } | { ok: false; motivo: string } {
  if (v === null) return c.nullable ? { ok: true, valor: null } : { ok: false, motivo: `${c.etiqueta} no puede quedar vacío` };
  switch (c.tipo) {
    case "texto": {
      if (typeof v !== "string") return { ok: false, motivo: `${c.etiqueta} debe ser texto` };
      const s = v.trim();
      if (s === "") return c.nullable ? { ok: true, valor: null } : { ok: false, motivo: `${c.etiqueta} no puede quedar vacío` };
      if (s.length > (c.maxLen ?? 200)) return { ok: false, motivo: `${c.etiqueta} es demasiado largo (máximo ${c.maxLen} caracteres)` };
      return { ok: true, valor: s };
    }
    case "entero":
      return typeof v === "number" && Number.isInteger(v) && v >= (c.min ?? -Infinity) && v <= (c.max ?? Infinity)
        ? { ok: true, valor: v }
        : { ok: false, motivo: `${c.etiqueta} debe ser un entero entre ${c.min} y ${c.max}` };
    case "numero":
      return typeof v === "number" && Number.isFinite(v) && v >= (c.min ?? -Infinity) && v <= (c.max ?? Infinity)
        ? { ok: true, valor: v }
        : { ok: false, motivo: `${c.etiqueta} debe estar entre ${c.min} y ${c.max}` };
    case "bool":
      return typeof v === "boolean" ? { ok: true, valor: v } : { ok: false, motivo: `${c.etiqueta} debe ser sí o no` };
    case "fecha": {
      if (typeof v !== "string") return { ok: false, motivo: `${c.etiqueta} debe ser una fecha AAAA-MM-DD` };
      if (v.trim() === "") return { ok: true, valor: null };
      return fechaValida(v.trim()) ? { ok: true, valor: v.trim() } : { ok: false, motivo: `${c.etiqueta} debe ser una fecha válida (AAAA-MM-DD)` };
    }
  }
}

/** Valida los datos de una operación: devuelve los valores limpios y lo que se descartó. */
function limpiarDatos(entidad: Entidad, datos: unknown): { datos: Record<string, ValorEnt>; motivos: string[] } {
  const spec = ESPEC[entidad];
  const out: Record<string, ValorEnt> = {};
  const motivos: string[] = [];
  if (!datos || typeof datos !== "object") return { datos: out, motivos };
  for (const [k, v] of Object.entries(datos as Record<string, unknown>)) {
    const c = spec.campos[k];
    if (!c) continue; // campos que no existen o que NOVA no puede tocar se ignoran
    const r = validarValor(c, v);
    if (!r.ok) {
      motivos.push(r.motivo);
      continue;
    }
    if (k === "contact_email" && r.valor && !EMAIL.test(String(r.valor))) {
      motivos.push("El correo no tiene un formato válido");
      continue;
    }
    out[k] = r.valor;
  }
  return { datos: out, motivos };
}

function nuevoUuid(): string {
  return globalThis.crypto.randomUUID();
}

function filaPor(extra: EstadoExtra, entidad: EntidadLista, id: unknown): Fila | undefined {
  return typeof id === "string" ? extra.listas[entidad].find((x) => x.id === id) : undefined;
}

/** Convierte lo que pidió NOVA ("edicion": [...]) en cambios validados. */
export function validarEdicion(
  crudo: unknown,
  extra: EstadoExtra
): { ents: DatosEnt[]; bloqueados: { etiqueta: string; motivo: string }[] } {
  const ents: DatosEnt[] = [];
  const bloqueados: { etiqueta: string; motivo: string }[] = [];
  if (!Array.isArray(crudo)) return { ents, bloqueados };

  for (const it of crudo.slice(0, 40)) {
    const o = it as { entidad?: unknown; op?: unknown; id?: unknown; datos?: unknown };
    const entidad = o?.entidad as Entidad;
    const spec = ESPEC[entidad];
    if (!spec) continue;
    const op = o.op as Op;
    if (!spec.ops.includes(op)) {
      bloqueados.push({ etiqueta: spec.etiqueta, motivo: `No se puede ${op === "crear" ? "agregar" : op === "borrar" ? "quitar" : "editar"} aquí` });
      continue;
    }

    if (spec.singular) {
      if (entidad === "cliente" && !extra.cliente) {
        bloqueados.push({ etiqueta: spec.etiqueta, motivo: "La propuesta no tiene un cliente asociado" });
        continue;
      }
      if (entidad === "contrato" && !extra.contratoExiste) {
        bloqueados.push({ etiqueta: spec.etiqueta, motivo: "El contrato aún no se ha creado: abre la pestaña «Envío y contrato» una vez" });
        continue;
      }
      const { datos, motivos } = limpiarDatos(entidad, o.datos);
      motivos.forEach((m) => bloqueados.push({ etiqueta: spec.etiqueta, motivo: m }));
      if (Object.keys(datos).length > 0) ents.push({ entidad, op: "editar", datos });
      continue;
    }

    const lista = entidad as EntidadLista;
    if (op === "crear") {
      const { datos, motivos } = limpiarDatos(entidad, o.datos);
      motivos.forEach((m) => bloqueados.push({ etiqueta: spec.etiqueta, motivo: m }));
      const falta = spec.requeridos.filter((k) => datos[k] === undefined || datos[k] === null);
      if (falta.length > 0) {
        bloqueados.push({ etiqueta: spec.etiqueta, motivo: `Falta ${falta.map((k) => spec.campos[k].etiqueta.toLowerCase()).join(" y ")}` });
        continue;
      }
      if (entidad === "cronograma" && datos.week_number === undefined) datos.week_number = 1;
      ents.push({ entidad, op: "crear", id: nuevoUuid(), datos });
      continue;
    }

    const fila = filaPor(extra, lista, o.id);
    if (!fila) {
      bloqueados.push({ etiqueta: spec.etiqueta, motivo: "No encontré esa fila" });
      continue;
    }
    if (op === "borrar") {
      ents.push({ entidad, op: "borrar", id: fila.id });
      continue;
    }
    const { datos, motivos } = limpiarDatos(entidad, o.datos);
    motivos.forEach((m) => bloqueados.push({ etiqueta: spec.etiqueta, motivo: m }));
    if (Object.keys(datos).length > 0) ents.push({ entidad, op: "editar", id: fila.id, datos });
  }
  return { ents, bloqueados };
}

/** Revalida un cambio recibido del navegador contra el estado actual (el cliente no es de fiar). */
export function validarAtomoEnt(ent: DatosEnt | undefined, extra: EstadoExtra | undefined): string | null {
  if (!ent || !extra) return "Este tipo de cambio no está disponible aquí";
  const spec = ESPEC[ent.entidad];
  if (!spec || !spec.ops.includes(ent.op)) return "Cambio no permitido";
  if (spec.singular) {
    if (ent.op !== "editar") return "Cambio no permitido";
    if (ent.entidad === "cliente" && !extra.cliente) return "La propuesta no tiene un cliente asociado";
    if (ent.entidad === "contrato" && !extra.contratoExiste) return "El contrato aún no se ha creado";
  } else {
    const lista = ent.entidad as EntidadLista;
    if (ent.op === "crear") {
      if (typeof ent.id !== "string" || !UUID.test(ent.id) || extra.listas[lista].some((x) => x.id === ent.id)) return "Identificador inválido";
    } else if (!filaPor(extra, lista, ent.id)) {
      return "Esa fila ya no existe";
    }
  }
  if (ent.op === "borrar") return null;
  const { datos, motivos } = limpiarDatos(ent.entidad, ent.datos);
  if (motivos.length > 0) return motivos[0];
  if (Object.keys(datos).length === 0) return "Cambio vacío";
  if (Object.keys(datos).length !== Object.keys(ent.datos ?? {}).length) return "Hay campos no permitidos";
  if (ent.op === "crear") {
    const falta = spec.requeridos.filter((k) => datos[k] === undefined || datos[k] === null);
    if (falta.length > 0) return `Falta ${falta.join(", ")}`;
  }
  return null;
}

/** Aplica el cambio en memoria (sin tocar la base). */
export function aplicarEnt(extra: EstadoExtra, ent: DatosEnt): EstadoExtra {
  const spec = ESPEC[ent.entidad];
  if (spec.singular) {
    if (ent.entidad === "contrato") return { ...extra, contrato: { ...extra.contrato, ...ent.datos } };
    return { ...extra, cliente: { ...(extra.cliente ?? {}), ...ent.datos } };
  }
  const lista = ent.entidad as EntidadLista;
  const actuales = extra.listas[lista];
  let siguientes: Fila[];
  if (ent.op === "crear") {
    const orden = actuales.reduce((m, x) => Math.max(m, Number(x.sort_order ?? 0)), -1) + 1;
    siguientes = [...actuales, { id: ent.id!, sort_order: orden, ...ent.datos } as Fila];
  } else if (ent.op === "borrar") {
    siguientes = actuales.filter((x) => x.id !== ent.id);
  } else {
    siguientes = actuales.map((x) => (x.id === ent.id ? ({ ...x, ...ent.datos } as Fila) : x));
  }
  return { ...extra, listas: { ...extra.listas, [lista]: siguientes } };
}

function valorActual(extra: EstadoExtra, ent: DatosEnt, k: string): ValorEnt {
  if (ent.entidad === "contrato") return extra.contrato[k] ?? null;
  if (ent.entidad === "cliente") return extra.cliente?.[k] ?? null;
  return filaPor(extra, ent.entidad as EntidadLista, ent.id)?.[k] ?? null;
}

/** Lo contrario del cambio: sirve para deshacer. */
export function antesEnt(extra: EstadoExtra, ent: DatosEnt): DatosEnt {
  if (ent.op === "crear") return { entidad: ent.entidad, op: "borrar", id: ent.id };
  if (ent.op === "borrar") {
    const fila = filaPor(extra, ent.entidad as EntidadLista, ent.id);
    const datos: Record<string, ValorEnt> = {};
    for (const k of Object.keys(ESPEC[ent.entidad].campos)) if (fila && fila[k] !== undefined) datos[k] = fila[k];
    return { entidad: ent.entidad, op: "crear", id: ent.id, datos };
  }
  const datos: Record<string, ValorEnt> = {};
  for (const k of Object.keys(ent.datos ?? {})) datos[k] = valorActual(extra, ent, k);
  return { entidad: ent.entidad, op: "editar", id: ent.id, datos };
}

const ver = (v: ValorEnt) => (v === null || v === "" ? "—" : typeof v === "boolean" ? (v ? "Sí" : "No") : String(v).length > 60 ? `${String(v).slice(0, 57)}…` : String(v));

/** Texto de la tarjeta: "Cronograma: agregar «S2 · Ensayo general»", "Contrato: Contratante: — → Mercado Libre". */
export function etiquetaEnt(extra: EstadoExtra, ent: DatosEnt): string {
  const spec = ESPEC[ent.entidad];
  if (ent.op === "crear") return `${spec.etiqueta}: agregar «${spec.nombreFila(ent.datos ?? {})}»`;
  if (ent.op === "borrar") {
    const fila = filaPor(extra, ent.entidad as EntidadLista, ent.id);
    return `${spec.etiqueta}: quitar «${fila ? spec.nombreFila(fila) : ""}»`;
  }
  const cambios = Object.entries(ent.datos ?? {})
    .filter(([k, v]) => (valorActual(extra, ent, k) ?? null) !== (v ?? null))
    .map(([k, v]) => `${spec.campos[k].etiqueta}: ${ver(valorActual(extra, ent, k))} → ${ver(v)}`);
  if (cambios.length === 0) return "";
  const quien = spec.singular ? "" : ` «${spec.nombreFila(filaPor(extra, ent.entidad as EntidadLista, ent.id) ?? {})}»`;
  return `${spec.etiqueta}${quien}: ${cambios.join(" · ")}`;
}

/** Nombres exactos de los campos que NOVA puede editar, para darle el catálogo en el prompt. */
export function camposEditables(entidad: Entidad): string {
  return Object.entries(ESPEC[entidad].campos)
    .map(([k, c]) => `${k} (${c.etiqueta}${c.tipo === "fecha" ? ", AAAA-MM-DD" : c.tipo === "bool" ? ", true/false" : ""})`)
    .join(", ");
}
