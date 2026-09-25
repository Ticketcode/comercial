import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { effectiveProposal } from "@/lib/pricing/effective-proposal";
import { buildLogisticsRates, computeLogisticsBreakdown, esBogota } from "@/lib/pricing/logistics";
import { splitViaticos } from "@/lib/pricing/viaticos-split";
import type { EventStaff, Proposal, ProposalCostItem, ViaticoGiro } from "@/lib/types";
import { ProduccionEditor } from "./produccion-editor";

export default async function ProduccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: costItems },
    { data: rateRows },
    { data: honorariosProductorScale },
    { data: staff },
    { data: giros },
  ] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("proposal_cost_items").select("*").eq("proposal_id", id),
    supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
    supabase
      .from("price_scale_items")
      .select("tier_min, tier_max, unit_value")
      .eq("scale_group", "honorarios_productor")
      .order("sort_order"),
    supabase.from("event_staff").select("*").eq("proposal_id", id).order("sort_order"),
    supabase.from("viatico_giros").select("*").eq("proposal_id", id).order("sort_order"),
  ]);

  if (!proposal) notFound();

  const { items: serviceItems } = await getValidServiceCostItems(
    supabase,
    (costItems ?? []) as ProposalCostItem[]
  );
  const logisticsRates = buildLogisticsRates(rateRows ?? []);
  const proposalEfectiva = effectiveProposal(proposal as Proposal, serviceItems);

  const breakdown = computeLogisticsBreakdown(
    {
      dias: Number(proposalEfectiva.dias),
      aforoPresencial: Number(proposalEfectiva.aforo ?? 0),
      ciudad: proposalEfectiva.city,
      modalidad: proposalEfectiva.modality,
      visitaPreoperativaDias: Number(proposalEfectiva.visita_preoperativa_dias),
      qtyLogistico: Number(proposalEfectiva.qty_logistico),
      qtySupervisor: Number(proposalEfectiva.qty_supervisor),
      qtyLogisticaSalonesInternos: Number(proposalEfectiva.qty_logistica_salones_internos),
      qtyProductor: Number(proposalEfectiva.qty_productor),
      qtyTransporteAeropuerto: Number(proposalEfectiva.qty_transporte_aeropuerto),
      qtyComputadores: Number(proposalEfectiva.qty_computadores),
      qtyImpresoras: Number(proposalEfectiva.qty_impresoras),
      qtyRollosLabels: Number(proposalEfectiva.qty_rollos_labels),
      extraCamisetasStaff: proposalEfectiva.extra_camisetas_staff,
      extraLavadoChalecos: proposalEfectiva.extra_lavado_chalecos,
      extraCompraAgua: proposalEfectiva.extra_compra_agua,
      extraCompraBloqueadorSolar: proposalEfectiva.extra_compra_bloqueador_solar,
      extraActividadCierre: proposalEfectiva.extra_actividad_cierre,
    },
    logisticsRates,
    honorariosProductorScale ?? []
  );

  const qtyStaffViaja = Number(proposalEfectiva.qty_supervisor) + Number(proposalEfectiva.qty_productor);
  const split = splitViaticos(breakdown, qtyStaffViaja);

  // Tarifas fijas (no dependen de días/aforo/personal) — se muestran como
  // referencia para armar rubros manuales, sea que el evento tenga o no
  // Tarifario diligenciado.
  const bogota = esBogota(proposalEfectiva.city);
  const tarifasReferencia = {
    alimentacion: {
      "Desayuno (staff)": logisticsRates.desayunoStaff,
      "Almuerzo (staff)": logisticsRates.almuerzoStaff,
      "Almuerzo (logística)": logisticsRates.almuerzoLogistica,
      "Cena (staff)": logisticsRates.cenasStaff,
      "Refrigerio (logística)": logisticsRates.refrigerioLogistica,
      "Hospedaje (noche)": logisticsRates.hospedaje,
    },
    transporte: {
      "Transporte local": bogota ? logisticsRates.transporteLocal.bogota : logisticsRates.transporteLocal.otras,
      "Transporte case": bogota ? logisticsRates.transporteCase.bogota : logisticsRates.transporteCase.otras,
      "Aeropuerto → hotel": bogota
        ? logisticsRates.transporteAeropuertoHotel.bogota
        : logisticsRates.transporteAeropuertoHotel.otras,
      "Transporte nacional (origen)": logisticsRates.transporteNacional,
      "Tiquete aéreo": logisticsRates.tiqueteAereo,
    },
  };

  return (
    <ProduccionEditor
      proposalId={id}
      initialStaff={(staff ?? []) as EventStaff[]}
      initialGiros={(giros ?? []) as ViaticoGiro[]}
      split={split}
      tarifasReferencia={tarifasReferencia}
    />
  );
}
