import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates, staffingForAforo } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { TarifarioEditor } from "./tarifario-editor";
import { DiagnosticoGuiado, type DatosGuiado } from "./diagnostico-guiado";
import { VistaDiagnostico } from "./vista-diagnostico";
import type { EstadoPregunta } from "./guiado-actions";

// Evita que Next cachee las consultas a Supabase entre requests — sin esto,
// un cambio en el Catálogo de precios podía no reflejarse aquí hasta que
// expirara el cache de fetch.
export const dynamic = "force-dynamic";

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
    costItems as ProposalCostItem[],
    proposal.modality
  );

  const p = proposal as Proposal;
  const incluido = (frase: string) =>
    serviceItems.find((i) => i.included && i.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(frase));
  const pre = incluido("pre acreditacion");
  const summary = computeTarifarioSummary(
    p,
    logisticsRates,
    serviceItems.map((i) => ({ ...i, quantity: computedServiceQuantity(i.label, p) ?? i.quantity })),
    honorariosProductorScale ?? []
  );
  const tabla = staffingForAforo(Number(p.aforo ?? 0), aforoScales ?? []);
  const datos: DatosGuiado = {
    proposalId: id,
    eventName: p.event_name,
    modality: p.modality,
    aforo: Number(p.aforo ?? 0),
    aforoVirtual: Number(p.aforo_virtual ?? 0),
    dias: Number(p.dias),
    city: p.city ?? "",
    productor: Number(p.qty_productor),
    supervisores: Number(p.qty_supervisor),
    logisticos: Number(p.qty_logistico),
    preMedioDia: p.preacreditacion_medio_dia,
    preDias: pre ? Number(pre.quantity) : 0,
    puntos: Number(incluido("venta de boleteria en sitio")?.quantity ?? 0),
    manillas: !!incluido("manillas"),
    escarapelas: !!incluido("escarapelas fisicas"),
    branding: !!incluido("branding"),
    labels: !!incluido("labels de seguridad"),
    tabla: tabla ? { logistico: tabla.logistico, supervisor: tabla.supervisor, productor: tabla.productor } : null,
    estado: ((proposal as { diagnostico_estado?: Record<string, EstadoPregunta> }).diagnostico_estado ?? {}) as Record<string, EstadoPregunta>,
    resumen: {
      logistica: summary.logistica.totalCostoLogisticaConImprevistos,
      servicios: summary.subtotalServicios,
      totalCosto: summary.totalCosto,
      rentabilidadPct: Number(p.rentabilidad_pct),
      rentabilidad: summary.rentabilidad,
      comisionesPct: Number(p.comision_director_pct) + Number(p.comision_asesor_pct),
      comisiones: summary.costoDirectorComercial + summary.costoAsesorComercial,
      valorFinal: summary.valorPropuestaFinal,
      iva: summary.iva,
      ivaRate: summary.ivaRate,
      total: summary.valorPropuestaFinal + summary.iva,
    },
    servicios: serviceItems.map((i) => ({
      label: i.label,
      incluido: !!i.included,
      precio: Number(i.unit_cost),
      cantidad: computedServiceQuantity(i.label, p) ?? Number(i.quantity),
    })),
  };

  return (
    <VistaDiagnostico
      guiado={<DiagnosticoGuiado datos={datos} />}
      avanzado={
        <div>
          <p className="mb-6 text-sm text-muted">
            Llena los datos del evento — la Logística 360 se calcula sola. Después elige los servicios personalizados que aplican para esta propuesta.
          </p>
          <TarifarioEditor
            proposal={p}
            serviceItems={serviceItems}
            logisticsRates={logisticsRates}
            honorariosProductorScale={honorariosProductorScale ?? []}
            aforoScales={aforoScales ?? []}
          />
        </div>
      }
    />
  );
}
export const metadata = { title: "Diagnóstico" };
