import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoAnticipo } from "@/lib/types";
import { LegalizarForm } from "./legalizar-form";

// Pantalla pública (sin login) para que cada integrante del staff diligencie
// su propia legalización de viáticos — el valor en la URL es el `token` de la persona
// (no su id), que Producción puede regenerar para anular el enlace (mismo patrón que
// /firmar/[token] para las cuentas de cobro). La tabla sigue bloqueada a anon; toda lectura/escritura
// pasa por el cliente admin, server-side, acotada siempre a ese staff_id.
// Siempre en vivo: si Producción regenera un enlace o cierra la legalización, el cambio debe
// notarse de inmediato (sin servir una copia guardada de la página ni de la consulta).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LegalizarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: staffMember } = await supabase
    .from("event_staff")
    .select("*")
    .eq("token", id)
    .maybeSingle();
  if (!staffMember) notFound();

  const [{ data: proposal }, { data: anticipos }, { data: meta }, { data: gastos }] = await Promise.all([
    supabase.from("proposals").select("event_name, city").eq("id", staffMember.proposal_id).maybeSingle(),
    supabase.from("viatico_anticipos").select("*").eq("staff_id", staffMember.id).order("fecha"),
    supabase
      .from("legalizacion_meta")
      .select("*")
      .eq("proposal_id", staffMember.proposal_id)
      .eq("staff_id", staffMember.id)
      .maybeSingle(),
    supabase.from("legalizacion_gastos").select("*").eq("staff_id", staffMember.id).order("sort_order"),
  ]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-neutral-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <span className="text-base font-extrabold tracking-tight text-emerald-700">ticketcode</span>
        <h1 className="mt-1 text-lg font-bold text-neutral-900">Legalización de viáticos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {staffMember.full_name} — {proposal?.event_name ?? "Evento"}
        </p>

        <LegalizarForm
          token={id}
          locked={!!staffMember.legalizacion_cerrada}
          staffId={staffMember.id}
          proposalId={staffMember.proposal_id}
          staff={staffMember as EventStaff}
          eventCity={proposal?.city ?? null}
          anticipos={(anticipos ?? []) as ViaticoAnticipo[]}
          initialMeta={meta as LegalizacionMeta | null}
          initialGastos={(gastos ?? []) as LegalizacionGasto[]}
        />
      </div>
    </div>
  );
}
export const metadata = { title: "Legalización de viáticos" };
