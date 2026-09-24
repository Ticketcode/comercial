import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { REQUERIMIENTOS_OPERATIVOS_TEMPLATE } from "@/lib/schedule-templates";
import { PropuestaEditor } from "./propuesta-editor";

export default async function PropuestaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: costItems }, { data: rateRows }, { data: honorariosProductorScale }] =
    await Promise.all([
      supabase.from("proposals").select("*").eq("id", id).single(),
      supabase.from("proposal_cost_items").select("*").eq("proposal_id", id),
      supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
      supabase
        .from("price_scale_items")
        .select("tier_min, tier_max, unit_value")
        .eq("scale_group", "honorarios_productor")
        .order("sort_order"),
    ]);

  if (!proposal) notFound();

  // Presupuesto inicial/final calculados en el Tarifario.
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

  // Servicios personalizados elegidos en el Tarifario (included=true) —
  // se muestran en la Propuesta como lo que el cliente contrata, con su
  // descripción, sin exponer costos internos.
  const includedServices = allCostItems
    .filter((i) => i.included)
    .map((i) => ({
      name: i.label,
      description: serviceCatalogItems?.find((c) => c.name === i.label)?.description ?? null,
    }));

  // Siembra perezosa: Componentes básicos + Logística 360 (según
  // modalidad), Acuerdo Comercial, Cronograma, Modelo de pagos y
  // Requerimientos operativos — todo editable desde acá.
  const { data: catalogItemsForModality } = await supabase
    .from("catalog_items")
    .select("*")
    .in("category", ["componente_basico", "logistica_360"])
    .in("modality", [proposal.modality, "general"])
    .order("sort_order");

  const { data: existingSelections } = await supabase
    .from("proposal_catalog_selections")
    .select("*")
    .eq("proposal_id", id);

  let selections = existingSelections ?? [];
  const missingCatalogIds = (catalogItemsForModality ?? [])
    .filter((c) => !selections.some((s) => s.catalog_item_id === c.id))
    .map((c) => c.id);
  if (missingCatalogIds.length > 0) {
    const rows = missingCatalogIds.map((catalog_item_id) => {
      const item = catalogItemsForModality!.find((c) => c.id === catalog_item_id)!;
      return {
        proposal_id: id,
        catalog_item_id,
        included: item.default_included,
        quantity: 1,
      };
    });
    const { data: inserted } = await supabase
      .from("proposal_catalog_selections")
      .insert(rows)
      .select("*");
    selections = [...selections, ...(inserted ?? [])];
  }

  const { data: existingAgreement } = await supabase
    .from("proposal_commercial_agreement")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order");

  let agreementItems = existingAgreement ?? [];
  if (agreementItems.length === 0) {
    const { data: tiers } = await supabase
      .from("commercial_agreement_tiers")
      .select("*")
      .order("sort_order");
    const rows = (tiers ?? []).map((tier) => ({
      proposal_id: id,
      tier_id: tier.id,
      label: tier.name,
      pct: Number(tier.default_pct),
      included: false,
      notes: tier.description,
      sort_order: tier.sort_order,
    }));
    if (rows.length > 0) {
      const { data: inserted } = await supabase
        .from("proposal_commercial_agreement")
        .insert(rows)
        .select("*");
      agreementItems = inserted ?? [];
    }
  }

  const { data: existingSchedule } = await supabase
    .from("proposal_schedule_items")
    .select("*")
    .eq("proposal_id", id)
    .order("week_number");

  let scheduleItems = existingSchedule ?? [];
  if (scheduleItems.length === 0) {
    const { defaultScheduleFor } = await import("@/lib/schedule-templates");
    const template = defaultScheduleFor(proposal.modality);
    const rows = template.map((item, idx) => ({
      proposal_id: id,
      week_number: item.week_number,
      hito: item.hito,
      comentario: item.comentario,
      sort_order: idx,
    }));
    const { data: inserted } = await supabase
      .from("proposal_schedule_items")
      .insert(rows)
      .select("*");
    scheduleItems = inserted ?? [];
  }

  const { data: existingMilestones } = await supabase
    .from("proposal_payment_milestones")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order");

  let paymentMilestones = existingMilestones ?? [];
  if (paymentMilestones.length === 0) {
    const { data: inserted } = await supabase
      .from("proposal_payment_milestones")
      .insert([
        {
          proposal_id: id,
          label: "Pago único — a la firma del contrato",
          pct: 100,
          sort_order: 0,
        },
      ])
      .select("*");
    paymentMilestones = inserted ?? [];
  }

  const { data: existingRequirements } = await supabase
    .from("proposal_operational_requirements")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order");

  let operationalRequirements = existingRequirements ?? [];
  if (operationalRequirements.length === 0) {
    const lines = REQUERIMIENTOS_OPERATIVOS_TEMPLATE.split("\n").filter(Boolean);
    const rows = lines.map((text, idx) => ({
      proposal_id: id,
      text,
      sort_order: idx,
    }));
    const { data: inserted } = await supabase
      .from("proposal_operational_requirements")
      .insert(rows)
      .select("*");
    operationalRequirements = inserted ?? [];
  }

  return (
    <PropuestaEditor
      proposal={proposal as Proposal}
      tarifarioSummary={tarifarioSummary}
      catalogItems={catalogItemsForModality ?? []}
      catalogSelections={selections}
      includedServices={includedServices}
      agreementItems={agreementItems}
      scheduleItems={scheduleItems}
      paymentMilestones={paymentMilestones}
      operationalRequirements={operationalRequirements}
    />
  );
}
