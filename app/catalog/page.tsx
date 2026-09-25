import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CatalogEditor } from "./catalog-editor";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const supabase = await createClient();
  const [{ data: logisticsItems }, { data: serviceItems }, { data: priceScaleItems }] =
    await Promise.all([
      supabase.from("logistics_rate_items").select("*").order("sort_order"),
      supabase
        .from("catalog_items")
        .select("*")
        .eq("category", "servicio_personalizado")
        .order("sort_order"),
      supabase.from("price_scale_items").select("*").order("scale_group").order("sort_order"),
    ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/proposals" className="text-sm text-neutral-500 hover:underline">
        ← Propuestas
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
        Catálogo de precios fijos
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Lista maestra de rubros de logística y servicios personalizados. Las tarifas de
        Logística 360 (transporte, alimentación, honorarios) se aplican de inmediato a
        todas las propuestas, incluso ya creadas — la Logística 360 siempre se calcula en
        vivo con estos valores. Los precios de Servicios personalizados sí quedan fijos
        por propuesta desde que se crea (se copian una vez); cambiarlos aquí solo afecta a
        las propuestas nuevas.
      </p>

      <div className="mt-8">
        <CatalogEditor
          logisticsItems={logisticsItems ?? []}
          serviceItems={serviceItems ?? []}
          priceScaleItems={priceScaleItems ?? []}
        />
      </div>
    </div>
  );
}
