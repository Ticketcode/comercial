"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { staffingForAforo } from "@/lib/pricing/logistics";

export interface NewProposalState {
  error: string | null;
}

export async function createProposal(
  _prevState: NewProposalState,
  formData: FormData
): Promise<NewProposalState> {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientCompany = String(formData.get("client_company") ?? "").trim();
  const eventName = String(formData.get("event_name") ?? "").trim();
  const modality = String(formData.get("modality") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const aforo = Number(formData.get("aforo") ?? 0) || null;
  const eventStartDate = String(formData.get("event_start_date") ?? "") || null;
  const eventEndDate = String(formData.get("event_end_date") ?? "") || null;

  if (!clientName || !eventName || !modality) {
    return { error: "Cliente, nombre del evento y modalidad son obligatorios." };
  }

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: clientName,
      company: clientCompany || null,
      city: city || null,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    return { error: `No se pudo crear el cliente: ${clientError?.message}` };
  }

  // Dotación de personal/equipos sugerida según el aforo (Tabla de
  // Cantidades X Aforo) — punto de partida editable, no un valor fijo.
  let staffingDefaults: Record<string, number> = {};
  if (aforo) {
    const { data: scales } = await supabase
      .from("aforo_scales")
      .select("min_assistants, max_assistants, staffing_rules");
    const staffing = staffingForAforo(aforo, scales ?? []);
    if (staffing) {
      staffingDefaults = {
        qty_logistico: staffing.logistico,
        qty_supervisor: staffing.supervisor,
        qty_productor: staffing.productor,
        qty_computadores: staffing.computadores,
        qty_impresoras: staffing.impresoras,
        qty_rollos_labels: staffing.rollos_labels,
      };
    }
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      client_id: client.id,
      owner_id: userData.user?.id ?? null,
      event_name: eventName,
      modality,
      city: city || null,
      aforo,
      event_start_date: eventStartDate,
      event_end_date: eventEndDate,
      ...staffingDefaults,
    })
    .select("id")
    .single();

  if (proposalError || !proposal) {
    return { error: `No se pudo crear la propuesta: ${proposalError?.message}` };
  }

  // Precarga las filas de Servicios personalizados desde el catálogo, sin
  // incluir por defecto — el comercial las activa según lo que necesite el
  // evento. La Logística 360 no se prellena como filas: se calcula sola a
  // partir de los "Datos del evento" (ver lib/pricing/logistics.ts).
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
    const { error: costItemsError } = await supabase
      .from("proposal_cost_items")
      .insert(costItemRows);
    if (costItemsError) {
      return { error: `No se pudieron precargar los ítems: ${costItemsError.message}` };
    }
  }

  redirect(`/proposals/${proposal.id}/tarifario`);
}
