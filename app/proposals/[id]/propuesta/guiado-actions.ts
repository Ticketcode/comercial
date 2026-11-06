"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { error: string | null };
type Cliente = Awaited<ReturnType<typeof createClient>>;

const SUBS = ["propuesta", "presentacion", "versiones", "contrato"];

async function conSesion(): Promise<{ supabase: Cliente } | { error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  return { supabase };
}

function refrescar(proposalId: string) {
  for (const sub of SUBS) revalidatePath(`/proposals/${proposalId}/${sub}`);
}

/**
 * Deja una lista de filas de la propuesta exactamente como la mandó el navegador: actualiza las que ya existían,
 * crea las nuevas y borra las que se quitaron. Solo toca filas de esta propuesta.
 */
async function reemplazarLista(
  supabase: Cliente,
  tabla: string,
  proposalId: string,
  filas: ({ id?: string } & Record<string, unknown>)[]
): Promise<string | null> {
  const { data: existentes, error: e0 } = await supabase.from(tabla).select("id").eq("proposal_id", proposalId);
  if (e0) return e0.message;
  const ids = new Set((existentes ?? []).map((r) => (r as { id: string }).id));
  const conservar = new Set(filas.map((f) => f.id).filter((i): i is string => !!i && ids.has(i)));
  const borrar = Array.from(ids).filter((i) => !conservar.has(i));
  if (borrar.length > 0) {
    const { error } = await supabase.from(tabla).delete().in("id", borrar);
    if (error) return error.message;
  }
  for (let i = 0; i < filas.length; i++) {
    const { id, ...campos } = filas[i];
    if (id && ids.has(id)) {
      const { error } = await supabase.from(tabla).update({ ...campos, sort_order: i }).eq("id", id);
      if (error) return error.message;
    } else {
      const { error } = await supabase.from(tabla).insert({ proposal_id: proposalId, ...campos, sort_order: i });
      if (error) return error.message;
    }
  }
  return null;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function guardarPagos(proposalId: string, filas: { id?: string; label: string; pct: number }[]): Promise<Resultado> {
  const s = await conSesion();
  if ("error" in s) return s;
  if (!Array.isArray(filas) || filas.length === 0 || filas.length > 12) return { error: "Define entre 1 y 12 pagos." };
  const limpias = filas.map((f) => ({ id: f.id, label: texto(f.label, 200), pct: Number(f.pct) }));
  if (limpias.some((f) => !f.label)) return { error: "Cada pago necesita un nombre." };
  if (limpias.some((f) => !Number.isFinite(f.pct) || f.pct < 0 || f.pct > 100)) return { error: "Cada porcentaje debe estar entre 0 y 100." };
  const suma = limpias.reduce((a, f) => a + f.pct, 0);
  if (Math.abs(suma - 100) > 0.01) return { error: `Los pagos deben sumar 100% (hoy suman ${Math.round(suma * 100) / 100}%).` };
  const error = await reemplazarLista(s.supabase, "proposal_payment_milestones", proposalId, limpias);
  if (error) return { error };
  refrescar(proposalId);
  return { error: null };
}

export async function guardarCronograma(
  proposalId: string,
  filas: { id?: string; week_number: number; day_number: number | null; hito: string; comentario: string | null }[]
): Promise<Resultado> {
  const s = await conSesion();
  if ("error" in s) return s;
  if (!Array.isArray(filas) || filas.length > 80) return { error: "El cronograma admite hasta 80 filas." };
  const limpias = filas.map((f) => ({
    id: f.id,
    week_number: Math.round(Number(f.week_number)),
    day_number: f.day_number === null || f.day_number === undefined || Number.isNaN(Number(f.day_number)) ? null : Math.round(Number(f.day_number)),
    hito: texto(f.hito, 300),
    comentario: texto(f.comentario, 600) || null,
  }));
  if (limpias.some((f) => !f.hito)) return { error: "Cada fila necesita un hito." };
  if (limpias.some((f) => !Number.isInteger(f.week_number) || f.week_number < 1 || f.week_number > 52)) return { error: "La semana debe estar entre 1 y 52." };
  if (limpias.some((f) => f.day_number !== null && (f.day_number < 1 || f.day_number > 31))) return { error: "El día debe estar entre 1 y 31 (o vacío)." };
  const error = await reemplazarLista(s.supabase, "proposal_schedule_items", proposalId, limpias);
  if (error) return { error };
  refrescar(proposalId);
  return { error: null };
}

export async function guardarRequerimientos(proposalId: string, filas: { id?: string; text: string }[]): Promise<Resultado> {
  const s = await conSesion();
  if ("error" in s) return s;
  if (!Array.isArray(filas) || filas.length > 60) return { error: "Hasta 60 requerimientos." };
  const limpias = filas.map((f) => ({ id: f.id, text: texto(f.text, 500) })).filter((f) => f.text);
  const error = await reemplazarLista(s.supabase, "proposal_operational_requirements", proposalId, limpias);
  if (error) return { error };
  refrescar(proposalId);
  return { error: null };
}

/** Incluye o quita un componente (o ítem de logística) de la propuesta, o cambia el texto con el que se muestra. */
export async function guardarComponente(
  proposalId: string,
  seleccionId: string,
  parche: { included?: boolean; custom_name?: string | null; custom_description?: string | null }
): Promise<Resultado> {
  const s = await conSesion();
  if ("error" in s) return s;
  const cambios: Record<string, unknown> = {};
  if (typeof parche.included === "boolean") cambios.included = parche.included;
  if (parche.custom_name !== undefined) cambios.custom_name = texto(parche.custom_name, 200) || null;
  if (parche.custom_description !== undefined) cambios.custom_description = texto(parche.custom_description, 1500) || null;
  if (Object.keys(cambios).length === 0) return { error: null };
  const { data } = await s.supabase.from("proposal_catalog_selections").select("id").eq("id", seleccionId).eq("proposal_id", proposalId).maybeSingle();
  if (!data) return { error: "Ese componente no es de esta propuesta." };
  const { error } = await s.supabase.from("proposal_catalog_selections").update(cambios).eq("id", seleccionId);
  if (error) return { error: error.message };
  refrescar(proposalId);
  return { error: null };
}

/** Título y alcance con los que se muestra un servicio incluido en la propuesta (vacío = el del catálogo). */
export async function guardarTextoServicio(
  proposalId: string,
  costItemId: string,
  textos: { custom_name: string | null; custom_description: string | null }
): Promise<Resultado> {
  const s = await conSesion();
  if ("error" in s) return s;
  const { data } = await s.supabase.from("proposal_cost_items").select("id").eq("id", costItemId).eq("proposal_id", proposalId).maybeSingle();
  if (!data) return { error: "Ese servicio no es de esta propuesta." };
  const { error } = await s.supabase
    .from("proposal_cost_items")
    .update({ custom_name: texto(textos.custom_name, 200) || null, custom_description: texto(textos.custom_description, 1500) || null })
    .eq("id", costItemId);
  if (error) return { error: error.message };
  refrescar(proposalId);
  return { error: null };
}
