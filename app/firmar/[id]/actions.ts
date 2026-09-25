"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function firmarCuentaCobro(id: string, nombreFirma: string, firmaImagen: string | null) {
  if (!nombreFirma.trim()) return { error: "Escribe tu nombre completo para firmar." };
  if (!firmaImagen) return { error: "Dibuja tu firma antes de continuar." };

  const supabase = createAdminClient();
  const { data: cuenta, error: fetchError } = await supabase
    .from("cuentas_cobro")
    .select("estado")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!cuenta) return { error: "Cuenta de cobro no encontrada." };
  if (cuenta.estado === "firmada") return { error: "Este documento ya fue firmado." };

  const { error } = await supabase
    .from("cuentas_cobro")
    .update({
      estado: "firmada",
      fecha_firma: new Date().toISOString().slice(0, 10),
      firma_nombre: nombreFirma.trim(),
      firma_imagen: firmaImagen,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/firmar/${id}`);
  return { error: null };
}
