import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates, staffingForAforo } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { armarResumen, conCantidadesCalculadas } from "@/lib/data/resumen-precio";
import { faltantesDiagnostico } from "@/lib/data/faltantes";
import { controladoPorPregunta, necesitaLogistica, servicioDisponible } from "@/lib/data/servicios-alcance";
import { DiagnosticoGuiado, type DatosGuiado } from "./diagnostico-guiado";
import { notaServicio } from "./nota-servicio";

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
  const pre = serviceItems.find(
    (i) => i.included && i.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("pre acreditacion")
  );
  const summary = computeTarifarioSummary(p, logisticsRates, conCantidadesCalculadas(serviceItems, p), honorariosProductorScale ?? []);
  const tabla = staffingForAforo(Number(p.aforo ?? 0), aforoScales ?? []);
  const preDias = pre ? Number(pre.quantity) : 0;

  const datos: DatosGuiado = {
    proposalId: id,
    eventName: p.event_name,
    modality: p.modality,
    dias: Number(p.dias),
    vendeBoletas: p.vende_boletas !== false,
    conLogistica: p.con_logistica !== false,
    conEve: p.con_eve === true,
    soloEve: p.solo_eve === true,
    eveAcompanamiento: p.eve_acompanamiento === true,
    eveEquipo: Number(p.eve_qty_equipo ?? 3),
    eve: {
      asistentes: summary.eve.asistentes,
      fee: summary.eve.fee,
      porAsistente: summary.eve.porAsistente,
      total: summary.eve.total,
      acompanamiento: summary.eveAcompanamientoPrecio,
    },
    precio: {
      rentabilidadPct: Math.round(Number(p.rentabilidad_pct) * 10000) / 100,
      comDirectorPct: Math.round(Number(p.comision_director_pct) * 10000) / 100,
      comAsesorPct: Math.round(Number(p.comision_asesor_pct) * 10000) / 100,
      tasaConversionPct: Math.round(Number(p.tasa_conversion_pct) * 10000) / 100,
      ivaPct: Math.round(summary.ivaRate * 10000) / 100,
      ivaManual: p.iva_rate_override != null,
      baseGravable: p.base_gravable_override != null ? Number(p.base_gravable_override) : null,
      baseAutomatica: summary.valorPropuestaFinal,
    },
    ajustes: {
      visitaPreop: Number(p.visita_preoperativa_dias ?? 0),
      rollos: Number(p.qty_rollos_labels ?? 0),
      transporteAeropuerto: Number(p.qty_transporte_aeropuerto ?? 0),
      camisetas: !!p.extra_camisetas_staff,
      chalecos: !!p.extra_lavado_chalecos,
      agua: !!p.extra_compra_agua,
      bloqueador: !!p.extra_compra_bloqueador_solar,
      cierre: !!p.extra_actividad_cierre,
    },
    city: p.city ?? "",
    lugar: p.lugar ?? "",
    fechaInicio: p.event_start_date ?? "",
    fechaFin: p.event_end_date ?? "",
    aforo: Number(p.aforo ?? 0),
    aforoVirtual: Number(p.aforo_virtual ?? 0),
    salones: (p.salones_internos_aforos ?? []).map(Number),
    preModo: preDias > 0 ? (p.preacreditacion_medio_dia ? "medio" : "completo") : "no",
    preDias,
    productor: Number(p.qty_productor),
    supervisores: Number(p.qty_supervisor),
    logisticos: Number(p.qty_logistico),
    computadores: Number(p.qty_computadores),
    impresoras: Number(p.qty_impresoras),
    tabla: tabla
      ? { logistico: tabla.logistico, supervisor: tabla.supervisor, productor: tabla.productor, computadores: tabla.computadores, impresoras: tabla.impresoras }
      : null,
    faltantes: faltantesDiagnostico(p),
    logistica: {
      rubros: [
        ["Honorarios", summary.logistica.lineItems.honorarios, summary.logistica.honorarios],
        ["Alimentación y hotel", summary.logistica.lineItems.alimentacionHotel, summary.logistica.alimentacionHotel],
        ["Transporte", summary.logistica.lineItems.transporte, summary.logistica.transporte],
        ["Equipos", summary.logistica.lineItems.equipos, summary.logistica.equipos],
        ["Costos varios", summary.logistica.lineItems.costosVarios, summary.logistica.costosVarios],
      ].map(([titulo, lineas, total]) => ({
        titulo: titulo as string,
        total: total as number,
        lineas: (lineas as typeof summary.logistica.lineItems.honorarios).map((l) => ({
          label: l.label,
          basis: l.basis,
          dias: l.dias,
          cantidad: l.quantity,
          tarifa: l.rate,
          subtotal: l.subtotal,
          ajustado: !!l.overridden,
        })),
      })),
      subtotal: summary.logistica.subTotalCostoLogistica,
      imprevistos: summary.logistica.totalCostoLogisticaConImprevistos - summary.logistica.subTotalCostoLogistica,
      total: summary.logistica.totalCostoLogisticaConImprevistos,
    },
    resumen: armarResumen(summary, p),
    servicios: serviceItems
      // Lo ya incluido se muestra siempre (cuesta); lo disponible, solo si aplica a este evento y no se define con la pre-acreditación.
      .filter((i) => i.included || (servicioDisponible(i.label, p) && !controladoPorPregunta(i.label)))
      .map((i) => ({
        label: i.label,
        incluido: !!i.included,
        precio: Number(i.unit_cost),
        cantidad: computedServiceQuantity(i.label, p) ?? Number(i.quantity),
        ...notaServicio(i.label, p),
        sinCosto: p.con_logistica === false && necesitaLogistica(i.label),
      })),
  };

  return <DiagnosticoGuiado datos={datos} />;
}
export const metadata = { title: "Diagnóstico" };
