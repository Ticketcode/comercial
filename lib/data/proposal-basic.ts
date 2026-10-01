import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Datos básicos de la propuesta/evento para el encabezado y el título de la pestaña.
 * Con cache() el layout y generateMetadata comparten una sola consulta por petición.
 */
export const getProposalBasic = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("proposals")
    .select("id, event_name, status, clients(name, company)")
    .eq("id", id)
    .single();
  return data;
});
