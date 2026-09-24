"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface LoginState {
  error: string | null;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase no está configurado todavía. Completa .env.local con las credenciales reales.",
    };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/proposals");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
