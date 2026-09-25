import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export function canAccessProduccion(profile: Profile | null): boolean {
  return profile?.role === "produccion" || profile?.role === "admin";
}
