import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDeckData } from "@/lib/data/deck-data";
import { PresentacionViewer } from "./presentacion-viewer";
import type { DeckData } from "./deck-shell";

export const dynamic = "force-dynamic";

export default async function PresentacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;
  const supabase = await createClient();

  // Con ?v=<id de versión> se muestra esa versión guardada (solo lectura).
  if (v) {
    const { data: version } = await supabase
      .from("proposal_versions")
      .select("version_number, status, is_final, created_at, snapshot")
      .eq("id", v)
      .eq("proposal_id", id)
      .maybeSingle();
    if (!version) notFound();
    return (
      <PresentacionViewer
        data={version.snapshot as DeckData}
        version={{
          number: version.version_number,
          status: version.status,
          isFinal: version.is_final,
          createdAt: version.created_at,
        }}
      />
    );
  }

  const data = await loadDeckData(supabase, id);
  if (!data) notFound();

  return <PresentacionViewer data={data} />;
}
export const metadata = { title: "Presentación" };
