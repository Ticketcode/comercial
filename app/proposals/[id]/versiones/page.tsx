import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDeckData } from "@/lib/data/deck-data";
import { diffDeckData } from "@/lib/data/version-diff";
import type { DeckData } from "../presentacion/deck-shell";
import { VersionesPanel, type VersionItem } from "./versiones-panel";

export const dynamic = "force-dynamic";

export default async function VersionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rows }, live] = await Promise.all([
    supabase.from("proposal_versions").select("*").eq("proposal_id", id).order("version_number"),
    loadDeckData(supabase, id),
  ]);
  if (!live) notFound();

  const ordered = rows ?? [];
  const items: VersionItem[] = ordered.map((r, i) => {
    const prev = i > 0 ? ordered[i - 1] : null;
    return {
      id: r.id,
      number: r.version_number,
      note: r.note,
      isFinal: r.is_final,
      status: r.status,
      createdAt: r.created_at,
      sentAt: r.sent_at,
      acceptedAt: r.accepted_at,
      acceptedByName: r.accepted_by_name,
      acceptedByCargo: r.accepted_by_cargo,
      acceptanceNote: r.acceptance_note,
      valorAntesIva: Number(r.valor_antes_iva),
      totalConIva: Number(r.total_con_iva),
      deltaAntesIva: prev ? Number(r.valor_antes_iva) - Number(prev.valor_antes_iva) : null,
      changes: prev ? diffDeckData(prev.snapshot as DeckData, r.snapshot as DeckData) : [],
    };
  });

  const last = ordered.at(-1);
  const unsavedChanges = last ? diffDeckData(last.snapshot as DeckData, live) : [];

  // Más nueva primero.
  return <VersionesPanel proposalId={id} versions={[...items].reverse()} unsavedChanges={unsavedChanges} />;
}

export const metadata = { title: "Versiones" };
