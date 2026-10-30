"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Modality } from "@/lib/types";

export interface SaveProposalBasicsPayload {
  proposalId: string;
  clientId: string | null;
  eventName: string;
  modality: Modality;
  city: string;
  lugar: string;
  aforo: number | null;
  aforoVirtual: number;
  dias: number;
  eventStartDate: string | null;
  eventEndDate: string | null;
  clientName: string;
  clientCompany: string;
  clientCargo: string;
}

/** Edita los datos capturados al crear la propuesta — accesible desde
 * cualquier paso (Tarifario/Propuesta/Contrato/Presentación), no solo al
 * crearla. No toca cálculos ni estados de los demás pasos. */
export async function saveProposalBasics(payload: SaveProposalBasicsPayload) {
  const supabase = await createClient();

  if (payload.clientId) {
    const { error: clientError } = await supabase
      .from("clients")
      .update({
        name: payload.clientName,
        company: payload.clientCompany || null,
        contact_cargo: payload.clientCargo || null,
      })
      .eq("id", payload.clientId);
    if (clientError) return { error: clientError.message };
  }

  const { error: proposalError } = await supabase
    .from("proposals")
    .update({
      event_name: payload.eventName,
      modality: payload.modality,
      city: payload.city || null,
      lugar: payload.lugar || null,
      aforo: payload.aforo,
      aforo_virtual: payload.aforoVirtual,
      dias: payload.dias,
      event_start_date: payload.eventStartDate || null,
      event_end_date: payload.eventEndDate || null,
    })
    .eq("id", payload.proposalId);
  if (proposalError) return { error: proposalError.message };

  revalidatePath(`/proposals/${payload.proposalId}`, "layout");
  return { error: null };
}
