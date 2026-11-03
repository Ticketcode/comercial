"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadDeckData, versionTotals } from "@/lib/data/deck-data";

function refresh(proposalId: string) {
  revalidatePath(`/proposals/${proposalId}/versiones`);
  revalidatePath(`/proposals/${proposalId}/contrato`);
}

/** Guarda una foto de la propuesta tal como está hoy como la siguiente versión (V1, V2, ...). */
export async function saveVersion(proposalId: string, note: string) {
  const supabase = await createClient();
  const data = await loadDeckData(supabase, proposalId);
  if (!data) return { error: "No se encontró la propuesta." };

  const { data: last } = await supabase
    .from("proposal_versions")
    .select("version_number")
    .eq("proposal_id", proposalId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = (last?.version_number ?? 0) + 1;

  const t = versionTotals(data);
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("proposal_versions").insert({
    proposal_id: proposalId,
    version_number: next,
    note: note.trim() || null,
    valor_inicial: t.inicial,
    descuento_pct: t.descuentoPct,
    valor_antes_iva: t.antesIva,
    iva: t.iva,
    total_con_iva: t.totalConIva,
    snapshot: data,
    created_by: userData.user?.id ?? null,
  });
  if (error) return { error: error.message };

  refresh(proposalId);
  return { error: null };
}

/** Marca (o desmarca) la versión que se envía al cliente para que la acepte. Solo hay una. */
export async function setFinalVersion(proposalId: string, versionId: string, makeFinal: boolean) {
  const supabase = await createClient();
  const { data: versions, error: readError } = await supabase
    .from("proposal_versions")
    .select("id, version_number, status, is_final")
    .eq("proposal_id", proposalId);
  if (readError) return { error: readError.message };

  const target = (versions ?? []).find((v) => v.id === versionId);
  if (!target) return { error: "No se encontró la versión." };

  if (makeFinal) {
    const accepted = (versions ?? []).find((v) => v.status === "aceptada" && v.id !== versionId);
    if (accepted) {
      return {
        error: `Ya hay una versión aceptada (V${accepted.version_number}). Deshaz esa aceptación antes de marcar otra como final.`,
      };
    }
    // El índice único permite una sola final: se quita primero la anterior.
    const { error: clearError } = await supabase
      .from("proposal_versions")
      .update({ is_final: false, status: "borrador", sent_at: null })
      .eq("proposal_id", proposalId)
      .eq("is_final", true)
      .neq("id", versionId);
    if (clearError) return { error: clearError.message };
    const { error } = await supabase.from("proposal_versions").update({ is_final: true }).eq("id", versionId);
    if (error) return { error: error.message };
  } else {
    if (target.status === "aceptada") {
      return { error: "Esta versión está aceptada. Deshaz la aceptación antes de quitar la marca de final." };
    }
    const { error } = await supabase
      .from("proposal_versions")
      .update({ is_final: false, status: "borrador", sent_at: null })
      .eq("id", versionId);
    if (error) return { error: error.message };
  }

  refresh(proposalId);
  return { error: null };
}

/** La versión final ya se envió al cliente. */
export async function markVersionSent(proposalId: string, versionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposal_versions")
    .update({ status: "enviada", sent_at: new Date().toISOString() })
    .eq("id", versionId)
    .eq("proposal_id", proposalId)
    .eq("is_final", true)
    .eq("status", "borrador");
  if (error) return { error: error.message };
  refresh(proposalId);
  return { error: null };
}

export interface AcceptanceInput {
  name: string;
  cargo: string;
  /** Fecha (AAAA-MM-DD) en la que el cliente aceptó; vacío = hoy. */
  date: string;
  note: string;
}

/** Registra que el cliente aceptó la propuesta (la versión final). No es la firma del contrato. */
export async function recordAcceptance(proposalId: string, versionId: string, input: AcceptanceInput) {
  if (!input.name.trim()) return { error: "Escribe el nombre de quien aceptó." };
  const supabase = await createClient();
  const acceptedAt = input.date ? new Date(`${input.date}T12:00:00`).toISOString() : new Date().toISOString();
  const { data, error } = await supabase
    .from("proposal_versions")
    .update({
      status: "aceptada",
      accepted_at: acceptedAt,
      accepted_by_name: input.name.trim(),
      accepted_by_cargo: input.cargo.trim() || null,
      acceptance_note: input.note.trim() || null,
    })
    .eq("id", versionId)
    .eq("proposal_id", proposalId)
    .eq("is_final", true)
    .in("status", ["borrador", "enviada"])
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Solo se puede aceptar la versión marcada como final." };
  refresh(proposalId);
  return { error: null };
}

/** Deshace una aceptación registrada por error. */
export async function undoAcceptance(proposalId: string, versionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposal_versions")
    .update({ status: "enviada", accepted_at: null, accepted_by_name: null, accepted_by_cargo: null, acceptance_note: null })
    .eq("id", versionId)
    .eq("proposal_id", proposalId)
    .eq("status", "aceptada");
  if (error) return { error: error.message };
  refresh(proposalId);
  return { error: null };
}

/** Borra una versión que no es la final (por ejemplo, una guardada por error). */
export async function deleteVersion(proposalId: string, versionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_versions")
    .delete()
    .eq("id", versionId)
    .eq("proposal_id", proposalId)
    .eq("is_final", false)
    .eq("status", "borrador")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Solo se pueden borrar versiones que no son la final." };
  refresh(proposalId);
  return { error: null };
}
