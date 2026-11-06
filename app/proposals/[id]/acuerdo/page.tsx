import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cargarEstado } from "@/lib/ai/estado";
import { AcuerdoEditor } from "./acuerdo-editor";

export const dynamic = "force-dynamic";

export default async function AcuerdoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const base = await cargarEstado(supabase, id);
  if (!base) notFound();

  const [{ data: existentes }, { data: tiers }] = await Promise.all([
    supabase.from("proposal_commercial_agreement").select("*").eq("proposal_id", id).order("sort_order"),
    supabase.from("commercial_agreement_tiers").select("*").order("sort_order"),
  ]);

  // Siembra perezosa, igual que la Propuesta: los conceptos del catálogo, sin incluir.
  let filas = existentes ?? [];
  if (filas.length === 0 && (tiers ?? []).length > 0) {
    const { data: insertadas } = await supabase
      .from("proposal_commercial_agreement")
      .insert(
        (tiers ?? []).map((t) => ({
          proposal_id: id,
          tier_id: t.id,
          label: t.name,
          pct: Number(t.default_pct),
          included: false,
          notes: t.description,
          sort_order: t.sort_order,
        }))
      )
      .select("*");
    filas = insertadas ?? [];
  }

  const p = base.estado.proposal as unknown as { acuerdo_comercial_pct_global: number; acuerdo_objecion?: string | null };
  return (
    <AcuerdoEditor
      proposalId={id}
      valorAntesIva={base.total(base.estado)}
      valorNoDescontable={base.noDescontable(base.estado)}
      objecionInicial={p.acuerdo_objecion ?? ""}
      descuentoInicial={Number(p.acuerdo_comercial_pct_global) || 0}
      conceptosIniciales={filas.map((f) => ({ id: f.id, label: f.label, included: !!f.included, pct: Number(f.pct), notas: f.notes ?? "" }))}
    />
  );
}

export const metadata = { title: "Acuerdo comercial" };
