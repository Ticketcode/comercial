import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewEventForm } from "./new-event-form";

export const dynamic = "force-dynamic";

const modalityLabel: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrido: "Híbrido",
  mundo_virtual: "Mundo virtual",
};

export default async function ProduccionPage() {
  const supabase = await createClient();
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("id, event_name, modality, city, aforo, clients(name, company)")
    .eq("status", "cerrada")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Producción
          </h1>
          <p className="mt-2.5 text-sm text-muted">
            Eventos ganados — viáticos, presupuesto y actividades de producción.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <NewEventForm />
      </div>

      {error && (
        <p className="mt-6 rounded-card bg-warn p-4 text-sm font-medium text-warn-ink">
          No se pudieron cargar los eventos: {error.message}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-card bg-surface">
        {proposals && proposals.length > 0 ? (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Modalidad</th>
                <th className="px-4 py-3 font-medium">Aforo</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-surface2">
                    <td className="px-4 py-3">
                      <Link
                        href={`/produccion/${p.id}/viaticos`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {p.event_name}
                      </Link>
                      <div className="text-xs text-muted">{p.city}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {client?.name ?? "—"}
                      {client?.company ? ` · ${client.company}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {modalityLabel[p.modality] ?? p.modality}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.aforo ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-sm text-muted">
            Todavía no hay eventos ganados. Marca una propuesta como &quot;ganada&quot; desde
            Comercial para que aparezca aquí.
          </div>
        )}
      </div>
    </div>
  );
}
export const metadata = { title: "Producción" };
