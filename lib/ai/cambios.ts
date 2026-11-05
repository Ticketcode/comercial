/**
 * Cambios que NOVA puede proponer sobre una propuesta.
 *
 * NOVA NUNCA escribe en la base: devuelve JSON, y este módulo lo valida
 * (lista cerrada de campos, rangos, reglas por modalidad), lo parte en
 * cambios sueltos ("átomos") y calcula cuánto mueve el precio. Solo cuando
 * el comercial acepta una tarjeta, el servidor aplica ese átomo — después de
 * volver a validarlo.
 */
import type { Proposal, ProposalCostItem, Modality } from "@/lib/types";
import { staffingForAforo, totalLogisticosSalones, type AforoScaleRow } from "@/lib/pricing/logistics";
import { SALONES_INTERNOS_SERVICE_LABEL, computedServiceQuantity } from "@/lib/pricing/service-quantity";
import { HIDEABLE_SLIDE_GROUPS } from "@/lib/data/laminas";
import { necesitaBoleteria, servicioDisponible } from "@/lib/data/servicios-alcance";
import { aplicarEnt, antesEnt, etiquetaEnt, validarAtomoEnt, validarEdicion, type DatosEnt, type EstadoExtra } from "@/lib/ai/entidades";

export type ValorCampo = number | string | boolean | number[] | string[] | null;

export interface Atomo {
  id: string;
  tipo: "campos" | "servicio" | "lamina" | "textoServicio" | "presentacion" | "entidad";
  /** Campos de `proposals` que cambian (tipo "campos"). */
  campos?: Record<string, ValorCampo>;
  /** Servicio personalizado por su nombre de catálogo (tipo "servicio"). */
  servicio?: { label: string; incluir: boolean; cantidad?: number };
  /** Lámina de la presentación (tipo "lamina"). */
  lamina?: { key: string; ocultar: boolean };
  /** Cambio en una tabla propia de la propuesta: cronograma, pagos, requerimientos, acuerdo, catálogo, contrato o cliente (tipo "entidad"). */
  ent?: DatosEnt;
  /** Dato de la presentación: asesor, contacto del cliente, textos de cierre o vigencia (tipo "presentacion"). null = vuelve al valor por defecto. */
  pres?: { campo: PresCampo; valor: string | number | null };
  /** Título y alcance con los que se muestra un servicio en la propuesta (tipo "textoServicio"). null = vuelve al texto del catálogo. */
  texto?: { label: string; titulo?: string | null; descripcion?: string | null };
}

/** Lo que NOVA puede pedir. Todo es opcional; lo que no esté aquí se ignora. */
export interface CambiosCrudos {
  nombre?: unknown;
  modalidad?: unknown;
  vendeBoletas?: unknown;
  conLogistica?: unknown;
  preacreditacion?: unknown;
  computadores?: unknown;
  impresoras?: unknown;
  presentacion?: unknown;
  edicion?: unknown;
  comisionDirectorPct?: unknown;
  comisionAsesorPct?: unknown;
  tasaConversionPct?: unknown;
  ivaPct?: unknown;
  baseGravable?: unknown;
  rollosLabels?: unknown;
  transporteAeropuerto?: unknown;
  cronogramaSemanas?: unknown;
  cronogramaDias?: unknown;
  impactosRegistro?: unknown;
  impactosAcreditacion?: unknown;
  informes?: unknown;
  informesPorDefecto?: unknown;
  acuerdoObjecion?: unknown;
  visitaPreoperativaDias?: unknown;
  extras?: unknown;
  serviciosCantidad?: unknown;
  textosServicios?: unknown;
  aforo?: unknown;
  aforoVirtual?: unknown;
  dias?: unknown;
  ciudad?: unknown;
  lugar?: unknown;
  salonesInternos?: unknown;
  fechaInicio?: unknown;
  fechaFin?: unknown;
  productor?: unknown;
  supervisores?: unknown;
  logisticos?: unknown;
  preacreditacionMedioDia?: unknown;
  rentabilidadPct?: unknown;
  descuentoPct?: unknown;
  serviciosAgregar?: unknown;
  serviciosQuitar?: unknown;
  ocultarLaminas?: unknown;
  mostrarLaminas?: unknown;
}

/** Datos de la presentación que NOVA puede editar. */
export type PresCampo =
  | "asesorNombre"
  | "asesorCargo"
  | "asesorCorreo"
  | "asesorTelefono"
  | "clienteNombre"
  | "clienteCargo"
  | "cierreEyebrow"
  | "cierreTitulo"
  | "cierreMensaje"
  | "vigenciaDias";

export const PRES_META: Record<PresCampo, { etiqueta: string; max: number }> = {
  asesorNombre: { etiqueta: "Asesor: nombre", max: 120 },
  asesorCargo: { etiqueta: "Asesor: cargo", max: 120 },
  asesorCorreo: { etiqueta: "Asesor: correo", max: 120 },
  asesorTelefono: { etiqueta: "Asesor: teléfono", max: 40 },
  clienteNombre: { etiqueta: "Contacto del cliente: nombre", max: 120 },
  clienteCargo: { etiqueta: "Contacto del cliente: cargo", max: 120 },
  cierreEyebrow: { etiqueta: "Cierre: encabezado", max: 60 },
  cierreTitulo: { etiqueta: "Cierre: título", max: 60 },
  cierreMensaje: { etiqueta: "Cierre: mensaje", max: 240 },
  vigenciaDias: { etiqueta: "Vigencia de la oferta (días)", max: 90 },
};

/** Columna de presentacion_contacto que corresponde a cada campo del asesor y del cierre. */
export const PRES_COLUMNA: Partial<Record<PresCampo, "full_name" | "cargo" | "correo" | "telefono" | "eyebrow" | "titulo" | "mensaje">> = {
  asesorNombre: "full_name",
  asesorCargo: "cargo",
  asesorCorreo: "correo",
  asesorTelefono: "telefono",
  cierreEyebrow: "eyebrow",
  cierreTitulo: "titulo",
  cierreMensaje: "mensaje",
};

