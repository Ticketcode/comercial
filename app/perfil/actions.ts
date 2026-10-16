"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SavePerfilPayload {
  full_name: string;
  cargo: string;
  correo: string;
  telefono: string;
}

export async function savePerfil(payload: SavePerfilPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: payload.full_name || null,
      cargo: payload.cargo || null,
      correo: payload.correo || null,
      telefono: payload.telefono || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/perfil");
  return { error: null };
}
