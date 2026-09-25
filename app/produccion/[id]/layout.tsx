import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProduccionStepsNav } from "./produccion-steps-nav";

export default async function ProduccionEventLayout({
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/produccion" className="no-print text-sm text-neutral-500 hover:underline">
        ← Todos los eventos
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{proposal.event_name}</h1>
          <p className="text-sm text-neutral-500">
            {client?.name}
            {client?.company ? ` · ${client.company}` : ""}
          </p>
        </div>
        <Link
          href={`/proposals/${id}/tarifario`}
          className="no-print rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Editar datos del Tarifario →
        </Link>
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Días, aforo, ciudad y personal se editan en el Tarifario — de ahí salen los cálculos de
        Viáticos.
      </p>

      {proposal.status !== "cerrada" ? (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">
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
