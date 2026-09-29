"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveGastoRow {
  id: string;
  fecha: string | null;
  numero_recibo: string | null;
  tercero: string | null;
  rubro: string | null;
  concepto: string | null;
  valor: number;
  sort_order: number;
}

export interface SaveLegalizarPersonaPayload {
  staffId: string;
  proposalId: string;
  meta: {
    responsable: string | null;
    actividad: string | null;
    ciudad_elaboracion: string | null;
    fecha_elaboracion: string | null;
  };
  gastos: { existing: SaveGastoRow[]; new: SaveGastoRow[]; deletedIds: string[] };
}

// Sin login: `staffId` es el token de acceso de la URL pública /legalizar/[id].
// Toda escritura queda acotada a ese staff_id — un link solo puede tocar los
// datos de esa persona.
export async function saveLegalizacionPersona(payload: SaveLegalizarPersonaPayload) {
  const supabase = createAdminClient();

  const { data: staffMember, error: staffError } = await supabase
    .from("event_staff")
    .select("id, proposal_id")
    .eq("id", payload.staffId)
    .maybeSingle();
  if (staffError) return { error: staffError.message };
  if (!staffMember || staffMember.proposal_id !== payload.proposalId) {
    return { error: "Link inválido." };
  }

  const { error: metaError } = await supabase.from("legalizacion_meta").upsert(
    {
      proposal_id: payload.proposalId,
      staff_id: payload.staffId,
      responsable: payload.meta.responsable,
      actividad: payload.meta.actividad,
      ciudad_elaboracion: payload.meta.ciudad_elaboracion,
      fecha_elaboracion: payload.meta.fecha_elaboracion,
    },
    { onConflict: "proposal_id,staff_id" }
  );
  if (metaError) return { error: metaError.message };

  if (payload.gastos.deletedIds.length > 0) {
    const { error } = await supabase
      .from("legalizacion_gastos")
      .delete()
      .in("id", payload.gastos.deletedIds)
      .eq("staff_id", payload.staffId);
    if (error) return { error: error.message };
  }

  const results = await Promise.all(
    payload.gastos.existing.map((g) =>
      supabase
        .from("legalizacion_gastos")
        .update({
          fecha: g.fecha || null,
          numero_recibo: g.numero_recibo,
          tercero: g.tercero,
          rubro: g.rubro,
          concepto: g.concepto,
          valor: g.valor,
          sort_order: g.sort_order,
        })
        .eq("id", g.id)
        .eq("staff_id", payload.staffId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  if (payload.gastos.new.length > 0) {
    const { error } = await supabase.from("legalizacion_gastos").insert(
      payload.gastos.new.map((g) => ({
        proposal_id: payload.proposalId,
        staff_id: payload.staffId,
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

  revalidatePath(`/legalizar/${payload.staffId}`);
  revalidatePath(`/produccion/${payload.proposalId}/legalizacion`);
  return { error: null };
}
