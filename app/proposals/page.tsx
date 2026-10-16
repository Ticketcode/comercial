import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ProposalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const modalityLabel: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrido: "Híbrido",
  mundo_virtual: "Mundo virtual",
};

const COLUMNS: { status: ProposalStatus; label: string; dot: string }[] = [
  { status: "tarifario", label: "Tarifario", dot: "#E39A0B" },
  { status: "propuesta", label: "Propuesta", dot: "#7C5CFC" },
  { status: "contrato", label: "Contrato", dot: "var(--accent)" },
  { status: "cerrada", label: "Cerrada", dot: "#7C829E" },
];

interface ProposalRow {
  id: string;
  event_name: string;
  modality: string;
  city: string | null;
  aforo: number | null;
  status: ProposalStatus;
  client: { name: string; company: string | null } | null;
}

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("id, event_name, modality, city, aforo, status, created_at, clients(name, company)")
    .order("created_at", { ascending: false });

  const rows: ProposalRow[] = (proposals ?? []).map((p) => ({
    id: p.id,
    event_name: p.event_name,
    modality: p.modality,
    city: p.city,
    aforo: p.aforo,
    status: p.status,
    client: Array.isArray(p.clients) ? p.clients[0] ?? null : p.clients,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Propuestas
          </h1>
          <p className="mt-2.5 text-sm text-muted">Equipo comercial — Ticketcode</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/catalog"
            className="flex min-h-11 items-center rounded-pill bg-surface px-5 text-sm font-semibold text-ink"
          >
            Catálogo de precios
          </Link>
          <Link
            href="/proposals/new"
            className="flex min-h-11 items-center rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink"
          >
            + Nueva propuesta
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-card bg-warn p-4 text-sm font-medium text-warn-ink">
          No se pudieron cargar las propuestas: {error.message}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-10 rounded-card bg-surface p-10 text-center text-sm text-muted">
          Todavía no hay propuestas.{" "}
          <Link href="/proposals/new" className="font-semibold text-ink underline">
            Crea la primera
          </Link>
          .
        </div>
      ) : (
        <div className="mt-9 flex flex-wrap items-start gap-5">
          {COLUMNS.map((col) => {
            const items = rows.filter((r) => r.status === col.status);
            return (
              <div key={col.status} className="min-w-0 flex-1 basis-80 rounded-card bg-surface2 p-4">
                <div className="flex items-center justify-between px-1.5 pb-3.5 pt-1">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.dot }} />
                    <span className="font-display text-[17px] font-bold text-ink">{col.label}</span>
                  </div>
                  <span className="rounded-pill bg-surface px-2.5 py-0.5 text-xs font-bold text-muted">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {items.length === 0 ? (
                    <p className="px-1.5 text-xs text-muted">Sin propuestas en este estado.</p>
                  ) : (
                    items.map((p) => (
                      <Link
                        key={p.id}
                        href={`/proposals/${p.id}/tarifario`}
                        className="block rounded-[14px] border-[1.5px] border-transparent bg-surface p-[18px] no-underline transition-colors hover:border-accent"
                      >
                        <div className="font-display text-[17px] font-bold leading-tight text-ink">
                          {p.event_name}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {p.client?.name ?? "—"}
                          {p.client?.company ? ` · ${p.client.company}` : ""}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted">
                          <span>{p.city || modalityLabel[p.modality] || p.modality}</span>
                          <span className="font-bold text-ink">{p.aforo != null ? `Aforo ${p.aforo}` : "—"}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export const metadata = { title: "Propuestas" };
