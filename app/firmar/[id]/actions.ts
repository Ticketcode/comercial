"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// `token` es el de la URL pública /firmar/[token]; si Producción regeneró el enlace, el anterior
// ya no existe y esto responde "no encontrada".
export async function firmarCuentaCobro(token: string, nombreFirma: string, firmaImagen: string | null) {
  if (!nombreFirma.trim()) return { error: "Escribe tu nombre completo para firmar." };
  if (!firmaImagen) return { error: "Dibuja tu firma antes de continuar." };

  const supabase = createAdminClient();
  const { data: cuenta, error: fetchError } = await supabase
    .from("cuentas_cobro")
    .select("id, estado")
    .eq("token", token)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!cuenta) return { error: "Este enlace ya no es válido. Pide a Producción que te envíe uno nuevo." };
  if (cuenta.estado === "firmada") return { error: "Este documento ya fue firmado." };

  const { error } = await supabase
    .from("cuentas_cobro")
    .update({
      estado: "firmada",
      fecha_firma: new Date().toISOString().slice(0, 10),
      firma_nombre: nombreFirma.trim(),
      firma_imagen: firmaImagen,
    })
    .eq("id", cuenta.id)
    .eq("estado", "pendiente");

  if (error) return { error: error.message };

  revalidatePath(`/firmar/${token}`);
  return { error: null };
}
