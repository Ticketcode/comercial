import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalContractFields } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { loadDeckData, versionTotals } from "@/lib/data/deck-data";
import Link from "next/link";
import { ContratoEditor } from "./contrato-editor";

export const dynamic = "force-dynamic";

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: fields }, { data: accepted }] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("proposal_contract_fields").select("*").eq("proposal_id", id).maybeSingle(),
    supabase
      .from("proposal_versions")
      .select("version_number, accepted_at, accepted_by_name, accepted_by_cargo, total_con_iva, valor_antes_iva")
      .eq("proposal_id", id)
      .eq("status", "aceptada")
      .maybeSingle(),
  ]);

  if (!proposal) notFound();

  // El contrato se arma con los datos actuales de la propuesta. Si ya hay una
  // versión aceptada, se avisa si el precio de hoy es distinto del aceptado.
  let cambioDesdeAceptacion = false;
  if (accepted) {
    const live = await loadDeckData(supabase, id);
    if (live) cambioDesdeAceptacion = Math.round(versionTotals(live).antesIva) !== Math.round(Number(accepted.valor_antes_iva));
  }

  return (
    <div className="space-y-6">
      {accepted ? (
        <div className="rounded-card bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong>Propuesta aceptada:</strong> V{accepted.version_number}
          {accepted.accepted_at ? ` el ${new Date(accepted.accepted_at).toLocaleDateString("es-CO")}` : ""} por{" "}
          {accepted.accepted_by_name}
          {accepted.accepted_by_cargo ? ` (${accepted.accepted_by_cargo})` : ""}. Valor aceptado:{" "}
          {formatCOP(Number(accepted.total_con_iva))} con IVA.
          {cambioDesdeAceptacion && (
            <p className="mt-2 font-semibold text-amber-900">
              El precio de la propuesta cambió desde esa aceptación. El contrato se genera con los datos de hoy:
              revisa que coincidan con lo aceptado (
              <Link href={`/proposals/${id}/versiones`} className="underline">
                ver versiones
              </Link>
              ).
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-card bg-amber-50 p-4 text-sm text-amber-900">
          Todavía no hay una versión aceptada.{" "}
          <Link href={`/proposals/${id}/versiones`} className="underline">
            Registra la aceptación en Versiones
          </Link>{" "}
          antes de generar el contrato.
        </div>
      )}
      <ContratoEditor proposal={proposal as Proposal} fields={fields as ProposalContractFields | null} />
    </div>
  );
}
export const metadata = { title: "Contrato" };
