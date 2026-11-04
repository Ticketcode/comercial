import type { SupabaseClient } from "@supabase/supabase-js";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";
import { aplicarEnMemoria, validarAtomo, type Atomo, type EstadoPropuesta } from "@/lib/ai/cambios";

export async function cargarEstado(supabase: SupabaseClient, proposalId: string) {
  const [{ data: proposal }, { data: costItems }, { data: rateRows }, { data: escalaProductor }, { data: aforoScales }] =
    await Promise.all([
      supabase.from("proposals").select("*").eq("id", proposalId).single(),
      supabase.from("proposal_cost_items").select("*").eq("proposal_id", proposalId).order("sort_order"),
      supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
      supabase.from("price_scale_items").select("tier_min, tier_max, unit_value").eq("scale_group", "honorarios_productor").order("sort_order"),
      supabase.from("aforo_scales").select("min_assistants, max_assistants, staffing_rules"),
    ]);
  if (!proposal) return null;
  const { items } = await getValidServiceCostItems(supabase, (costItems ?? []) as ProposalCostItem[], proposal.modality);
  const estado: EstadoPropuesta = {
    proposal: proposal as Proposal,
    servicios: items,
    ocultas: (proposal as Proposal).presentacion_hidden_slides ?? [],
  };
  const tasas = buildLogisticsRates(rateRows ?? []);
  // Mismas cantidades que calcula el Diagnóstico (cloud server, correos por aforo…).
  const total = (e: EstadoPropuesta) =>
    computeTarifarioSummary(
      e.proposal,
      tasas,
      e.servicios.map((s) => ({ ...s, quantity: computedServiceQuantity(s.label, e.proposal) ?? s.quantity })),
      escalaProductor ?? []
    ).valorPropuestaFinal;
  return { estado, total, aforoScales: aforoScales ?? [] };
}

/** Escribe en la base los cambios ya aceptados. Cada uno se vuelve a validar: el navegador no es de fiar. */
export async function aplicarAtomos(
  supabase: SupabaseClient,
  proposalId: string,
  estadoInicial: EstadoPropuesta,
  atomos: Atomo[]
): Promise<{ error: string | null; estado: EstadoPropuesta }> {
  let estado = estadoInicial;
  for (const atomo of atomos) {
    const problema = validarAtomo(atomo, estado);
    if (problema) return { error: problema, estado };

    if (atomo.tipo === "campos") {
      const { error } = await supabase.from("proposals").update(atomo.campos!).eq("id", proposalId);
      if (error) return { error: error.message, estado };
    } else if (atomo.tipo === "servicio") {
      const fila = estado.servicios.find((s) => s.label === atomo.servicio!.label)!;
      const cambios: Record<string, unknown> = { included: atomo.servicio!.incluir };
      if (atomo.servicio!.cantidad !== undefined) cambios.quantity = atomo.servicio!.cantidad;
      else if (atomo.servicio!.incluir && !(Number(fila.quantity) > 0)) cambios.quantity = 1;
      const { error } = await supabase.from("proposal_cost_items").update(cambios).eq("id", fila.id);
      if (error) return { error: error.message, estado };
    } else if (atomo.tipo === "textoServicio") {
      const fila = estado.servicios.find((s) => s.label === atomo.texto!.label)!;
      const cambios: Record<string, unknown> = {};
      if (atomo.texto!.titulo !== undefined) cambios.custom_name = atomo.texto!.titulo;
      if (atomo.texto!.descripcion !== undefined) cambios.custom_description = atomo.texto!.descripcion;
      const { error } = await supabase.from("proposal_cost_items").update(cambios).eq("id", fila.id);
      if (error) return { error: error.message, estado };
    } else if (atomo.tipo === "lamina") {
      const sig = aplicarEnMemoria(estado, atomo).ocultas;
      const { error } = await supabase.from("proposals").update({ presentacion_hidden_slides: sig }).eq("id", proposalId);
      if (error) return { error: error.message, estado };
    }
    estado = aplicarEnMemoria(estado, atomo);
  }

  // Si cambió el aforo o los días, los servicios con cantidad calculada se actualizan para que
  // todos los pasos (Propuesta, Presentación, Contrato) lean lo mismo.
  for (const s of estado.servicios) {
    const calc = computedServiceQuantity(s.label, estado.proposal);
    if (calc !== null && s.included && Number(s.quantity) !== calc) {
      await supabase.from("proposal_cost_items").update({ quantity: calc }).eq("id", s.id);
    }
  }


  return { error: null, estado };
}

/**
 * Marca preguntas del Diagnóstico guiado ("ia" = las contestó NOVA y falta confirmar).
 * Si la columna aún no existe (migración 0044) no frena nada.
 */
export async function marcarPreguntas(
  supabase: SupabaseClient,
  proposalId: string,
  estado: EstadoPropuesta,
  ids: string[],
  valor: "ia" | "ok" | "na" = "ia"
) {
  if (ids.length === 0) return;
  const previo = ((estado.proposal as unknown as { diagnostico_estado?: Record<string, string> }).diagnostico_estado ?? {}) as Record<string, string>;
  const sig = { ...previo };
  for (const id of ids) sig[id] = valor;
  await supabase.from("proposals").update({ diagnostico_estado: sig }).eq("id", proposalId);
}
