import { createClient } from "@/lib/supabase/server";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoAnticipo } from "@/lib/types";
import { LegalizacionEditor } from "./legalizacion-editor";

export const dynamic = "force-dynamic";

export default async function LegalizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: metas }, { data: gastos }, { data: anticipos }, { data: staff }] =
    await Promise.all([
      supabase.from("proposals").select("event_name").eq("id", id).single(),
      supabase.from("legalizacion_meta").select("*").eq("proposal_id", id),
      supabase.from("legalizacion_gastos").select("*").eq("proposal_id", id).order("sort_order"),
      supabase.from("viatico_anticipos").select("*").eq("proposal_id", id).order("fecha"),
      supabase.from("event_staff").select("*").eq("proposal_id", id).order("sort_order"),
    ]);

  return (
    <LegalizacionEditor
      proposalId={id}
      eventName={proposal?.event_name ?? ""}
      initialMetas={(metas ?? []) as LegalizacionMeta[]}
      initialGastos={(gastos ?? []) as LegalizacionGasto[]}
      anticipos={(anticipos ?? []) as ViaticoAnticipo[]}
      staff={(staff ?? []) as EventStaff[]}
    />
  );
}
export const metadata = { title: "Legalización" };
