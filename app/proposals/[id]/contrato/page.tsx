import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalContractFields } from "@/lib/types";
import { ContratoEditor } from "./contrato-editor";

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: fields }] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("proposal_contract_fields").select("*").eq("proposal_id", id).maybeSingle(),
  ]);

  if (!proposal) notFound();

  return (
    <ContratoEditor
      proposal={proposal as Proposal}
      fields={fields as ProposalContractFields | null}
    />
  );
}
