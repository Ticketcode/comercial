"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { PRESUPUESTO_TEMPLATE } from "@/lib/data/presupuesto-template";

async function assertAccess() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    throw new Error("No autorizado.");
  }
  return supabase;
}

export async function seedPresupuestoFromTemplate(proposalId: string) {
  const supabase = await assertAccess();

  const { count } = await supabase
    .from("presupuesto_items")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);
  if (count && count > 0) {
    return { error: "Ya existen ítems de presupuesto para este evento." };
  }

  const rows: { proposal_id: string; categoria: string; nombre: string; sort_order: number }[] = [];
  let sort = 0;
  for (const [categoria, items] of Object.entries(PRESUPUESTO_TEMPLATE)) {
    for (const nombre of items) {
      rows.push({ proposal_id: proposalId, categoria, nombre, sort_order: sort++ });
    }
  }

  const { error } = await supabase.from("presupuesto_items").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/produccion/${proposalId}/presupuesto`);
  return { error: null };
}

export interface SavePresupuestoItemRow {
  id: string;
  categoria: string;
  nombre: string;
  dias_proyectado: number | null;
  cantidad_proyectado: number | null;
  valor_unitario_proyectado: number | null;
  iva_proyectado: number | null;
  total_proyectado: number;
  dias_ajustado: number | null;
  cantidad_ajustado: number | null;
  valor_unitario_ajustado: number | null;
  iva_ajustado: number | null;
  total_ajustado: number;
  transferido_fecha: string | null;
  transferido_a: string | null;
  ejecucion_valor: number;
  comentario: string | null;
  sort_order: number;
}

export interface SavePresupuestoPayload {
  proposalId: string;
  aforoReal: number | null;
  items: { existing: SavePresupuestoItemRow[]; new: SavePresupuestoItemRow[]; deletedIds: string[] };
}

export async function savePresupuesto(payload: SavePresupuestoPayload) {
  const supabase = await assertAccess();

  const { error: aforoError } = await supabase
    .from("proposals")
    .update({ aforo_real: payload.aforoReal })
    .eq("id", payload.proposalId);
  if (aforoError) return { error: aforoError.message };

  if (payload.items.deletedIds.length > 0) {
    const { error } = await supabase
      .from("presupuesto_items")
      .delete()
      .in("id", payload.items.deletedIds);
    if (error) return { error: error.message };
  }

  function toDb(item: SavePresupuestoItemRow) {
    return {
      categoria: item.categoria,
      nombre: item.nombre,
      dias_proyectado: item.dias_proyectado,
      cantidad_proyectado: item.cantidad_proyectado,
      valor_unitario_proyectado: item.valor_unitario_proyectado,
      iva_proyectado: item.iva_proyectado,
      total_proyectado: item.total_proyectado,
      dias_ajustado: item.dias_ajustado,
      cantidad_ajustado: item.cantidad_ajustado,
      valor_unitario_ajustado: item.valor_unitario_ajustado,
      iva_ajustado: item.iva_ajustado,
      total_ajustado: item.total_ajustado,
      transferido_fecha: item.transferido_fecha || null,
      transferido_a: item.transferido_a,
      ejecucion_valor: item.ejecucion_valor,
      comentario: item.comentario,
      sort_order: item.sort_order,
    };
  }

  const results = await Promise.all(
    payload.items.existing.map((item) =>
      supabase.from("presupuesto_items").update(toDb(item)).eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  if (payload.items.new.length > 0) {
    const { error } = await supabase.from("presupuesto_items").insert(
      payload.items.new.map((item) => ({ proposal_id: payload.proposalId, ...toDb(item) }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/produccion/${payload.proposalId}/presupuesto`);
  return { error: null };
}
