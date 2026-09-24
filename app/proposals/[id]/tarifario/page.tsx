import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { TarifarioEditor } from "./tarifario-editor";

export default async function TarifarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: costItems },
    { data: rateRows },
    { data: honorariosProductorScale },
    { data: aforoScales },
  ] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase
      .from("proposal_cost_items")
      .select("*")
      .eq("proposal_id", id)
      .order("sort_order"),
    supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
    supabase
      .from("price_scale_items")
      .select("tier_min, tier_max, unit_value")
      .eq("scale_group", "honorarios_productor")
      .order("sort_order"),
    supabase.from("aforo_scales").select("min_assistants, max_assistants, staffing_rules"),
  ]);

  if (!proposal || !costItems) notFound();

  const logisticsRates = buildLogisticsRates(rateRows ?? []);

  const { items: serviceItems } = await getValidServiceCostItems(
    supabase,
    costItems as ProposalCostItem[]
  );

  return (
    <div>
      <p className="mb-6 text-sm text-neutral-500">
        Llena los datos del evento — la Logística 360 se calcula sola. Después elige los
        servicios personalizados que aplican para esta propuesta.
      </p>
      <TarifarioEditor
        proposal={proposal as Proposal}
        serviceItems={serviceItems}
        logisticsRates={logisticsRates}
        honorariosProductorScale={honorariosProductorScale ?? []}
        aforoScales={aforoScales ?? []}
      />
    </div>
  );
}
