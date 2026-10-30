import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProposalBasic } from "@/lib/data/proposal-basic";
import { ProposalStepsNav } from "./proposal-steps-nav";
import { MarkCerradaButton } from "./mark-cerrada-button";
import { EditBasicsPanel } from "./edit-basics-panel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const proposal = await getProposalBasic(id);
  const name = proposal?.event_name ?? "Evento";
  return { title: { default: name, template: `%s · ${name} · Ticketcode` } };
}

export default async function ProposalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = await getProposalBasic(id);

  if (!proposal) notFound();

  const client = Array.isArray(proposal.clients) ? proposal.clients[0] : proposal.clients;
  const isCerrada = proposal.status === "cerrada";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/proposals" className="no-print text-sm font-semibold text-muted hover:underline">
        ← Todas las propuestas
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            {proposal.event_name}
          </h1>
          <p className="mt-2 text-sm text-muted">
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
            className="no-print flex min-h-11 items-center rounded-pill border-[1.5px] border-accent px-5 text-sm font-bold text-accent"
          >
            Ver en Producción →
          </Link>
        )}
      </div>

      <div className="no-print mt-4">
        <EditBasicsPanel
          proposalId={id}
          clientId={client?.id ?? null}
          eventName={proposal.event_name}
          modality={proposal.modality}
          city={proposal.city ?? ""}
          lugar={proposal.lugar ?? ""}
          aforo={proposal.aforo}
          aforoVirtual={Number(proposal.aforo_virtual)}
          dias={Number(proposal.dias)}
          eventStartDate={proposal.event_start_date}
          eventEndDate={proposal.event_end_date}
          clientName={client?.name ?? ""}
          clientCompany={client?.company ?? ""}
          clientCargo={client?.contact_cargo ?? ""}
        />
      </div>

      <div className="no-print">
        <ProposalStepsNav id={id} />
      </div>

      <div className="mt-7">{children}</div>
    </div>
  );
}
