import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildLogisticsRates, esBogota } from "@/lib/pricing/logistics";
import type { EventStaff, ViaticoAnticipo, ViaticoGiro } from "@/lib/types";
import { ProduccionEditor } from "./produccion-editor";

export const dynamic = "force-dynamic";

export default async function ProduccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: rateRows }, { data: staff }, { data: giros }, { data: anticipos }] =
    await Promise.all([
      supabase
        .from("proposals")
        .select("id, city, event_name, event_start_date, event_end_date")
        .eq("id", id)
        .single(),
      supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
      supabase.from("event_staff").select("*").eq("proposal_id", id).order("sort_order"),
      supabase.from("viatico_giros").select("*").eq("proposal_id", id).order("sort_order"),
      supabase.from("viatico_anticipos").select("*").eq("proposal_id", id).order("sort_order"),
    ]);

  if (!proposal) notFound();

  const logisticsRates = buildLogisticsRates(rateRows ?? []);

  // Tarifas fijas (no dependen de días/aforo/personal) — se muestran como
  // referencia para que cada persona arme su cuadro de rubros manualmente.
  const bogota = esBogota(proposal.city);
  const tarifasReferencia = {
    alimentacion: {
      "Desayuno (staff)": logisticsRates.desayunoStaff,
      "Almuerzo (staff)": logisticsRates.almuerzoStaff,
      "Almuerzo (logística)": logisticsRates.almuerzoLogistica,
      "Cena (staff)": logisticsRates.cenasStaff,
      "Refrigerio (logística)": logisticsRates.refrigerioLogistica,
    },
    alojamiento: {
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
      eventName={proposal.event_name}
      eventCity={proposal.city}
      eventStartDate={proposal.event_start_date}
      eventEndDate={proposal.event_end_date}
      initialStaff={(staff ?? []) as EventStaff[]}
      initialGiros={(giros ?? []) as ViaticoGiro[]}
      initialAnticipos={(anticipos ?? []) as ViaticoAnticipo[]}
      tarifasReferencia={tarifasReferencia}
    />
  );
}
