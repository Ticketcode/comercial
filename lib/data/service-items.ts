import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProposalCostItem } from "@/lib/types";

/**
 * El Tarifario, la Propuesta y el Contrato deben usar SIEMPRE los mismos
 * "servicios personalizados" — los 39 reales del catálogo (categoría
 * servicio_personalizado). proposal_cost_items puede tener filas sueltas
 * heredadas (ej. de pruebas viejas, o de logística que ya no se guarda ahí)
 * que nunca deben contarse ni mostrarse; este filtro es la única fuente de
 * verdad para separarlas.
 */
export async function getValidServiceCostItems(
  supabase: SupabaseClient,
  costItems: ProposalCostItem[]
) {
  const { data: catalog } = await supabase
    .from("catalog_items")
    .select("name, description")
    .eq("category", "servicio_personalizado");

  const validNames = new Set((catalog ?? []).map((c) => c.name));
  const items = costItems.filter((item) => validNames.has(item.label));

  return { items, catalog: catalog ?? [] };
}
