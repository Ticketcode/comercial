import { createClient } from "@/lib/supabase/server";
import type { PresupuestoItem, Proposal } from "@/lib/types";
import { PresupuestoEditor } from "./presupuesto-editor";
import { SeedPresupuestoButton } from "./seed-presupuesto-button";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: items }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, event_name, city, aforo, aforo_real, event_start_date, event_end_date")
      .eq("id", id)
      .single(),
    supabase.from("presupuesto_items").select("*").eq("proposal_id", id).order("sort_order"),
  ]);

  if (!items || items.length === 0) {
    return <SeedPresupuestoButton proposalId={id} />;
  }

  return (
    <PresupuestoEditor
      proposalId={id}
      proposal={proposal as Pick<Proposal, "id" | "event_name" | "city" | "aforo" | "aforo_real" | "event_start_date" | "event_end_date">}
      initialItems={items as PresupuestoItem[]}
    />
  );
}
