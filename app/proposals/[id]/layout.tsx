import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposalStepsNav } from "./proposal-steps-nav";

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
    .select("id, event_name, clients(name, company)")
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  const client = Array.isArray(proposal.clients) ? proposal.clients[0] : proposal.clients;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/proposals" className="no-print text-sm text-neutral-500 hover:underline">
        ← Todas las propuestas
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{proposal.event_name}</h1>
      <p className="text-sm text-neutral-500">
        {client?.name}
        {client?.company ? ` · ${client.company}` : ""}
      </p>

      <div className="no-print">
        <ProposalStepsNav id={id} />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
