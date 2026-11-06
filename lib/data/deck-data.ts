import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, Profile, Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { conCantidadesCalculadas } from "@/lib/data/resumen-precio";
import { DEFAULT_INFORMES } from "@/app/proposals/[id]/presentacion/slides-fixed";
import type { DeckData } from "@/app/proposals/[id]/presentacion/deck-shell";

/**
 * Arma todos los datos con los que se dibuja la Presentación a partir de lo
 * que hay guardado hoy en la propuesta. La misma foto sirve para guardar una
 * versión (se guarda tal cual) y para mostrar la propuesta en vivo.
 */
export async function loadDeckData(supabase: SupabaseClient, id: string): Promise<DeckData | null> {
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

  if (!proposal) return null;

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
    (costItems ?? []) as ProposalCostItem[],
    proposal.modality
  );
  // Mismas cantidades calculadas que el Diagnóstico (cloud y correos usan el aforo): así el valor es igual en todos los pasos.
  const tarifarioSummary = computeTarifarioSummary(
    proposal as Proposal,
    logisticsRates,
    conCantidadesCalculadas(allCostItems, proposal as Proposal),
    honorariosProductorScale ?? []
  );
  const includedServices = allCostItems
    .filter((i) => i.included)
    .map((i) => ({
      baseName: i.label,
      cantidad: Number(i.quantity),
      name: i.custom_name || serviceCatalogItems?.find((c) => c.name === i.label)?.titulo_comercial || i.label,
      description: i.custom_description || serviceCatalogItems?.find((c) => c.name === i.label)?.description || null,
    }));

  const catalogItems = (catalogItemsForModality ?? []).filter(
    (c) => c.modality === proposal.modality || c.modality === "general"
  );

  return {
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
    informes: (proposal as Proposal).presentacion_informes ?? DEFAULT_INFORMES,
  };
}

/** Totales de una versión: misma cuenta que muestran la Inversión y el Presupuesto final. */
export function versionTotals(data: DeckData) {
  const inicial = data.tarifarioSummary.valorPropuestaFinal;
  const descuentoPct = Number(data.proposal.acuerdo_comercial_pct_global ?? 0);
  const descuento = ((inicial - (data.tarifarioSummary.valorNoDescontable ?? 0)) * descuentoPct) / 100;
  const antesIva = inicial - descuento;
  const iva = antesIva * data.tarifarioSummary.ivaRate;
  return { inicial, descuentoPct, antesIva, iva, totalConIva: antesIva + iva };
}
