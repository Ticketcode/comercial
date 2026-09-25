import { createClient } from "@/lib/supabase/server";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoGiro } from "@/lib/types";
import { LegalizacionEditor } from "./legalizacion-editor";

export const dynamic = "force-dynamic";

export default async function LegalizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: meta }, { data: gastos }, { data: giros }, { data: staff }] = await Promise.all([
    supabase.from("legalizacion_meta").select("*").eq("proposal_id", id).maybeSingle(),
    supabase.from("legalizacion_gastos").select("*").eq("proposal_id", id).order("sort_order"),
    supabase
      .from("viatico_giros")
      .select("*")
      .eq("proposal_id", id)
      .eq("estado", "girado")
      .order("fecha_giro"),
    supabase.from("event_staff").select("*").eq("proposal_id", id),
  ]);

  return (
    <LegalizacionEditor
      proposalId={id}
      meta={meta as LegalizacionMeta | null}
      initialGastos={(gastos ?? []) as LegalizacionGasto[]}
      anticipos={(giros ?? []) as ViaticoGiro[]}
      staff={(staff ?? []) as EventStaff[]}
    />
  );
}
