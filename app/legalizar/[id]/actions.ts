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
  /** Token del enlace público /legalizar/[token]. */
  token: string;
  meta: {
    responsable: string | null;
    actividad: string | null;
    ciudad_elaboracion: string | null;
    fecha_elaboracion: string | null;
  };
  gastos: { existing: SaveGastoRow[]; new: SaveGastoRow[]; deletedIds: string[] };
}

// Sin login: `token` es el de la URL pública /legalizar/[token]. Toda escritura queda acotada
// a la persona dueña de ese token (el staff_id y el proposal_id salen de la base de datos, no
// del cliente). Si Producción regeneró el enlace o cerró la legalización, se rechaza.
export async function saveLegalizacionPersona(payload: SaveLegalizarPersonaPayload) {
  const supabase = createAdminClient();

  const { data: staffMember, error: staffError } = await supabase
    .from("event_staff")
    .select("id, proposal_id, legalizacion_cerrada")
    .eq("token", payload.token)
    .maybeSingle();
  if (staffError) return { error: staffError.message };
  if (!staffMember) {
    return { error: "Este enlace ya no es válido. Pide a Producción que te envíe uno nuevo." };
  }
  if (staffMember.legalizacion_cerrada) {
    return {
      error: "Esta legalización ya fue cerrada por Producción. Si necesitas cambiar algo, pídeles que la reabran.",
    };
  }
  const staffId: string = staffMember.id;
  const proposalId: string = staffMember.proposal_id;

  const { error: metaError } = await supabase.from("legalizacion_meta").upsert(
    {
      proposal_id: proposalId,
      staff_id: staffId,
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
      .eq("staff_id", staffId);
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
        .eq("staff_id", staffId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  if (payload.gastos.new.length > 0) {
    const { error } = await supabase.from("legalizacion_gastos").insert(
      payload.gastos.new.map((g) => ({
        proposal_id: proposalId,
        staff_id: staffId,
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

  revalidatePath(`/legalizar/${payload.token}`);
  revalidatePath(`/produccion/${proposalId}/legalizacion`);
  return { error: null };
}
