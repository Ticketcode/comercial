"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { parseCuentasCobroExcel } from "@/lib/data/cuenta-cobro-excel";

async function assertAccess() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    throw new Error("No autorizado.");
  }
  return supabase;
}

export async function uploadCuentasCobro(proposalId: string, formData: FormData) {
  const supabase = await assertAccess();

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No se recibió ningún archivo." };

  const buffer = await file.arrayBuffer();
  const { rows, errors } = parseCuentasCobroExcel(buffer);
  if (errors.length > 0) return { error: errors.join(" ") };

  const { error: delError } = await supabase
    .from("cuentas_cobro")
    .delete()
    .eq("proposal_id", proposalId);
  if (delError) return { error: delError.message };

  const { error: insertError } = await supabase.from("cuentas_cobro").insert(
    rows.map((r, i) => ({
      proposal_id: proposalId,
      nombre_completo: r.nombre_completo,
      cedula: r.cedula,
      ciudad_expedicion_cedula: r.ciudad_expedicion_cedula,
      banco: r.banco,
      tipo_cuenta: r.tipo_cuenta,
      numero_cuenta: r.numero_cuenta,
      concepto: r.concepto,
      valor: r.valor,
      ciudad_evento: r.ciudad_evento,
      sort_order: i,
    }))
  );
  if (insertError) return { error: insertError.message };

  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null, count: rows.length };
}

export async function markFirmada(id: string, proposalId: string, firmada: boolean) {
  const supabase = await assertAccess();
  const { error } = await supabase
    .from("cuentas_cobro")
    .update({
      estado: firmada ? "firmada" : "pendiente",
      fecha_firma: firmada ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null };
}

export async function deleteAllCuentasCobro(proposalId: string) {
  const supabase = await assertAccess();
  const { error } = await supabase.from("cuentas_cobro").delete().eq("proposal_id", proposalId);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null };
}