export interface EstadoPropuesta {
  proposal: Proposal;
  /** Asesor dueño de la propuesta (sus datos se usan si no se editaron en la presentación). */
  owner?: { full_name: string | null; cargo: string | null; correo: string | null; telefono: string | null } | null;
  /** Listas, contrato y cliente completos. Solo se carga para el chat de NOVA. */
  extra?: EstadoExtra;
  /** Contacto del cliente (vive en la tabla de clientes). */
  cliente?: { id: string; contact_name: string | null; contact_cargo: string | null } | null;
  /** Servicios personalizados válidos de la propuesta (los mismos del Tarifario). */
  servicios: ProposalCostItem[];
  ocultas: string[];
}

export interface ContextoValidacion {
  aforoScales: AforoScaleRow[];
}

const num = (x: unknown, min: number, max: number): number | null =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? Math.round(x) : null;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function esFecha(x: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const d = new Date(`${x}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x && d.getUTCFullYear() >= 2024 && d.getUTCFullYear() <= 2100;
}

const usaPresencial = (m: Modality) => m === "presencial" || m === "hibrido";
const usaVirtual = (m: Modality) => m === "virtual" || m === "hibrido" || m === "mundo_virtual";

export const ETIQUETA_CAMPO: Record<string, string> = {
  event_name: "Nombre del evento",
  comision_director_pct: "Comisión del director comercial",
  comision_asesor_pct: "Comisión del asesor comercial",
  tasa_conversion_pct: "Tasa de conversión de asistencia",
  iva_rate_override: "IVA (manual)",
  base_gravable_override: "Base gravable (manual)",
  qty_transporte_aeropuerto: "Transportes aeropuerto",
  cronograma_semanas: "Semanas del cronograma",
  cronograma_dias: "Días del cronograma",
  impactos_registro: "Impactos de registro",
  impactos_acreditacion: "Impactos de acreditación",
  presentacion_informes: "Informes y entregables",
  acuerdo_objecion: "Objeción del cliente",
  visita_preoperativa_dias: "Días de visita preoperativa",
  extra_camisetas_staff: "Camisetas para el staff",
  extra_lavado_chalecos: "Lavado de chalecos",
  extra_compra_agua: "Compra de agua",
  extra_compra_bloqueador_solar: "Compra de bloqueador solar",
  extra_actividad_cierre: "Actividad de cierre",
  modality: "Modalidad",
  vende_boletas: "Vende boletas",
  con_logistica: "Con logística",
  aforo: "Aforo presencial",
  aforo_virtual: "Aforo virtual",
  dias: "Días",
  city: "Ciudad",
  lugar: "Lugar",
  salones_internos_aforos: "Salones internos (aforo de cada uno)",
  qty_logistica_salones_internos: "Logísticos de salones internos",
  event_start_date: "Fecha de inicio",
  event_end_date: "Fecha de fin",
  qty_productor: "Productores",
  qty_supervisor: "Supervisores",
  qty_logistico: "Logísticos",
  qty_computadores: "Portátiles",
  qty_impresoras: "Impresoras",
  qty_rollos_labels: "Rollos de labels",
  preacreditacion_medio_dia: "Pre-acreditación de medio día",
  rentabilidad_pct: "Rentabilidad",
  acuerdo_comercial_pct_global: "Descuento por acuerdo",
};

const MODALIDAD_ETIQUETA: Record<string, string> = { presencial: "Presencial", virtual: "Virtual", hibrido: "Híbrido", mundo_virtual: "Mundo virtual" };

export function formatearValor(campo: string, v: ValorCampo | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
  if (campo === "modality") return MODALIDAD_ETIQUETA[String(v)] ?? String(v);
  if (campo === "presentacion_informes" && Array.isArray(v)) return v.length ? `${v.length} ítems` : "ninguno";
  if (Array.isArray(v)) return v.length ? v.map((x) => Number(x).toLocaleString("es-CO")).join(", ") : "ninguno";
  if (["comision_director_pct", "comision_asesor_pct", "tasa_conversion_pct", "iva_rate_override"].includes(campo)) return `${Math.round(Number(v) * 1000) / 10}%`;
  if (campo === "base_gravable_override") return `$ ${Number(v).toLocaleString("es-CO")}`;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (campo === "rentabilidad_pct") return `${Math.round(Number(v) * 100)}%`;
  if (campo === "acuerdo_comercial_pct_global") return `${v}%`;
  return String(v);
}

let contador = 0;
const nuevoId = () => `a${Date.now().toString(36)}${(contador++).toString(36)}`;

export interface AtomoBloqueado {
  etiqueta: string;
  motivo: string;
}

export interface ResultadoValidacion {
  atomos: Atomo[];
  bloqueados: AtomoBloqueado[];
}

/** Valida lo que pidió NOVA y lo parte en cambios sueltos. */
export function validarCambios(
  crudos: CambiosCrudos | null | undefined,
  estado: EstadoPropuesta,
  ctx: ContextoValidacion
): ResultadoValidacion {
  const atomos: Atomo[] = [];
  const bloqueados: AtomoBloqueado[] = [];
  if (!crudos || typeof crudos !== "object") return { atomos, bloqueados };
  const { proposal } = estado;
  const MODOS: Modality[] = ["presencial", "virtual", "hibrido", "mundo_virtual"];
  const modoNuevo = MODOS.includes(crudos.modalidad as Modality) ? (crudos.modalidad as Modality) : null;
  // Lo demás se valida con la modalidad y los datos que quedarán después de este mismo cambio.
  const m = modoNuevo ?? proposal.modality;
  const conLogistica = typeof crudos.conLogistica === "boolean" ? crudos.conLogistica : proposal.con_logistica !== false;
  const vendeBoletas = typeof crudos.vendeBoletas === "boolean" ? crudos.vendeBoletas : proposal.vende_boletas !== false;
  const datosServicio = { modality: m, con_logistica: conLogistica, vende_boletas: vendeBoletas };
  const aforoNuevo = num(crudos.aforo, 1, 100000);
  const aforoParaTabla = aforoNuevo ?? Number(proposal.aforo ?? 0);

  const campo = (clave: string, valor: ValorCampo) => atomos.push({ id: nuevoId(), tipo: "campos", campos: { [clave]: valor } });
  const bloquear = (clave: string, motivo: string) => bloqueados.push({ etiqueta: ETIQUETA_CAMPO[clave] ?? clave, motivo });

  /** Dotación que propone la tabla de aforo (la misma del botón "Recalcular según aforo"). */
  const dotacion = (aforoBase: number): Record<string, ValorCampo> => {
    const dot = aforoBase > 0 ? staffingForAforo(aforoBase, ctx.aforoScales) : null;
    return dot
      ? {
          qty_logistico: dot.logistico,
          qty_supervisor: dot.supervisor,
          qty_productor: dot.productor,
          qty_computadores: dot.computadores,
          qty_impresoras: dot.impresoras,
          qty_rollos_labels: dot.rollos_labels,
        }
      : {};
  };
  const aplicarDotacion = () => {
    const d = dotacion(aforoParaTabla);
    if (Object.keys(d).length > 0) atomos.push({ id: nuevoId(), tipo: "campos", campos: d });
  };
  const quitarServicios = (predicado: (label: string) => boolean) => {
    for (const s of estado.servicios) {
      if (s.included && predicado(s.label)) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: s.label, incluir: false } });
    }
  };

  // Datos que definen qué lleva la propuesta: van primero para que lo demás use la modalidad y la logística nuevas.
  if (modoNuevo && modoNuevo !== proposal.modality) {
    campo("modality", modoNuevo);
    // Al pasar a un evento con operación en sitio, la IA calcula el equipo con la tabla de aforo.
    if (usaPresencial(modoNuevo) && !usaPresencial(proposal.modality) && conLogistica && aforoNuevo === null) aplicarDotacion();
  }
  if (typeof crudos.nombre === "string" && crudos.nombre.trim()) campo("event_name", crudos.nombre.trim().slice(0, 160));
  if (typeof crudos.vendeBoletas === "boolean") {
    campo("vende_boletas", crudos.vendeBoletas);
    if (!crudos.vendeBoletas) quitarServicios(necesitaBoleteria);
  }
  if (typeof crudos.conLogistica === "boolean") {
    if (usaPresencial(m)) {
      campo("con_logistica", crudos.conLogistica);
      if (crudos.conLogistica) {
        if (aforoNuevo === null) aplicarDotacion();
      } else {
        // Sin logística de Ticketcode el evento igual necesita esos servicios (se muestran con cantidades, sin costo);
        // lo único que se cobra es la capacitación al staff del organizador.
        const cap = estado.servicios.find((s) => norm(s.label).includes("capacitacion al staff"));
        if (cap && !cap.included) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: cap.label, incluir: true, cantidad: 1 } });
      }
    } else {
      bloquear("con_logistica", "No aplica a una modalidad sin evento presencial");
    }
  }

  // Aforo: en una modalidad solo virtual, el aforo que se pide es el virtual.
  const aforo = aforoNuevo;
  if (aforo !== null) {
    if (usaPresencial(m)) {
      const campos: Record<string, ValorCampo> = { aforo };
      // La dotación sale de la tabla de aforo, igual que el botón "Recalcular según aforo" del Tarifario.
      const dot = staffingForAforo(aforo, ctx.aforoScales);
      if (dot) {
        campos.qty_logistico = dot.logistico;
        campos.qty_supervisor = dot.supervisor;
        campos.qty_productor = dot.productor;
        campos.qty_computadores = dot.computadores;
        campos.qty_impresoras = dot.impresoras;
        campos.qty_rollos_labels = dot.rollos_labels;
      }
      atomos.push({ id: nuevoId(), tipo: "campos", campos });
    } else {
      campo("aforo_virtual", aforo);
    }
  }
  const aforoV = num(crudos.aforoVirtual, 1, 100000);
  if (aforoV !== null) {
    if (usaVirtual(m)) campo("aforo_virtual", aforoV);
    else bloquear("aforo_virtual", "Esta modalidad no tiene asistentes virtuales");
  }
  const dias = num(crudos.dias, 1, 30);
  if (dias !== null) campo("dias", dias);
  if (typeof crudos.ciudad === "string" && crudos.ciudad.trim()) campo("city", crudos.ciudad.trim().slice(0, 80));

  if (typeof crudos.lugar === "string" && crudos.lugar.trim()) campo("lugar", crudos.lugar.trim().slice(0, 160));
  for (const [raw, clave] of [[crudos.fechaInicio, "event_start_date"], [crudos.fechaFin, "event_end_date"]] as const) {
    if (typeof raw === "string" && esFecha(raw)) campo(clave, raw);
  }

  // Salones internos: aforo de cada uno. Define cuántos son, los logísticos que necesitan y el módulo de datos simultáneos.
  if (Array.isArray(crudos.salonesInternos)) {
    const aforos = crudos.salonesInternos
      .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 1 && x <= 100000)
      .map((x) => Math.round(x))
      .slice(0, 20);
    if (usaPresencial(m)) {
      atomos.push({
        id: nuevoId(),
        tipo: "campos",
        campos: { salones_internos_aforos: aforos, qty_logistica_salones_internos: totalLogisticosSalones(aforos) },
      });
      // Módulo de datos por salón: sin logística de Ticketcode queda en la propuesta con su cantidad, sin costo.
      const mod = estado.servicios.find((s) => s.label === SALONES_INTERNOS_SERVICE_LABEL);
      const incluirModulo = aforos.length > 0;
      if (mod && (incluirModulo || mod.included)) {
        atomos.push({
          id: nuevoId(),
          tipo: "servicio",
          servicio: { label: mod.label, incluir: incluirModulo, ...(incluirModulo ? { cantidad: aforos.length } : {}) },
        });
      }
    } else {
      bloqueados.push({ etiqueta: "Salones internos", motivo: "No aplica a una modalidad sin evento presencial" });
    }
  }

  const equipo: [unknown, string, number][] = [
    [crudos.productor, "qty_productor", 10],
    [crudos.supervisores, "qty_supervisor", 20],
    [crudos.logisticos, "qty_logistico", 100],
    [crudos.computadores, "qty_computadores", 200],
    [crudos.impresoras, "qty_impresoras", 200],
  ];
  for (const [raw, clave, max] of equipo) {
    const v = num(raw, 0, max);
    if (v === null) continue;
    if (usaPresencial(m)) campo(clave, v);
    else bloquear(clave, "No aplica a una modalidad sin evento presencial");
  }
  if (typeof crudos.preacreditacionMedioDia === "boolean") {
    if (usaPresencial(m)) campo("preacreditacion_medio_dia", crudos.preacreditacionMedioDia);
    else bloquear("preacreditacion_medio_dia", "No aplica a una modalidad sin evento presencial");
  }
  // Pre-acreditación: no, día completo o medio día, y cuántos días (el módulo se cobra por día).
  if (crudos.preacreditacion && typeof crudos.preacreditacion === "object") {
    const pre = crudos.preacreditacion as { modo?: unknown; dias?: unknown };
    const diasPre = num(pre.dias, 1, 10) ?? 1;
    if (!usaPresencial(m)) {
      bloquear("preacreditacion_medio_dia", "No aplica a una modalidad sin evento presencial");
    } else if (pre.modo === "no") {
      campo("preacreditacion_medio_dia", false);
      quitarServicios((l) => norm(l).includes("pre acreditacion"));
    } else if (pre.modo === "completo" || pre.modo === "medio") {
      campo("preacreditacion_medio_dia", pre.modo === "medio");
      const modulo = estado.servicios.find((x) => norm(x.label).includes("pre acreditacion"));
      if (modulo) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: modulo.label, incluir: true, cantidad: diasPre } });
    }
  }

  const rent = num(crudos.rentabilidadPct, 0, 100);
  if (rent !== null) campo("rentabilidad_pct", rent / 100);
  const desc = num(crudos.descuentoPct, 0, 35);
  if (desc !== null) campo("acuerdo_comercial_pct_global", desc);

  // Servicios: solo los del catálogo de esta propuesta, por nombre exacto o una coincidencia única.
  const buscarServicio = (nombre: unknown) => {
    if (typeof nombre !== "string" || !nombre.trim()) return null;
    const n = norm(nombre);
    const exacto = estado.servicios.find((s) => norm(s.label) === n);
    if (exacto) return exacto;
    const parciales = estado.servicios.filter((s) => norm(s.label).includes(n));
    return parciales.length === 1 ? parciales[0] : null;
  };
  const lista = (x: unknown) => (Array.isArray(x) ? x.slice(0, 20) : []);
  for (const nombre of lista(crudos.serviciosAgregar)) {
    const s = buscarServicio(nombre);
    if (!s) bloqueados.push({ etiqueta: String(nombre).slice(0, 80), motivo: "No está en el catálogo de esta modalidad" });
    else if (!servicioDisponible(s.label, datosServicio)) bloqueados.push({ etiqueta: s.label, motivo: "No aplica a este evento (modalidad, logística o venta de boletas)" });
    else if (!s.included) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: s.label, incluir: true } });
  }
  for (const nombre of lista(crudos.serviciosQuitar)) {
    const s = buscarServicio(nombre);
    if (s?.included) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: s.label, incluir: false } });
  }

  // Números del cálculo (comisiones, IVA, conversión), del cronograma y de la presentación.
  const pct = (x: unknown, max: number) => {
    const n = typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? x : null;
    return n === null ? null : Math.round(n * 10) / 1000;
  };
  const dirPct = pct(crudos.comisionDirectorPct, 30);
  if (dirPct !== null) campo("comision_director_pct", dirPct);
  const asePct = pct(crudos.comisionAsesorPct, 30);
  if (asePct !== null) campo("comision_asesor_pct", asePct);
  const tasa = pct(crudos.tasaConversionPct, 100);
  if (tasa !== null) campo("tasa_conversion_pct", tasa);
  if (crudos.ivaPct === "defecto") campo("iva_rate_override", null);
  else if (pct(crudos.ivaPct, 30) !== null) campo("iva_rate_override", pct(crudos.ivaPct, 30)!);
  if (crudos.baseGravable === "defecto") campo("base_gravable_override", null);
  else if (typeof crudos.baseGravable === "number" && Number.isFinite(crudos.baseGravable) && crudos.baseGravable >= 0 && crudos.baseGravable <= 1e11) campo("base_gravable_override", Math.round(crudos.baseGravable));
  const rollos = num(crudos.rollosLabels, 0, 500);
  if (rollos !== null) {
    if (usaPresencial(m)) campo("qty_rollos_labels", rollos);
    else bloquear("qty_rollos_labels", "No aplica a una modalidad sin evento presencial");
  }
  const aero = num(crudos.transporteAeropuerto, 0, 50);
  if (aero !== null) {
    if (usaPresencial(m)) campo("qty_transporte_aeropuerto", aero);
    else bloquear("qty_transporte_aeropuerto", "No aplica a una modalidad sin evento presencial");
  }
  const semanas = num(crudos.cronogramaSemanas, 1, 52);
  if (semanas !== null) campo("cronograma_semanas", semanas);
  const diasCron = num(crudos.cronogramaDias, 1, 31);
  if (diasCron !== null) campo("cronograma_dias", diasCron);
  const imReg = num(crudos.impactosRegistro, 0, 1e9);
  if (imReg !== null) campo("impactos_registro", imReg);
  const imAcr = num(crudos.impactosAcreditacion, 0, 1e9);
  if (imAcr !== null) campo("impactos_acreditacion", imAcr);
  if (Array.isArray(crudos.informes)) {
    const lista = crudos.informes.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 200)).filter(Boolean).slice(0, 20);
    if (lista.length > 0) campo("presentacion_informes", lista);
  } else if (crudos.informesPorDefecto === true) {
    campo("presentacion_informes", null);
  }
  if (typeof crudos.acuerdoObjecion === "string") campo("acuerdo_objecion", crudos.acuerdoObjecion.trim().slice(0, 4000) || null);

  // Tablas propias de la propuesta: cronograma, pagos, requerimientos, acuerdo, catálogo, contrato y cliente.
  if (crudos.edicion !== undefined) {
    if (!estado.extra) {
      bloqueados.push({ etiqueta: "Edición", motivo: "No disponible en este momento" });
    } else {
      const r = validarEdicion(crudos.edicion, estado.extra);
      r.ents.forEach((ent) => atomos.push({ id: nuevoId(), tipo: "entidad", ent }));
      bloqueados.push(...r.bloqueados);
    }
  }

  // Visita preoperativa y extras de logística (camisetas, chalecos, agua, bloqueador, actividad de cierre).
  const visita = num(crudos.visitaPreoperativaDias, 0, 10);
  if (visita !== null) {
    if (usaPresencial(m)) campo("visita_preoperativa_dias", visita);
    else bloquear("visita_preoperativa_dias", "No aplica a una modalidad sin evento presencial");
  }
  if (crudos.extras && typeof crudos.extras === "object") {
    const ex = crudos.extras as Record<string, unknown>;
    const claves: [string, string][] = [
      ["camisetas", "extra_camisetas_staff"],
      ["chalecos", "extra_lavado_chalecos"],
      ["agua", "extra_compra_agua"],
      ["bloqueador", "extra_compra_bloqueador_solar"],
      ["cierre", "extra_actividad_cierre"],
    ];
    for (const [k, columna] of claves) {
      if (typeof ex[k] !== "boolean") continue;
      if (usaPresencial(m)) campo(columna, ex[k] as boolean);
      else bloquear(columna, "No aplica a una modalidad sin evento presencial");
    }
  }

  // Cantidad de un servicio (los que se calculan solos con el aforo, o con la pre-acreditación o los salones, no se tocan aquí).
  for (const it of lista(crudos.serviciosCantidad)) {
    const o = it as { nombre?: unknown; cantidad?: unknown };
    const s = buscarServicio(o?.nombre);
    const c = num(o?.cantidad, 1, 100000);
    if (!s || c === null) continue;
    if (!servicioDisponible(s.label, datosServicio)) {
      bloqueados.push({ etiqueta: s.label, motivo: "No aplica a este evento" });
    } else if (computedServiceQuantity(s.label, proposal) !== null) {
      bloqueados.push({ etiqueta: s.label, motivo: "Su cantidad se calcula sola con el aforo y los días" });
    } else if (norm(s.label).includes("pre acreditacion") || s.label === SALONES_INTERNOS_SERVICE_LABEL) {
      bloqueados.push({ etiqueta: s.label, motivo: "Su cantidad sale de los días de pre-acreditación o de los salones internos" });
    } else {
      atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: s.label, incluir: true, cantidad: c } });
    }
  }

  // Título y alcance (descripción) con los que aparece cada servicio en la propuesta y la presentación.
  for (const it of lista(crudos.textosServicios)) {
    const o = it as { nombre?: unknown; titulo?: unknown; descripcion?: unknown };
    const s = buscarServicio(o?.nombre);
    if (!s) continue;
    const titulo = typeof o.titulo === "string" ? o.titulo.trim().slice(0, 120) : undefined;
    const descripcion = typeof o.descripcion === "string" ? o.descripcion.trim().slice(0, 800) : undefined;
    if (titulo === undefined && descripcion === undefined) continue;
    atomos.push({
      id: nuevoId(),
      tipo: "textoServicio",
      texto: { label: s.label, ...(titulo !== undefined ? { titulo: titulo || null } : {}), ...(descripcion !== undefined ? { descripcion: descripcion || null } : {}) },
    });
  }

  // Datos de la presentación: asesor, contacto del cliente, textos de cierre y vigencia de la oferta.
  if (crudos.presentacion && typeof crudos.presentacion === "object") {
    const pr = crudos.presentacion as Record<string, unknown>;
    for (const campoPres of Object.keys(PRES_META) as PresCampo[]) {
      const v = pr[campoPres];
      if (v === undefined || v === null) continue;
      if (campoPres === "vigenciaDias") {
        const d = num(v, 1, 90);
        if (d !== null) atomos.push({ id: nuevoId(), tipo: "presentacion", pres: { campo: campoPres, valor: d } });
        continue;
      }
      if (typeof v !== "string") continue;
      const texto = v.trim().slice(0, PRES_META[campoPres].max);
      if (campoPres === "asesorCorreo" && texto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
        bloqueados.push({ etiqueta: PRES_META[campoPres].etiqueta, motivo: "El correo no tiene un formato válido" });
        continue;
      }
      if ((campoPres === "clienteNombre" || campoPres === "clienteCargo") && !estado.cliente) {
        bloqueados.push({ etiqueta: PRES_META[campoPres].etiqueta, motivo: "La propuesta no tiene un cliente asociado" });
        continue;
      }
      // Vacío en los textos de cierre = volver al texto por defecto.
      atomos.push({ id: nuevoId(), tipo: "presentacion", pres: { campo: campoPres, valor: texto === "" ? null : texto } });
    }
  }

  // Láminas de la presentación.
  const buscarLamina = (nombre: unknown) => {
    if (typeof nombre !== "string" || !nombre.trim()) return null;
    const n = norm(nombre);
    return (
      HIDEABLE_SLIDE_GROUPS.find((g) => g.key === n || norm(g.label) === n) ??
      HIDEABLE_SLIDE_GROUPS.find((g) => norm(g.label).includes(n)) ??
      null
    );
  };
  for (const nombre of lista(crudos.ocultarLaminas)) {
    const g = buscarLamina(nombre);
    if (g && !estado.ocultas.includes(g.key)) atomos.push({ id: nuevoId(), tipo: "lamina", lamina: { key: g.key, ocultar: true } });
  }
  for (const nombre of lista(crudos.mostrarLaminas)) {
    const g = buscarLamina(nombre);
    if (g && estado.ocultas.includes(g.key)) atomos.push({ id: nuevoId(), tipo: "lamina", lamina: { key: g.key, ocultar: false } });
  }

  return { atomos, bloqueados };
}

/** Revalida un átomo recibido del navegador contra el estado actual (el cliente no es de fiar). */
export function validarAtomo(atomo: Atomo, estado: EstadoPropuesta): string | null {
  const m = estado.proposal.modality;
  if (atomo.tipo === "campos") {
    const campos = atomo.campos ?? {};
    for (const [k, v] of Object.entries(campos)) {
      const regla = REGLAS_CAMPO[k];
      if (!regla) return `Campo no permitido: ${k}`;
      if (!regla.valida(v)) return `Valor fuera de rango en ${ETIQUETA_CAMPO[k] ?? k}`;
      if (regla.presencial && !usaPresencial(m)) return `${ETIQUETA_CAMPO[k]} no aplica a esta modalidad`;
      if (k === "aforo_virtual" && !usaVirtual(m)) return "Esta modalidad no tiene asistentes virtuales";
    }
    return Object.keys(campos).length ? null : "Cambio vacío";
  }
  if (atomo.tipo === "servicio") {
    const s = estado.servicios.find((x) => x.label === atomo.servicio?.label);
    if (!s) return "Servicio no disponible en esta propuesta";
    if (atomo.servicio?.incluir && !s.included && !servicioDisponible(s.label, estado.proposal)) return "Ese servicio no aplica a este evento";
    const c = atomo.servicio?.cantidad;
    if (c !== undefined && !(Number.isInteger(c) && c >= 0 && c <= 100000)) return "Cantidad fuera de rango";
    return null;
  }
  if (atomo.tipo === "entidad") return validarAtomoEnt(atomo.ent, estado.extra);
  if (atomo.tipo === "presentacion") {
    const p = atomo.pres;
    if (!p || !(p.campo in PRES_META)) return "Dato de presentación desconocido";
    if (p.campo === "vigenciaDias") return typeof p.valor === "number" && Number.isInteger(p.valor) && p.valor >= 1 && p.valor <= 90 ? null : "La vigencia debe estar entre 1 y 90 días";
    if (p.valor !== null && (typeof p.valor !== "string" || p.valor.length > PRES_META[p.campo].max)) return "Texto demasiado largo";
    if ((p.campo === "clienteNombre" || p.campo === "clienteCargo") && !estado.cliente) return "La propuesta no tiene un cliente asociado";
    return null;
  }
  if (atomo.tipo === "textoServicio") {
    const t = atomo.texto;
    if (!t || !estado.servicios.some((x) => x.label === t.label)) return "Servicio no disponible en esta propuesta";
    if ((t.titulo ?? "").length > 120 || (t.descripcion ?? "").length > 800) return "Texto demasiado largo";
    return t.titulo === undefined && t.descripcion === undefined ? "Cambio vacío" : null;
  }
  if (atomo.tipo === "lamina") {
    return HIDEABLE_SLIDE_GROUPS.some((g) => g.key === atomo.lamina?.key) ? null : "Lámina desconocida";
  }
  return "Tipo de cambio desconocido";
}

const esNum = (min: number, max: number) => (v: ValorCampo) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const REGLAS_CAMPO: Record<string, { valida: (v: ValorCampo) => boolean; presencial?: boolean }> = {
  event_name: { valida: (v) => typeof v === "string" && v.length > 0 && v.length <= 160 },
  comision_director_pct: { valida: esNum(0, 0.3) },
  comision_asesor_pct: { valida: esNum(0, 0.3) },
  tasa_conversion_pct: { valida: esNum(0, 1) },
  iva_rate_override: { valida: (v) => v === null || esNum(0, 0.3)(v) },
  base_gravable_override: { valida: (v) => v === null || esNum(0, 1e11)(v) },
  qty_transporte_aeropuerto: { valida: esNum(0, 50), presencial: true },
  cronograma_semanas: { valida: (v) => v === null || (esNum(1, 52)(v) && Number.isInteger(v)) },
  cronograma_dias: { valida: (v) => v === null || (esNum(1, 31)(v) && Number.isInteger(v)) },
  impactos_registro: { valida: (v) => v === null || (esNum(0, 1e9)(v) && Number.isInteger(v)) },
  impactos_acreditacion: { valida: (v) => v === null || (esNum(0, 1e9)(v) && Number.isInteger(v)) },
  presentacion_informes: { valida: (v) => v === null || (Array.isArray(v) && v.length <= 20 && (v as unknown[]).every((x) => typeof x === "string" && x.length > 0 && x.length <= 200)) },
  acuerdo_objecion: { valida: (v) => v === null || (typeof v === "string" && v.length <= 4000) },
  visita_preoperativa_dias: { valida: esNum(0, 10), presencial: true },
  extra_camisetas_staff: { valida: (v) => typeof v === "boolean", presencial: true },
  extra_lavado_chalecos: { valida: (v) => typeof v === "boolean", presencial: true },
  extra_compra_agua: { valida: (v) => typeof v === "boolean", presencial: true },
  extra_compra_bloqueador_solar: { valida: (v) => typeof v === "boolean", presencial: true },
  extra_actividad_cierre: { valida: (v) => typeof v === "boolean", presencial: true },
  modality: { valida: (v) => v === "presencial" || v === "virtual" || v === "hibrido" || v === "mundo_virtual" },
  vende_boletas: { valida: (v) => typeof v === "boolean" },
  con_logistica: { valida: (v) => typeof v === "boolean", presencial: true },
  salones_internos_aforos: {
    valida: (v) => Array.isArray(v) && v.length <= 20 && (v as number[]).every((x) => Number.isInteger(x) && x >= 1 && x <= 100000),
    presencial: true,
  },
  qty_logistica_salones_internos: { valida: esNum(0, 400), presencial: true },
  aforo: { valida: esNum(1, 100000), presencial: true },
  aforo_virtual: { valida: esNum(1, 100000) },
  dias: { valida: esNum(1, 30) },
  city: { valida: (v) => v === null || (typeof v === "string" && v.length > 0 && v.length <= 80) },
  lugar: { valida: (v) => v === null || (typeof v === "string" && v.length > 0 && v.length <= 160) },
  event_start_date: { valida: (v) => v === null || (typeof v === "string" && esFecha(v)) },
  event_end_date: { valida: (v) => v === null || (typeof v === "string" && esFecha(v)) },
  qty_productor: { valida: esNum(0, 10), presencial: true },
  qty_supervisor: { valida: esNum(0, 20), presencial: true },
  qty_logistico: { valida: esNum(0, 100), presencial: true },
  qty_computadores: { valida: esNum(0, 200), presencial: true },
  qty_impresoras: { valida: esNum(0, 200), presencial: true },
  qty_rollos_labels: { valida: esNum(0, 500), presencial: true },
  preacreditacion_medio_dia: { valida: (v) => typeof v === "boolean", presencial: true },
  rentabilidad_pct: { valida: esNum(0, 1) },
  acuerdo_comercial_pct_global: { valida: esNum(0, 35) },
};

/** Aplica un átomo en memoria (sin tocar la base) para poder calcular el precio antes y después. */
export function aplicarEnMemoria(estado: EstadoPropuesta, atomo: Atomo): EstadoPropuesta {
  if (atomo.tipo === "campos") {
    return { ...estado, proposal: { ...estado.proposal, ...(atomo.campos as Partial<Proposal>) } };
  }
  if (atomo.tipo === "servicio" && atomo.servicio) {
    const { label, incluir } = atomo.servicio;
    const { cantidad } = atomo.servicio;
    return {
      ...estado,
      servicios: estado.servicios.map((s) =>
        s.label === label ? { ...s, included: incluir, ...(cantidad !== undefined ? { quantity: cantidad } : {}) } : s
      ),
    };
  }
  if (atomo.tipo === "entidad" && atomo.ent && estado.extra) {
    return { ...estado, extra: aplicarEnt(estado.extra, atomo.ent) };
  }
  if (atomo.tipo === "presentacion" && atomo.pres) {
    const { campo, valor } = atomo.pres;
    if (campo === "vigenciaDias") return { ...estado, proposal: { ...estado.proposal, vigencia_dias: Number(valor) } };
    if (campo === "clienteNombre" || campo === "clienteCargo") {
      if (!estado.cliente) return estado;
      const col = campo === "clienteNombre" ? "contact_name" : "contact_cargo";
      return { ...estado, cliente: { ...estado.cliente, [col]: valor as string | null } };
    }
    const col = PRES_COLUMNA[campo]!;
    const base = estado.proposal.presentacion_contacto ?? {
      full_name: estado.owner?.full_name ?? null,
      cargo: estado.owner?.cargo ?? null,
      correo: estado.owner?.correo ?? null,
      telefono: estado.owner?.telefono ?? null,
    };
    return { ...estado, proposal: { ...estado.proposal, presentacion_contacto: { ...base, [col]: valor as string | null } } };
  }
  if (atomo.tipo === "textoServicio" && atomo.texto) {
    const t = atomo.texto;
    return {
      ...estado,
      servicios: estado.servicios.map((s) =>
        s.label === t.label
          ? { ...s, ...(t.titulo !== undefined ? { custom_name: t.titulo } : {}), ...(t.descripcion !== undefined ? { custom_description: t.descripcion } : {}) }
          : s
      ),
    };
  }
  if (atomo.tipo === "lamina" && atomo.lamina) {
    const { key, ocultar } = atomo.lamina;
    const sin = estado.ocultas.filter((k) => k !== key);
    return { ...estado, ocultas: ocultar ? [...sin, key] : sin };
  }
  return estado;
}

/** Valores actuales de lo que el átomo va a cambiar (sirve para mostrar "antes → después" y para deshacer). */
export function valoresAntes(estado: EstadoPropuesta, atomo: Atomo): Atomo {
  if (atomo.tipo === "campos") {
    const antes: Record<string, ValorCampo> = {};
    for (const k of Object.keys(atomo.campos ?? {})) {
      const v = (estado.proposal as unknown as Record<string, ValorCampo | null>)[k];
      antes[k] =
        v ??
        (k === "salones_internos_aforos"
          ? []
          : ["city", "lugar", "event_start_date", "event_end_date", "iva_rate_override", "base_gravable_override", "cronograma_semanas", "cronograma_dias", "impactos_registro", "impactos_acreditacion", "presentacion_informes", "acuerdo_objecion"].includes(k)
            ? null
            : k === "con_logistica" || k === "vende_boletas"
              ? true
              : 0);
    }
    return { ...atomo, id: nuevoId(), campos: antes };
  }
  if (atomo.tipo === "servicio" && atomo.servicio) {
    const s = estado.servicios.find((x) => x.label === atomo.servicio!.label);
    return {
      ...atomo,
      id: nuevoId(),
      servicio: { label: atomo.servicio.label, incluir: !!s?.included, ...(atomo.servicio.cantidad !== undefined ? { cantidad: Number(s?.quantity ?? 0) } : {}) },
    };
  }
  if (atomo.tipo === "entidad" && atomo.ent && estado.extra) {
    return { ...atomo, id: nuevoId(), ent: antesEnt(estado.extra, atomo.ent) };
  }
  if (atomo.tipo === "presentacion" && atomo.pres) {
    return { ...atomo, id: nuevoId(), pres: { campo: atomo.pres.campo, valor: valorPresentacion(estado, atomo.pres.campo) } };
  }
  if (atomo.tipo === "textoServicio" && atomo.texto) {
    const s = estado.servicios.find((x) => x.label === atomo.texto!.label);
    return {
      ...atomo,
      id: nuevoId(),
      texto: {
        label: atomo.texto.label,
        ...(atomo.texto.titulo !== undefined ? { titulo: s?.custom_name ?? null } : {}),
        ...(atomo.texto.descripcion !== undefined ? { descripcion: s?.custom_description ?? null } : {}),
      },
    };
  }
  if (atomo.tipo === "lamina" && atomo.lamina) {
    return { ...atomo, id: nuevoId(), lamina: { key: atomo.lamina.key, ocultar: estado.ocultas.includes(atomo.lamina.key) } };
  }
  return atomo;
}

/** Texto de una tarjeta: "Aforo: 1000 → 1200 · Logísticos: 7 → 9". */
export function etiquetaAtomo(estado: EstadoPropuesta, atomo: Atomo): string {
  if (atomo.tipo === "campos") {
    const p = estado.proposal as unknown as Record<string, ValorCampo | null>;
    return Object.entries(atomo.campos ?? {})
      .filter(([k, v]) => JSON.stringify(p[k] ?? null) !== JSON.stringify(v))
      .map(([k, v]) => `${ETIQUETA_CAMPO[k] ?? k}: ${formatearValor(k, p[k] ?? undefined)} → ${formatearValor(k, v)}`)
      .join(" · ");
  }
  if (atomo.tipo === "servicio" && atomo.servicio) {
    const s = estado.servicios.find((x) => x.label === atomo.servicio!.label);
    const c = atomo.servicio.cantidad;
    if (s?.included && atomo.servicio.incluir && c !== undefined) return `${atomo.servicio.label}: cantidad ${Number(s.quantity)} → ${c}`;
    return `${atomo.servicio.incluir ? "Agregar" : "Quitar"} servicio: ${atomo.servicio.label}${c !== undefined && atomo.servicio.incluir ? ` × ${c}` : ""}`;
  }
  if (atomo.tipo === "entidad" && atomo.ent && estado.extra) return etiquetaEnt(estado.extra, atomo.ent);
  if (atomo.tipo === "presentacion" && atomo.pres) {
    const { campo, valor } = atomo.pres;
    const antes = valorPresentacion(estado, campo);
    if ((antes ?? null) === (valor ?? null)) return "";
    const ver = (x: string | number | null) => (x === null || x === "" ? "(por defecto)" : String(x));
    return `${PRES_META[campo].etiqueta}: ${ver(antes)} → ${ver(valor)}`;
  }
  if (atomo.tipo === "textoServicio" && atomo.texto) {
    const t = atomo.texto;
    const s = estado.servicios.find((x) => x.label === t.label);
    const partes = [
      t.titulo !== undefined ? `título «${t.titulo ?? s?.label ?? ""}»` : null,
      t.descripcion !== undefined ? "alcance actualizado" : null,
    ].filter(Boolean);
    const igual = (t.titulo === undefined || (t.titulo ?? "") === (s?.custom_name ?? "")) && (t.descripcion === undefined || (t.descripcion ?? "") === (s?.custom_description ?? ""));
    return igual ? "" : `Texto de «${s?.label ?? t.label}»: ${partes.join(" y ")}`;
  }
  if (atomo.tipo === "lamina" && atomo.lamina) {
    const g = HIDEABLE_SLIDE_GROUPS.find((x) => x.key === atomo.lamina!.key);
    return `${atomo.lamina.ocultar ? "Ocultar" : "Mostrar"} lámina: ${g?.label ?? atomo.lamina.key}`;
  }
  return "Cambio";
}

/** Preguntas del Diagnóstico guiado a las que corresponde cada pregunta. */
export const PREGUNTAS_DIAGNOSTICO = ["evento", "equipo", "puntos", "pre", "cred"] as const;
export type PreguntaDiagnostico = (typeof PREGUNTAS_DIAGNOSTICO)[number];

const CAMPO_A_PREGUNTA: Record<string, PreguntaDiagnostico> = {
  aforo: "evento",
  aforo_virtual: "evento",
  dias: "evento",
  city: "evento",
  qty_productor: "equipo",
  qty_supervisor: "equipo",
  qty_logistico: "equipo",
  preacreditacion_medio_dia: "pre",
};
const SERVICIO_A_PREGUNTA: [string, PreguntaDiagnostico][] = [
  ["pre acreditacion", "pre"],
  ["venta de boleteria en sitio", "puntos"],
  ["manillas", "cred"],
  ["escarapelas fisicas", "cred"],
];

/** A qué preguntas del diagnóstico responde un cambio (para marcarlas como contestadas por NOVA). */
export function preguntasDeAtomo(atomo: Atomo): PreguntaDiagnostico[] {
  const out = new Set<PreguntaDiagnostico>();
  if (atomo.tipo === "campos") {
    for (const k of Object.keys(atomo.campos ?? {})) {
      const q = CAMPO_A_PREGUNTA[k];
      if (q) out.add(q);
    }
  } else if (atomo.tipo === "servicio" && atomo.servicio) {
    const n = norm(atomo.servicio.label);
    for (const [frase, q] of SERVICIO_A_PREGUNTA) if (n.includes(frase)) out.add(q);
  }
  return Array.from(out);
}

/** Valor actual de un dato de la presentación (para mostrar "antes → después" y para deshacer). */
export function valorPresentacion(estado: EstadoPropuesta, campo: PresCampo): string | number | null {
  if (campo === "vigenciaDias") return Number(estado.proposal.vigencia_dias ?? 15);
  if (campo === "clienteNombre") return estado.cliente?.contact_name ?? null;
  if (campo === "clienteCargo") return estado.cliente?.contact_cargo ?? null;
  const col = PRES_COLUMNA[campo]!;
  const guardado = estado.proposal.presentacion_contacto?.[col];
  if (guardado !== undefined && guardado !== null) return guardado;
  // El asesor sin editar sale del perfil del dueño de la propuesta.
  if (col === "full_name" || col === "cargo" || col === "correo" || col === "telefono") return estado.owner?.[col] ?? null;
  return null;
}
