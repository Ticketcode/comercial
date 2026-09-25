import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposalStepsNav } from "./proposal-steps-nav";
import { MarkCerradaButton } from "./mark-cerrada-button";

export default async function ProposalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, event_name, status, clients(name, company)")
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  const client = Array.isArray(proposal.clients) ? proposal.clients[0] : proposal.clients;
  const isCerrada = proposal.status === "cerrada";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/proposals" className="no-print text-sm text-neutral-500 hover:underline">
        ← Todas las propuestas
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{proposal.event_name}</h1>
          <p className="text-sm text-neutral-500">
            {client?.name}
            {client?.company ? ` · ${client.company}` : ""}
          </p>
        </div>
        {!isCerrada ? (
          <div className="no-print">
            <MarkCerradaButton proposalId={id} />
          </div>
        ) : (
          <Link
            href={`/produccion/${id}/viaticos`}
            className="no-print rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Ver en Producción →
          </Link>
        )}
      </div>

      <div className="no-print">
        <ProposalStepsNav id={id} />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
