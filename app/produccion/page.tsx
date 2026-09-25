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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Producción</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Eventos ganados — viáticos, presupuesto y actividades de producción.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <NewEventForm />
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los eventos: {error.message}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {proposals && proposals.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
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
                  <tr key={p.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/produccion/${p.id}/viaticos`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {p.event_name}
                      </Link>
                      <div className="text-xs text-neutral-400">{p.city}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {client?.name ?? "—"}
                      {client?.company ? ` · ${client.company}` : ""}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {modalityLabel[p.modality] ?? p.modality}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{p.aforo ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-sm text-neutral-500">
            Todavía no hay eventos ganados. Marca una propuesta como &quot;ganada&quot; desde
            Comercial para que aparezca aquí.
          </div>
        )}
      </div>
    </div>
  );
}
