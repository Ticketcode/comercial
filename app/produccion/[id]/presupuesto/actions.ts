"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { PRESUPUESTO_TEMPLATE } from "@/lib/data/presupuesto-template";
import { valoresConocidosDesdeTarifario } from "@/lib/data/presupuesto-tarifario-map";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertAccess() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    throw new Error("No autorizado.");
  }
  return supabase;
}

async function computeValoresConocidos(supabase: SupabaseClient, proposalId: string) {
  const [{ data: proposal }, { data: rateRows }, { data: costItems }, { data: honorariosProductorScale }] =
    await Promise.all([
      supabase.from("proposals").select("*").eq("id", proposalId).single(),
      supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
      supabase.from("proposal_cost_items").select("*").eq("proposal_id", proposalId),
      supabase
        .from("price_scale_items")
        .select("tier_min, tier_max, unit_value")
        .eq("scale_group", "honorarios_productor")
        .order("sort_order"),
    ]);
  if (!proposal) return null;

  const logisticsRates = buildLogisticsRates(rateRows ?? []);
  const { items: serviceItems } = await getValidServiceCostItems(
    supabase,
    (costItems ?? []) as ProposalCostItem[],
    (proposal as Proposal).modality
  );
  const summary = computeTarifarioSummary(
    proposal as Proposal,
    logisticsRates,
    serviceItems,
    honorariosProductorScale ?? []
  );
  return valoresConocidosDesdeTarifario(summary);
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

  const valores = await computeValoresConocidos(supabase, proposalId);

  // PostgREST rellena con NULL (no con el default de la columna) los campos
  // que falten en un objeto del batch de insert cuando las filas no tienen
  // exactamente las mismas llaves — por eso cada fila debe traer siempre
  // el set completo, aunque sea con null / 0.
  const rows: Record<string, unknown>[] = [];
  let sort = 0;
  for (const [categoria, items] of Object.entries(PRESUPUESTO_TEMPLATE)) {
    for (const nombre of items) {
      const conocido = valores?.[nombre];
      rows.push({
        proposal_id: proposalId,
        categoria,
        nombre,
        sort_order: sort++,
        dias_proyectado: conocido?.dias ?? null,
        cantidad_proyectado: conocido?.cantidad ?? null,
        valor_unitario_proyectado: conocido?.valor_unitario ?? null,
        total_proyectado: conocido?.total ?? 0,
        dias_ajustado: conocido?.dias ?? null,
        cantidad_ajustado: conocido?.cantidad ?? null,
        valor_unitario_ajustado: conocido?.valor_unitario ?? null,
        total_ajustado: conocido?.total ?? 0,
      });
    }
  }

  const { error } = await supabase.from("presupuesto_items").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/produccion/${proposalId}/presupuesto`);
  return { error: null };
}

// Trae de nuevo los valores calculados en el Tarifario para los ítems que
// tienen una fuente clara (honorarios, alimentación, transporte, equipos) —
// útil si el Tarifario cambió después de crear el presupuesto. Solo
// actualiza "Proyectado inicial"; el "Presupuesto ajustado" se deja intacto
// si el ítem ya fue tocado a mano, para no pisar ediciones.
export async function pullValoresTarifario(proposalId: string) {
  const supabase = await assertAccess();

  const valores = await computeValoresConocidos(supabase, proposalId);
  if (!valores) return { error: "No se encontró la propuesta." };

  const { data: items, error: itemsError } = await supabase
    .from("presupuesto_items")
    .select("*")
    .eq("proposal_id", proposalId);
  if (itemsError) return { error: itemsError.message };

  const updates = (items ?? [])
    .filter((item) => valores[item.nombre])
    .map((item) => {
      const conocido = valores[item.nombre];
      const ajustadoIntacto =
        item.dias_ajustado === null &&
        item.cantidad_ajustado === null &&
        item.valor_unitario_ajustado === null &&
        !item.total_ajustado;
      return supabase
        .from("presupuesto_items")
        .update({
          dias_proyectado: conocido.dias,
          cantidad_proyectado: conocido.cantidad,
          valor_unitario_proyectado: conocido.valor_unitario,
          total_proyectado: conocido.total,
          ...(ajustadoIntacto
            ? {
                dias_ajustado: conocido.dias,
                cantidad_ajustado: conocido.cantidad,
                valor_unitario_ajustado: conocido.valor_unitario,
                total_ajustado: conocido.total,
              }
            : {}),
        })
        .eq("id", item.id);
    });

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath(`/produccion/${proposalId}/presupuesto`);
  return { error: null, count: updates.length };
}

export interface SavePresupuestoItemRow {
  id: string;
  categoria: string;
  nombre: string;
  iva_aplica: boolean;
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
      iva_aplica: item.iva_aplica,
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
