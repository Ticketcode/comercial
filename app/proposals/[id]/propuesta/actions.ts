"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SaveAgreementItem {
  id: string;
  included: boolean;
  pct: number;
}

export interface SaveScheduleItem {
  id: string;
  week_number: number;
  hito: string;
  comentario: string | null;
}

export interface SaveCatalogSelection {
  id: string;
  included: boolean;
}

export interface SaveMilestone {
  id: string;
  label: string;
  pct: number;
  sort_order: number;
}

export interface SaveRequirement {
  id: string;
  text: string;
  sort_order: number;
}

export interface SavePropuestaPayload {
  proposalId: string;
  lugar: string;
  acuerdo_comercial_pct_global: number;
  requerimientos: { existing: SaveRequirement[]; new: SaveRequirement[]; deletedIds: string[] };
  agreementItems: SaveAgreementItem[];
  scheduleItems: SaveScheduleItem[];
  newScheduleItems: SaveScheduleItem[];
  deletedScheduleItemIds: string[];
  catalogSelections: SaveCatalogSelection[];
  milestones: { existing: SaveMilestone[]; new: SaveMilestone[]; deletedIds: string[] };
}

export async function savePropuesta(payload: SavePropuestaPayload) {
  const supabase = await createClient();

  const { error: proposalError } = await supabase
    .from("proposals")
    .update({
      lugar: payload.lugar,
      acuerdo_comercial_pct_global: payload.acuerdo_comercial_pct_global,
      status: "propuesta",
    })
    .eq("id", payload.proposalId);
  if (proposalError) return { error: proposalError.message };

  const results = await Promise.all([
    ...payload.agreementItems.map((item) =>
      supabase
        .from("proposal_commercial_agreement")
        .update({ included: item.included, pct: item.pct })
        .eq("id", item.id)
    ),
    ...payload.scheduleItems.map((item) =>
      supabase
        .from("proposal_schedule_items")
        .update({ week_number: item.week_number, hito: item.hito, comentario: item.comentario })
        .eq("id", item.id)
    ),
    ...payload.catalogSelections.map((item) =>
      supabase
        .from("proposal_catalog_selections")
        .update({ included: item.included })
        .eq("id", item.id)
    ),
    ...payload.requerimientos.existing.map((item) =>
      supabase
        .from("proposal_operational_requirements")
        .update({ text: item.text, sort_order: item.sort_order })
        .eq("id", item.id)
    ),
    ...payload.milestones.existing.map((item) =>
      supabase
        .from("proposal_payment_milestones")
        .update({ label: item.label, pct: item.pct, sort_order: item.sort_order })
        .eq("id", item.id)
    ),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  if (payload.deletedScheduleItemIds.length > 0) {
    const { error } = await supabase
      .from("proposal_schedule_items")
      .delete()
      .in("id", payload.deletedScheduleItemIds);
    if (error) return { error: error.message };
  }
  if (payload.newScheduleItems.length > 0) {
    const { error } = await supabase.from("proposal_schedule_items").insert(
      payload.newScheduleItems.map((item) => ({
        proposal_id: payload.proposalId,
        week_number: item.week_number,
        hito: item.hito,
        comentario: item.comentario,
      }))
    );
    if (error) return { error: error.message };
  }

  if (payload.requerimientos.deletedIds.length > 0) {
    const { error } = await supabase
      .from("proposal_operational_requirements")
      .delete()
      .in("id", payload.requerimientos.deletedIds);
    if (error) return { error: error.message };
  }
  if (payload.requerimientos.new.length > 0) {
    const { error } = await supabase.from("proposal_operational_requirements").insert(
      payload.requerimientos.new.map((item) => ({
        proposal_id: payload.proposalId,
        text: item.text,
        sort_order: item.sort_order,
      }))
    );
    if (error) return { error: error.message };
  }

  if (payload.milestones.deletedIds.length > 0) {
    const { error } = await supabase
      .from("proposal_payment_milestones")
      .delete()
      .in("id", payload.milestones.deletedIds);
    if (error) return { error: error.message };
  }
  if (payload.milestones.new.length > 0) {
    const { error } = await supabase.from("proposal_payment_milestones").insert(
      payload.milestones.new.map((item) => ({
        proposal_id: payload.proposalId,
        label: item.label,
        pct: item.pct,
        sort_order: item.sort_order,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/proposals/${payload.proposalId}/propuesta`);
  return { error: null };
}
