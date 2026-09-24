"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SaveCatalogPayload {
  logisticsItems: { id: string; default_unit_cost: number }[];
  serviceItems: { id: string; default_unit_price: number }[];
  priceScaleItems: { id: string; unit_value: number }[];
}

export async function saveCatalog(payload: SaveCatalogPayload) {
  const supabase = await createClient();

  const results = await Promise.all([
    ...payload.logisticsItems.map((item) =>
      supabase
        .from("logistics_rate_items")
        .update({ default_unit_cost: item.default_unit_cost })
        .eq("id", item.id)
    ),
    ...payload.serviceItems.map((item) =>
      supabase
        .from("catalog_items")
        .update({ default_unit_price: item.default_unit_price })
        .eq("id", item.id)
    ),
    ...payload.priceScaleItems.map((item) =>
      supabase
        .from("price_scale_items")
        .update({ unit_value: item.unit_value })
        .eq("id", item.id)
    ),
  ]);

  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath("/catalog");
  return { error: null };
}
