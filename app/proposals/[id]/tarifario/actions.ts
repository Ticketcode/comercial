"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Modality } from "@/lib/types";
import { totalLogisticosSalones } from "@/lib/pricing/logistics";

export interface SaveTarifarioItem {
  id: string;
  included: boolean;
  quantity: number;
  unit_cost: number;
}

export interface SaveTarifarioPayload {
  proposalId: string;
  eventFields: {
    modality: Modality;
    city: string;
    dias: number;
    aforo: number;
    aforo_virtual: number;
    tasa_conversion_pct: number;
    rentabilidad_pct: number;
    comision_director_pct: number;
    comision_asesor_pct: number;
    visita_preoperativa_dias: number;
    qty_logistico: number;
    qty_supervisor: number;
    qty_logistica_salones_internos: number;
    qty_productor: number;
    qty_transporte_aeropuerto: number;
    qty_computadores: number;
    qty_impresoras: number;
    qty_rollos_labels: number;
    extra_camisetas_staff: boolean;
    extra_lavado_chalecos: boolean;
    extra_compra_agua: boolean;
    extra_compra_bloqueador_solar: boolean;
    extra_actividad_cierre: boolean;
  };
  serviceItems: SaveTarifarioItem[];
  salonesInternosAforos: number[];
  logisticsOverrides: Record<string, { dias?: number; quantity?: number }>;
}

export async function saveTarifario(payload: SaveTarifarioPayload) {
  const supabase = await createClient();

  const { error: proposalError } = await supabase
    .from("proposals")
    .update({
      ...payload.eventFields,
      qty_logistica_salones_internos: totalLogisticosSalones(payload.salonesInternosAforos),
      salones_internos_aforos: payload.salonesInternosAforos,
      logistics_overrides: payload.logisticsOverrides,
      status: "tarifario",
    })
    .eq("id", payload.proposalId);

  if (proposalError) {
    return { error: proposalError.message };
  }

  const results = await Promise.all(
    payload.serviceItems.map((item) =>
      supabase
        .from("proposal_cost_items")
        .update({
          included: item.included,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })
        .eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath(`/proposals/${payload.proposalId}/tarifario`);
  return { error: null };
}
