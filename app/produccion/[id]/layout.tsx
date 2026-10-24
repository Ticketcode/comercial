import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProposalBasic } from "@/lib/data/proposal-basic";
import { ProduccionStepsNav } from "./produccion-steps-nav";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const proposal = await getProposalBasic(id);
  const name = proposal?.event_name ?? "Evento";
  return { title: { default: name, template: `%s · ${name} · Ticketcode` } };
}

export default async function ProduccionEventLayout({
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

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6">
      <Link href="/produccion" className="no-print text-sm font-semibold text-muted hover:underline">
        ← Todos los eventos
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
        <Link
          href={`/proposals/${id}/tarifario`}
          className="no-print flex min-h-11 items-center rounded-pill border-[1.5px] border-accent px-5 text-sm font-bold text-accent"
        >
          Editar datos del Tarifario →
        </Link>
      </div>
      <p className="mt-2 text-xs text-muted">
        Días, aforo, ciudad y personal se editan en el Tarifario — de ahí salen los cálculos de
        Viáticos.
      </p>

      {proposal.status !== "cerrada" ? (
        <div className="mt-6 rounded-card bg-surface2 p-6 text-sm text-muted">
          Esta propuesta todavía no está marcada como ganada.
        </div>
      ) : (
        <>
          <div className="no-print">
            <ProduccionStepsNav id={id} />
          </div>
          <div className="mt-8">{children}</div>
        </>
      )}
    </div>
  );
}
