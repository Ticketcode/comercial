"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";

async function assertAccess() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    throw new Error("No autorizado.");
  }
  return supabase;
}

export interface SaveGastoRow {
  id: string;
  staff_id: string;
  fecha: string | null;
  numero_recibo: string | null;
  tercero: string | null;
  rubro: string | null;
  concepto: string | null;
  valor: number;
  sort_order: number;
}

export interface SaveMetaRow {
  staff_id: string;
  responsable: string | null;
  actividad: string | null;
  ciudad_elaboracion: string | null;
  fecha_elaboracion: string | null;
}

export interface SaveLegalizacionPayload {
  proposalId: string;
  metas: SaveMetaRow[];
  gastos: { existing: SaveGastoRow[]; new: SaveGastoRow[]; deletedIds: string[] };
}

export async function saveLegalizacion(payload: SaveLegalizacionPayload) {
  const supabase = await assertAccess();

  if (payload.metas.length > 0) {
    const { error: metaError } = await supabase.from("legalizacion_meta").upsert(
      payload.metas.map((m) => ({
        proposal_id: payload.proposalId,
        staff_id: m.staff_id,
        responsable: m.responsable,
        actividad: m.actividad,
        ciudad_elaboracion: m.ciudad_elaboracion,
        fecha_elaboracion: m.fecha_elaboracion,
      })),
      { onConflict: "proposal_id,staff_id" }
    );
    if (metaError) return { error: metaError.message };
  }

  if (payload.gastos.deletedIds.length > 0) {
    const { error } = await supabase
      .from("legalizacion_gastos")
      .delete()
      .in("id", payload.gastos.deletedIds);
    if (error) return { error: error.message };
  }

  const results = await Promise.all(
    payload.gastos.existing.map((g) =>
      supabase
        .from("legalizacion_gastos")
        .update({
          staff_id: g.staff_id,
          fecha: g.fecha || null,
          numero_recibo: g.numero_recibo,
          tercero: g.tercero,
          rubro: g.rubro,
          concepto: g.concepto,
          valor: g.valor,
          sort_order: g.sort_order,
        })
        .eq("id", g.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  if (payload.gastos.new.length > 0) {
    const { error } = await supabase.from("legalizacion_gastos").insert(
      payload.gastos.new.map((g) => ({
        proposal_id: payload.proposalId,
        staff_id: g.staff_id,
        fecha: g.fecha || null,
        numero_recibo: g.numero_recibo,
        tercero: g.tercero,
        rubro: g.rubro,
        concepto: g.concepto,
        valor: g.valor,
        sort_order: g.sort_order,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/produccion/${payload.proposalId}/legalizacion`);
  return { error: null };
}
