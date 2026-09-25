import { createClient } from "@/lib/supabase/server";
import type { ActivityChecklistGroup, ActivityChecklistItem, ProposalActivity } from "@/lib/types";
import { ActividadesEditor } from "./actividades-editor";
import { SeedTemplateButton } from "./seed-template-button";

export default async function ActividadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("proposal_activities")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order");

  if (!activities || activities.length === 0) {
    return <SeedTemplateButton proposalId={id} />;
  }

  const activityIds = activities.map((a) => a.id);
  const { data: groups } = await supabase
    .from("proposal_activity_checklist_groups")
    .select("*")
    .in("activity_id", activityIds)
    .order("sort_order");

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: items } =
    groupIds.length > 0
      ? await supabase
          .from("proposal_activity_checklist_items")
          .select("*")
          .in("group_id", groupIds)
          .order("sort_order")
      : { data: [] };

  return (
    <ActividadesEditor
      proposalId={id}
      activities={activities as ProposalActivity[]}
      groups={(groups ?? []) as ActivityChecklistGroup[]}
      items={(items ?? []) as ActivityChecklistItem[]}
    />
  );
}
