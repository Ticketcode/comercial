"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";

export interface CreateOperationalEventState {
  error: string | null;
}

/**
 * Eventos que el equipo de producción ya está operando pero que no pasaron
 * por el flujo comercial (Tarifario/Propuesta/Contrato) en esta app — se
 * crean directo como "cerrados" para habilitar Viáticos/Actividades/Cuentas
 * de cobro sin necesidad de llenar el Tarifario.
 */
export async function createOperationalEvent(
  _prevState: CreateOperationalEventState,
  formData: FormData
): Promise<CreateOperationalEventState> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    return { error: "No autorizado." };
  }

  const eventName = String(formData.get("event_name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientCompany = String(formData.get("client_company") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const modality = String(formData.get("modality") ?? "presencial");

  if (!eventName || !clientName) {
    return { error: "Nombre del evento y cliente son obligatorios." };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name: clientName, company: clientCompany || null, city: city || null })
    .select("id")
    .single();
  if (clientError || !client) {
    return { error: `No se pudo crear el cliente: ${clientError?.message}` };
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      client_id: client.id,
      event_name: eventName,
      modality,
      city: city || null,
      status: "cerrada",
      // Los defaults de estas columnas son para el flujo comercial (punto
      // de partida antes de llenar el Tarifario). Un evento operativo
      // creado directo en Producción no tiene Tarifario, así que arrancan
      // en 0 para no mostrar un anticipo de Viáticos inventado.
      dias: 0,
      aforo: 0,
      qty_logistico: 0,
      qty_supervisor: 0,
      qty_productor: 0,
      qty_computadores: 0,
      qty_impresoras: 0,
      qty_rollos_labels: 0,
    })
    .select("id")
    .single();
  if (proposalError || !proposal) {
    return { error: `No se pudo crear el evento: ${proposalError?.message}` };
  }

  // Precarga las filas de Servicios personalizados desde el catálogo (sin
  // incluir por defecto), igual que el flujo comercial — así el Tarifario
  // de este evento se ve completo cuando lo abran para editar días/aforo.
  const { data: serviceItems } = await supabase
    .from("catalog_items")
    .select("id, name, default_unit_price, default_included")
    .eq("category", "servicio_personalizado")
    .order("sort_order");

  const costItemRows = (serviceItems ?? []).map((item, index) => ({
    proposal_id: proposal.id,
    logistics_rate_item_id: null,
    label: item.name,
    included: item.default_included,
    quantity: item.default_included ? 1 : 0,
    unit_cost: item.default_unit_price ?? 0,
    unit_price: 0,
    sort_order: index,
  }));

  if (costItemRows.length > 0) {
    await supabase.from("proposal_cost_items").insert(costItemRows);
  }

  redirect(`/proposals/${proposal.id}/tarifario`);
}
