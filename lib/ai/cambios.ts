/**
 * Cambios que Claude puede proponer sobre una propuesta.
 *
 * Claude NUNCA escribe en la base: devuelve JSON, y este módulo lo valida
 * (lista cerrada de campos, rangos, reglas por modalidad), lo parte en
 * cambios sueltos ("átomos") y calcula cuánto mueve el precio. Solo cuando
 * el comercial acepta una tarjeta, el servidor aplica ese átomo — después de
 * volver a validarlo.
 */
import type { Proposal, ProposalCostItem, Modality } from "@/lib/types";
import { staffingForAforo, type AforoScaleRow } from "@/lib/pricing/logistics";
import { HIDEABLE_SLIDE_GROUPS } from "@/lib/data/laminas";

export type ValorCampo = number | string | boolean;

export interface Atomo {
  id: string;
  tipo: "campos" | "servicio" | "lamina";
  /** Campos de `proposals` que cambian (tipo "campos"). */
  campos?: Record<string, ValorCampo>;
  /** Servicio personalizado por su nombre de catálogo (tipo "servicio"). */
  servicio?: { label: string; incluir: boolean; cantidad?: number };
  /** Lámina de la presentación (tipo "lamina"). */
  lamina?: { key: string; ocultar: boolean };
}

/** Lo que Claude puede pedir. Todo es opcional; lo que no esté aquí se ignora. */
export interface CambiosCrudos {
  aforo?: unknown;
  aforoVirtual?: unknown;
  dias?: unknown;
  ciudad?: unknown;
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

export interface EstadoPropuesta {
  proposal: Proposal;
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

const usaPresencial = (m: Modality) => m === "presencial" || m === "hibrido";
const usaVirtual = (m: Modality) => m === "virtual" || m === "hibrido" || m === "mundo_virtual";

export const ETIQUETA_CAMPO: Record<string, string> = {
  aforo: "Aforo presencial",
  aforo_virtual: "Aforo virtual",
  dias: "Días",
  city: "Ciudad",
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

export function formatearValor(campo: string, v: ValorCampo | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
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

/** Valida lo que pidió Claude y lo parte en cambios sueltos. */
export function validarCambios(
  crudos: CambiosCrudos | null | undefined,
  estado: EstadoPropuesta,
  ctx: ContextoValidacion
): ResultadoValidacion {
  const atomos: Atomo[] = [];
  const bloqueados: AtomoBloqueado[] = [];
  if (!crudos || typeof crudos !== "object") return { atomos, bloqueados };
  const { proposal } = estado;
  const m = proposal.modality;

  const campo = (clave: string, valor: ValorCampo) => atomos.push({ id: nuevoId(), tipo: "campos", campos: { [clave]: valor } });
  const bloquear = (clave: string, motivo: string) => bloqueados.push({ etiqueta: ETIQUETA_CAMPO[clave] ?? clave, motivo });

  // Aforo: en una modalidad solo virtual, el aforo que se pide es el virtual.
  const aforo = num(crudos.aforo, 1, 100000);
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

  const equipo: [unknown, string, number][] = [
    [crudos.productor, "qty_productor", 10],
    [crudos.supervisores, "qty_supervisor", 20],
    [crudos.logisticos, "qty_logistico", 100],
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
    else if (!s.included) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: s.label, incluir: true } });
  }
  for (const nombre of lista(crudos.serviciosQuitar)) {
    const s = buscarServicio(nombre);
    if (s?.included) atomos.push({ id: nuevoId(), tipo: "servicio", servicio: { label: s.label, incluir: false } });
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
    const c = atomo.servicio?.cantidad;
    if (c !== undefined && !(Number.isInteger(c) && c >= 0 && c <= 100000)) return "Cantidad fuera de rango";
    return null;
  }
  if (atomo.tipo === "lamina") {
    return HIDEABLE_SLIDE_GROUPS.some((g) => g.key === atomo.lamina?.key) ? null : "Lámina desconocida";
  }
  return "Tipo de cambio desconocido";
}

const esNum = (min: number, max: number) => (v: ValorCampo) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const REGLAS_CAMPO: Record<string, { valida: (v: ValorCampo) => boolean; presencial?: boolean }> = {
  aforo: { valida: esNum(1, 100000), presencial: true },
  aforo_virtual: { valida: esNum(1, 100000) },
  dias: { valida: esNum(1, 30) },
  city: { valida: (v) => typeof v === "string" && v.length > 0 && v.length <= 80 },
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
      antes[k] = v ?? (k === "city" ? "" : 0);
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
      .filter(([k, v]) => p[k] !== v)
      .map(([k, v]) => `${ETIQUETA_CAMPO[k] ?? k}: ${formatearValor(k, p[k] ?? undefined)} → ${formatearValor(k, v)}`)
      .join(" · ");
  }
  if (atomo.tipo === "servicio" && atomo.servicio) {
    const s = estado.servicios.find((x) => x.label === atomo.servicio!.label);
    const c = atomo.servicio.cantidad;
    if (s?.included && atomo.servicio.incluir && c !== undefined) return `${atomo.servicio.label}: cantidad ${Number(s.quantity)} → ${c}`;
    return `${atomo.servicio.incluir ? "Agregar" : "Quitar"} servicio: ${atomo.servicio.label}${c !== undefined && atomo.servicio.incluir ? ` × ${c}` : ""}`;
  }
  if (atomo.tipo === "lamina" && atomo.lamina) {
    const g = HIDEABLE_SLIDE_GROUPS.find((x) => x.key === atomo.lamina!.key);
    return `${atomo.lamina.ocultar ? "Ocultar" : "Mostrar"} lámina: ${g?.label ?? atomo.lamina.key}`;
  }
  return "Cambio";
}
