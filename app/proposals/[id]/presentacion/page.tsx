import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Profile, Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { PresentacionViewer } from "./presentacion-viewer";
import type { DeckData } from "./deck-shell";

export const dynamic = "force-dynamic";

export default async function PresentacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: costItems },
    { data: rateRows },
    { data: honorariosProductorScale },
    { data: catalogItemsForModality },
    { data: selections },
    { data: agreementItems },
    { data: scheduleItems },
    { data: paymentMilestones },
    { data: operationalRequirements },
  ] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("proposal_cost_items").select("*").eq("proposal_id", id),
    supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
    supabase
      .from("price_scale_items")
      .select("tier_min, tier_max, unit_value")
      .eq("scale_group", "honorarios_productor")
      .order("sort_order"),
    supabase
      .from("catalog_items")
      .select("*")
      .in("category", ["componente_basico", "logistica_360"])
      .order("sort_order"),
    supabase.from("proposal_catalog_selections").select("*").eq("proposal_id", id),
    supabase.from("proposal_commercial_agreement").select("*").eq("proposal_id", id).order("sort_order"),
    supabase.from("proposal_schedule_items").select("*").eq("proposal_id", id).order("week_number"),
    supabase.from("proposal_payment_milestones").select("*").eq("proposal_id", id).order("sort_order"),
    supabase.from("proposal_operational_requirements").select("*").eq("proposal_id", id).order("sort_order"),
  ]);

  if (!proposal) notFound();

  const [{ data: client }, { data: owner }] = await Promise.all([
    proposal.client_id
      ? supabase.from("clients").select("*").eq("id", proposal.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    proposal.owner_id
      ? supabase.from("profiles").select("*").eq("id", proposal.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const logisticsRates = buildLogisticsRates(rateRows ?? []);
  const { items: allCostItems, catalog: serviceCatalogItems } = await getValidServiceCostItems(
    supabase,
    (costItems ?? []) as ProposalCostItem[]
  );
  const tarifarioSummary = computeTarifarioSummary(
    proposal as Proposal,
    logisticsRates,
    allCostItems,
    honorariosProductorScale ?? []
  );
  const includedServices = allCostItems
    .filter((i) => i.included)
    .map((i) => ({
      name: i.label,
      description: serviceCatalogItems?.find((c) => c.name === i.label)?.description ?? null,
    }));

  const catalogItems = (catalogItemsForModality ?? []).filter(
    (c) => c.modality === proposal.modality || c.modality === "general"
  );

  const data: DeckData = {
    proposal: proposal as Proposal,
    client: (client as Client | null) ?? null,
    owner: (owner as Profile | null) ?? null,
    tarifarioSummary,
    catalogItems,
    catalogSelections: selections ?? [],
    includedServices,
    agreementItems: agreementItems ?? [],
    scheduleItems: scheduleItems ?? [],
    paymentMilestones: paymentMilestones ?? [],
    operationalRequirements: operationalRequirements ?? [],
    propuestaFecha: new Date().toISOString().slice(0, 10),
  };

  return <PresentacionViewer data={data} />;
}
export const metadata = { title: "Presentación" };
