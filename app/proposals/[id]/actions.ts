"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markAsCerrada(proposalId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .update({ status: "cerrada" })
    .eq("id", proposalId);

  if (error) return { error: error.message };

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
  revalidatePath("/produccion");
  return { error: null };
}
