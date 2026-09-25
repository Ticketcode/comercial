"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { ACTIVITY_TEMPLATE } from "@/lib/data/production-activity-template";
import type { ActivityEstado } from "@/lib/types";

async function assertAccess() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    throw new Error("No autorizado.");
  }
  return supabase;
}

export async function seedActivitiesFromTemplate(proposalId: string) {
  const supabase = await assertAccess();

  const { count } = await supabase
    .from("proposal_activities")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);
  if (count && count > 0) {
    return { error: "Ya existen actividades para este evento." };
  }

  for (const [categoria, tasks] of Object.entries(ACTIVITY_TEMPLATE)) {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const { data: activity, error } = await supabase
        .from("proposal_activities")
        .insert({
          proposal_id: proposalId,
          categoria,
          nombre: task.nombre,
          momento: task.momento,
          sort_order: i,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };

      if (task.checklistGroups) {
        for (let g = 0; g < task.checklistGroups.length; g++) {
          const group = task.checklistGroups[g];
          const { data: groupRow, error: groupError } = await supabase
            .from("proposal_activity_checklist_groups")
            .insert({ activity_id: activity.id, nombre: group.nombre, sort_order: g })
            .select("id")
            .single();
          if (groupError) return { error: groupError.message };

          const { error: itemsError } = await supabase.from("proposal_activity_checklist_items").insert(
            group.items.map((texto, idx) => ({
              group_id: groupRow.id,
              texto,
              sort_order: idx,
            }))
          );
          if (itemsError) return { error: itemsError.message };
        }
      }
    }
  }

  revalidatePath(`/produccion/${proposalId}/actividades`);
  return { error: null };
}

export async function updateActivity(
  id: string,
  proposalId: string,
  patch: { estado?: ActivityEstado; fecha_limite?: string | null; responsable?: string | null }
) {
  const supabase = await assertAccess();
  const { error } = await supabase.from("proposal_activities").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/actividades`);
  return { error: null };
}

export async function addChecklistItem(groupId: string, proposalId: string, texto: string, sortOrder: number) {
  const supabase = await assertAccess();
  const { error } = await supabase
    .from("proposal_activity_checklist_items")
    .insert({ group_id: groupId, texto, sort_order: sortOrder });
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/actividades`);
  return { error: null };
}

export async function toggleChecklistItem(id: string, proposalId: string, completado: boolean) {
  const supabase = await assertAccess();
  const { error } = await supabase
    .from("proposal_activity_checklist_items")
    .update({ completado })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/actividades`);
  return { error: null };
}

export async function deleteChecklistItem(id: string, proposalId: string) {
  const supabase = await assertAccess();
  const { error } = await supabase.from("proposal_activity_checklist_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/actividades`);
  return { error: null };
}

export async function addChecklistGroup(activityId: string, proposalId: string, nombre: string, sortOrder: number) {
  const supabase = await assertAccess();
  const { error } = await supabase
    .from("proposal_activity_checklist_groups")
    .insert({ activity_id: activityId, nombre, sort_order: sortOrder });
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/actividades`);
  return { error: null };
}
