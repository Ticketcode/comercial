import type { SupabaseClient } from "@supabase/supabase-js";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { computeTarifarioSummary } from "@/lib/pricing/summary";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { computedServiceQuantity } from "@/lib/pricing/service-quantity";
import { aplicarEnMemoria, validarAtomo, type Atomo, type EstadoPropuesta } from "@/lib/ai/cambios";
import type { DatosEnt, EstadoExtra, Fila, ValorEnt } from "@/lib/ai/entidades";

export async function cargarEstado(supabase: SupabaseClient, proposalId: string, conExtra = false) {
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
  const dueno = (proposal as Proposal).owner_id;
  const clienteId = (proposal as Proposal).client_id;
  const [{ data: owner }, { data: cliente }] = await Promise.all([
    dueno ? supabase.from("profiles").select("full_name, cargo, correo, telefono").eq("id", dueno).maybeSingle() : Promise.resolve({ data: null }),
    clienteId ? supabase.from("clients").select("id, contact_name, contact_cargo").eq("id", clienteId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const extra = conExtra ? await cargarExtra(supabase, proposalId, proposal as Proposal) : undefined;
  const estado: EstadoPropuesta = {
    proposal: proposal as Proposal,
    owner: owner ?? null,
    cliente: cliente ?? null,
    extra,
    servicios: items,
    ocultas: (proposal as Proposal).presentacion_hidden_slides ?? [],
  };
  const tasas = buildLogisticsRates(rateRows ?? []);
  // Mismas cantidades que calcula el Diagnóstico (cloud server, correos por aforo…).
  const resumen = (e: EstadoPropuesta) =>
    computeTarifarioSummary(
      e.proposal,
      tasas,
      e.servicios.map((s) => ({ ...s, quantity: computedServiceQuantity(s.label, e.proposal) ?? s.quantity })),
      escalaProductor ?? []
    );
  const total = (e: EstadoPropuesta) => resumen(e).valorPropuestaFinal;
  /** Parte del valor que el descuento del acuerdo comercial no toca (manillas y escarapelas físicas). */
  const noDescontable = (e: EstadoPropuesta) => resumen(e).valorNoDescontable;
  return { estado, total, noDescontable, aforoScales: aforoScales ?? [] };
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
    } else if (atomo.tipo === "entidad") {
      const r = await escribirEntidad(supabase, proposalId, estado, atomo.ent!);
      if (r) return { error: r, estado };
    } else if (atomo.tipo === "presentacion") {
      const sig = aplicarEnMemoria(estado, atomo);
      const campo = atomo.pres!.campo;
      if (campo === "vigenciaDias") {
        const { error } = await supabase.from("proposals").update({ vigencia_dias: sig.proposal.vigencia_dias }).eq("id", proposalId);
        if (error) return { error: error.message, estado };
      } else if (campo === "clienteNombre" || campo === "clienteCargo") {
        const { error } = await supabase
          .from("clients")
          .update({ contact_name: sig.cliente?.contact_name ?? null, contact_cargo: sig.cliente?.contact_cargo ?? null })
          .eq("id", estado.cliente!.id);
        if (error) return { error: error.message, estado };
      } else {
        const { error } = await supabase.from("proposals").update({ presentacion_contacto: sig.proposal.presentacion_contacto }).eq("id", proposalId);
        if (error) return { error: error.message, estado };
      }
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

/** Listas, contrato y cliente completos de la propuesta (para el chat de NOVA). */
async function cargarExtra(supabase: SupabaseClient, proposalId: string, proposal: Proposal): Promise<EstadoExtra> {
  const [cron, pagos, reqs, acuerdo, sel, contrato, cliente] = await Promise.all([
    supabase.from("proposal_schedule_items").select("*").eq("proposal_id", proposalId).order("week_number").order("sort_order"),
    supabase.from("proposal_payment_milestones").select("*").eq("proposal_id", proposalId).order("sort_order"),
    supabase.from("proposal_operational_requirements").select("*").eq("proposal_id", proposalId).order("sort_order"),
    supabase.from("proposal_commercial_agreement").select("*").eq("proposal_id", proposalId).order("sort_order"),
    supabase.from("proposal_catalog_selections").select("*").eq("proposal_id", proposalId),
    supabase.from("proposal_contract_fields").select("*").eq("proposal_id", proposalId).maybeSingle(),
    proposal.client_id ? supabase.from("clients").select("*").eq("id", proposal.client_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ids = (sel.data ?? []).map((s: { catalog_item_id: string }) => s.catalog_item_id);
  const { data: catalogo } = ids.length > 0 ? await supabase.from("catalog_items").select("id, name, category").in("id", ids) : { data: [] };
  const nombres = new Map((catalogo ?? []).map((c: { id: string; name: string; category: string }) => [c.id, c]));

  const fila = (r: Record<string, unknown>): Fila => r as Fila;
  const contratoFila = (contrato.data ?? null) as Record<string, ValorEnt> | null;
  const { proposal_id: _p, ...contratoCampos } = contratoFila ?? ({} as Record<string, ValorEnt>);
  void _p;
  return {
    listas: {
      cronograma: (cron.data ?? []).map(fila),
      pagos: (pagos.data ?? []).map(fila),
      requerimientos: (reqs.data ?? []).map(fila),
      acuerdo: (acuerdo.data ?? []).map(fila),
      // Solo componentes y logística (los servicios personalizados se editan por su propia vía).
      catalogo: (sel.data ?? [])
        .map((s: Record<string, unknown>) => {
          const c = nombres.get(String(s.catalog_item_id));
          return c ? ({ ...s, nombre: c.name, categoria: c.category } as unknown as Fila) : null;
        })
        .filter((x: Fila | null): x is Fila => x !== null),
    },
    contrato: contratoCampos,
    contratoExiste: !!contratoFila,
    cliente: (cliente.data ?? null) as Record<string, ValorEnt> | null,
  };
}

const TABLAS = {
  cronograma: "proposal_schedule_items",
  pagos: "proposal_payment_milestones",
  requerimientos: "proposal_operational_requirements",
  acuerdo: "proposal_commercial_agreement",
  catalogo: "proposal_catalog_selections",
} as const;

/** Escribe un cambio de entidad en su tabla. Devuelve un mensaje de error o null. */
async function escribirEntidad(supabase: SupabaseClient, proposalId: string, estado: EstadoPropuesta, ent: DatosEnt): Promise<string | null> {
  if (ent.entidad === "contrato") {
    const datos = { ...ent.datos };
    const { error } = await supabase.from("proposal_contract_fields").update(datos).eq("proposal_id", proposalId);
    return error?.message ?? null;
  }
  if (ent.entidad === "cliente") {
    const { error } = await supabase.from("clients").update({ ...ent.datos }).eq("id", estado.proposal.client_id!);
    return error?.message ?? null;
  }
  const tabla = TABLAS[ent.entidad];
  if (ent.op === "crear") {
    const orden = estado.extra!.listas[ent.entidad].reduce((m, x) => Math.max(m, Number(x.sort_order ?? 0)), -1) + 1;
    const { error } = await supabase.from(tabla).insert({ id: ent.id, proposal_id: proposalId, sort_order: orden, ...ent.datos });
    return error?.message ?? null;
  }
  if (ent.op === "borrar") {
    const { error } = await supabase.from(tabla).delete().eq("id", ent.id!).eq("proposal_id", proposalId);
    return error?.message ?? null;
  }
  const { error } = await supabase.from(tabla).update({ ...ent.datos }).eq("id", ent.id!).eq("proposal_id", proposalId);
  return error?.message ?? null;
}
