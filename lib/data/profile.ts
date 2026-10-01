import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Profile } from "@/lib/types";

// Cacheado por petición (el cliente de Supabase también lo está): evita repetir
// getUser + consulta de perfil en TopNav, layouts y páginas.
export const getCurrentProfile = cache(
  async (supabase: SupabaseClient): Promise<Profile | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return (data as Profile) ?? null;
  }
);

export function canAccessProduccion(profile: Profile | null): boolean {
  return profile?.role === "produccion" || profile?.role === "admin";
}
