import { createClient } from "@/lib/supabase/server";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoAnticipo } from "@/lib/types";
import { LegalizacionEditor } from "./legalizacion-editor";

export const dynamic = "force-dynamic";

export default async function LegalizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: meta }, { data: gastos }, { data: anticipos }, { data: staff }] = await Promise.all([
    supabase.from("legalizacion_meta").select("*").eq("proposal_id", id).maybeSingle(),
    supabase.from("legalizacion_gastos").select("*").eq("proposal_id", id).order("sort_order"),
    supabase.from("viatico_anticipos").select("*").eq("proposal_id", id).order("fecha"),
    supabase.from("event_staff").select("*").eq("proposal_id", id),
  ]);

  return (
    <LegalizacionEditor
      proposalId={id}
      meta={meta as LegalizacionMeta | null}
      initialGastos={(gastos ?? []) as LegalizacionGasto[]}
      anticipos={(anticipos ?? []) as ViaticoAnticipo[]}
      staff={(staff ?? []) as EventStaff[]}
    />
  );
}
