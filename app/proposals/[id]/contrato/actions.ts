"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProposalContractFields } from "@/lib/types";

export type ContractFieldsInput = Omit<ProposalContractFields, "proposal_id">;

const DATE_FIELDS = [
  "contrato_fecha",
  "fecha_firma",
  "plazo_inicio",
  "plazo_fin",
  "tiempo_servicio_inicio",
  "tiempo_servicio_fin",
] as const;

export async function saveContractFields(proposalId: string, fields: ContractFieldsInput) {
  const supabase = await createClient();

  const normalized = { ...fields };
  for (const key of DATE_FIELDS) {
    if (normalized[key] === "") normalized[key] = null;
  }

  const { error } = await supabase
    .from("proposal_contract_fields")
    .upsert({ proposal_id: proposalId, ...normalized }, { onConflict: "proposal_id" });
  if (error) return { error: error.message };

  await supabase.from("proposals").update({ status: "contrato" }).eq("id", proposalId);

  revalidatePath(`/proposals/${proposalId}/contrato`);
  return { error: null };
}
