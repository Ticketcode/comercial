import { createClient } from "@/lib/supabase/server";
import type { CuentaCobro } from "@/lib/types";
import { CuentasCobroEditor } from "./cuentas-cobro-editor";

export default async function CuentasCobroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cuentas } = await supabase
    .from("cuentas_cobro")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order");

  return <CuentasCobroEditor proposalId={id} cuentas={(cuentas ?? []) as CuentaCobro[]} />;
}
