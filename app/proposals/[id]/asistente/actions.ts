"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { consultarCambios, excedeTope } from "@/lib/ai/consulta";
import { cargarEstado, aplicarAtomos, marcarPreguntas } from "@/lib/ai/estado";
import {
  aplicarEnMemoria,
  preguntasDeAtomo,
  PREGUNTAS_DIAGNOSTICO,
  type PreguntaDiagnostico,
  etiquetaAtomo,
  validarCambios,
  valoresAntes,
  type Atomo,
} from "@/lib/ai/cambios";

const MAX_MENSAJE = 1500;
const MAX_HISTORIAL = 6;
const MAX_TURNO = 600;

export interface TarjetaCambio {
  id: string;
  etiqueta: string;
  /** Cambio del valor antes de IVA, en pesos (0 = no mueve el precio). */
  delta: number;
  atomo: Atomo;
  /** Lo contrario del cambio, para deshacerlo. */
  deshacer: Atomo;
}

export interface RespuestaAsistente {
  error: string | null;
  mensaje: string;
  tarjetas: TarjetaCambio[];
  noAplica: { etiqueta: string; motivo: string }[];
  /** Preguntas del diagnóstico que el asesor contestó sin que cambie nada (ya coincidían). */
  confirmadas?: string[];
}

export interface TurnoChat {
  rol: "usuario" | "claude";
  texto: string;
}

/** El asesor escribe lo que quiere ajustar; NOVA propone cambios y el servidor los valida y calcula su efecto en el precio. */
export async function pedirCambios(
  proposalId: string,
  mensaje: string,
  historial: TurnoChat[],
  contexto: { paso: string; sobre?: string | null }
): Promise<RespuestaAsistente> {
  const vacio = { mensaje: "", tarjetas: [], noAplica: [] };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ...vacio, error: "Tu sesión expiró. Vuelve a entrar." };

  const texto = mensaje.trim().slice(0, MAX_MENSAJE);
  if (!texto) return { ...vacio, error: "Escribe qué quieres ajustar." };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ...vacio, error: "Falta configurar ANTHROPIC_API_KEY en el servidor." };
  if (excedeTope(auth.user.id)) return { ...vacio, error: "Muchas consultas seguidas. Espera unos minutos." };

  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { ...vacio, error: "No se encontró la propuesta." };
  const { estado, total, aforoScales } = base;

  const mensajes: Anthropic.MessageParam[] = [];
  for (const t of historial.slice(-MAX_HISTORIAL)) {
    const rol = t.rol === "usuario" ? "user" : "assistant";
    if (mensajes.length > 0 && mensajes[mensajes.length - 1].role === rol) continue;
    mensajes.push({ role: rol, content: String(t.texto).slice(0, MAX_TURNO) });
  }
  while (mensajes.length > 0 && mensajes[0].role !== "user") mensajes.shift();
  if (mensajes.length > 0 && mensajes[mensajes.length - 1].role === "user") mensajes.pop();
  mensajes.push({ role: "user", content: texto });

  const { json, error: errorClaude } = await consultarCambios({
    apiKey,
    estado,
    mensajes,
    paso: contexto.paso.slice(0, 60),
    sobre: contexto.sobre ? contexto.sobre.slice(0, 120) : null,
  });
  if (!json) return { ...vacio, error: errorClaude ?? "No se pudo consultar a NOVA." };

  const { atomos, bloqueados } = validarCambios(json.cambios, estado, { aforoScales });

  // Preguntas que el asesor contestó sin que cambie nada: se marcan de una vez como "NOVA · confirma".
  const tocadas = new Set(atomos.flatMap((a) => preguntasDeAtomo(a)));
  const confirmadas = (Array.isArray(json.confirmados) ? json.confirmados : [])
    .filter((x): x is PreguntaDiagnostico => typeof x === "string" && (PREGUNTAS_DIAGNOSTICO as readonly string[]).includes(x))
    .filter((x) => !tocadas.has(x));
  if (confirmadas.length > 0) await marcarPreguntas(supabase, proposalId, estado, confirmadas, "ia");
  const tarjetas: TarjetaCambio[] = [];
  let actual = estado;
  for (const atomo of atomos) {
    const etiqueta = etiquetaAtomo(actual, atomo);
    if (!etiqueta) continue; // no cambia nada respecto a lo que ya hay
    const siguiente = aplicarEnMemoria(actual, atomo);
    const delta = Math.round(total(siguiente) - total(actual));
    tarjetas.push({ id: atomo.id, etiqueta, delta, atomo, deshacer: valoresAntes(actual, atomo) });
    actual = siguiente;
  }

  return {
    error: null,
    mensaje: typeof json.mensaje === "string" ? json.mensaje.slice(0, 600) : "",
    tarjetas,
    noAplica: bloqueados,
    confirmadas,
  };
}

/** Aplica cambios aceptados por el asesor. Cada uno se vuelve a validar aquí: el navegador no es de fiar. */
export async function aplicarCambios(
  proposalId: string,
  atomos: Atomo[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  if (!Array.isArray(atomos) || atomos.length === 0 || atomos.length > 40) return { error: "Nada que aplicar." };

  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta." };
  const estado = base.estado;

  const r = await aplicarAtomos(supabase, proposalId, estado, atomos);
  if (!r.error) {
    // Lo que NOVA cambió queda como pregunta contestada por NOVA, por confirmar.
    await marcarPreguntas(supabase, proposalId, estado, Array.from(new Set(atomos.flatMap((a) => preguntasDeAtomo(a)))), "ia");
  }
  if (r.error) return { error: r.error };

  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}
