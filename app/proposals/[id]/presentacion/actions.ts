"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PresentacionContacto } from "@/lib/types";

export interface SaveDatosPresentacionPayload {
  proposalId: string;
  clientId: string | null;
  contactName: string;
  contactCargo: string;
  impactosRegistro: number | null;
  impactosAcreditacion: number | null;
  hiddenSlides: string[];
  contacto: PresentacionContacto | null;
  informes: string[] | null;
}

export async function saveDatosPresentacion(payload: SaveDatosPresentacionPayload) {
  const supabase = await createClient();

  if (payload.clientId) {
    const { error: clientError } = await supabase
      .from("clients")
      .update({
        contact_name: payload.contactName || null,
        contact_cargo: payload.contactCargo || null,
      })
      .eq("id", payload.clientId);
    if (clientError) return { error: clientError.message };
  }

  const { error: proposalError } = await supabase
    .from("proposals")
    .update({
      impactos_registro: payload.impactosRegistro,
      impactos_acreditacion: payload.impactosAcreditacion,
      presentacion_hidden_slides: payload.hiddenSlides,
      presentacion_contacto: payload.contacto,
      presentacion_informes: payload.informes,
    })
    .eq("id", payload.proposalId);
  if (proposalError) return { error: proposalError.message };

  revalidatePath(`/proposals/${payload.proposalId}/presentacion`);
  return { error: null };
}
