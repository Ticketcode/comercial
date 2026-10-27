"use server";

import { randomUUID } from "crypto";
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

export interface AddCuentaCobroInput {
  nombre_completo: string;
  cedula: string;
  ciudad_expedicion_cedula: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  concepto: string;
  valor: number;
  ciudad_evento: string | null;
}

export async function addCuentaCobro(proposalId: string, data: AddCuentaCobroInput) {
  const supabase = await assertAccess();

  if (!data.nombre_completo.trim() || !data.cedula.trim()) {
    return { error: "Nombre y cédula son obligatorios." };
  }

  const { count } = await supabase
    .from("cuentas_cobro")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);

  const { error } = await supabase.from("cuentas_cobro").insert({
    proposal_id: proposalId,
    nombre_completo: data.nombre_completo.trim(),
    cedula: data.cedula.trim(),
    ciudad_expedicion_cedula: data.ciudad_expedicion_cedula?.trim() || null,
    banco: data.banco?.trim() || null,
    tipo_cuenta: data.tipo_cuenta?.trim() || null,
    numero_cuenta: data.numero_cuenta?.trim() || null,
    concepto: data.concepto.trim(),
    valor: data.valor,
    ciudad_evento: data.ciudad_evento?.trim() || null,
    sort_order: count ?? 0,
  });
  if (error) return { error: error.message };

  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null };
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

export async function deleteCuentaCobro(id: string, proposalId: string) {
  const supabase = await assertAccess();
  const { error } = await supabase
    .from("cuentas_cobro")
    .delete()
    .eq("id", id)
    .eq("proposal_id", proposalId);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null };
}

/** Genera un enlace nuevo para firmar: el anterior deja de funcionar. */
export async function regenerarEnlaceCuentaCobro(id: string, proposalId: string) {
  const supabase = await assertAccess();
  const token = randomUUID();
  const { error } = await supabase
    .from("cuentas_cobro")
    .update({ token })
    .eq("id", id)
    .eq("proposal_id", proposalId);
  if (error) return { error: error.message, token: null as string | null };
  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null, token: token as string | null };
}

/**
 * Deshace una firma (por error, firma de otra persona o firma manual equivocada): borra la
 * firma, deja la cuenta pendiente y genera un enlace nuevo para que el anterior no se reutilice.
 */
export async function deshacerFirma(id: string, proposalId: string) {
  const supabase = await assertAccess();
  const token = randomUUID();
  const { error } = await supabase
    .from("cuentas_cobro")
    .update({
      estado: "pendiente",
      fecha_firma: null,
      firma_nombre: null,
      firma_imagen: null,
      token,
    })
    .eq("id", id)
    .eq("proposal_id", proposalId);
  if (error) return { error: error.message, token: null as string | null };
  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null, token: token as string | null };
}

export async function deleteAllCuentasCobro(proposalId: string) {
  const supabase = await assertAccess();
  const { error } = await supabase.from("cuentas_cobro").delete().eq("proposal_id", proposalId);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/cuentas-cobro`);
  return { error: null };
}
