import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InformeFinal } from "@/lib/types";
import { InformeEditor, type InformeKpis } from "./informe-editor";

export const dynamic = "force-dynamic";

export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: informe },
    { data: activities },
    { data: presupuestoItems },
    { data: anticipos },
    { data: gastos },
    { data: staff },
    { data: cuentasCobro },
  ] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, event_name, city, event_start_date, event_end_date")
      .eq("id", id)
      .single(),
    supabase.from("informe_final").select("*").eq("proposal_id", id).maybeSingle(),
    supabase.from("proposal_activities").select("estado, fecha_limite").eq("proposal_id", id),
    supabase.from("presupuesto_items").select("total_proyectado, total_ajustado").eq("proposal_id", id),
    supabase.from("viatico_anticipos").select("valor").eq("proposal_id", id),
    supabase.from("legalizacion_gastos").select("valor").eq("proposal_id", id),
    supabase.from("event_staff").select("id, legalizacion_cerrada").eq("proposal_id", id),
    supabase.from("cuentas_cobro").select("estado").eq("proposal_id", id),
  ]);

  if (!proposal) notFound();

  const todayIso = new Date().toISOString().slice(0, 10);
  const acts = activities ?? [];
  const totalGirado = (anticipos ?? []).reduce((sum, a) => sum + a.valor, 0);
  const totalSoportes = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);

  const kpis: InformeKpis = {
    actividades: {
      total: acts.length,
      completadas: acts.filter((a) => a.estado === "completada").length,
      enCurso: acts.filter((a) => a.estado === "en_curso").length,
      pendientes: acts.filter((a) => a.estado === "pendiente").length,
      vencidas: acts.filter((a) => a.estado !== "completada" && a.fecha_limite && a.fecha_limite < todayIso)
        .length,
    },
    presupuesto: {
      totalProyectado: (presupuestoItems ?? []).reduce((sum, i) => sum + (i.total_proyectado ?? 0), 0),
      totalAjustado: (presupuestoItems ?? []).reduce((sum, i) => sum + (i.total_ajustado ?? 0), 0),
    },
    viaticos: { totalGirado },
    legalizacion: {
      totalSoportes,
      diferencia: totalGirado - totalSoportes,
      personasCerradas: (staff ?? []).filter((s) => s.legalizacion_cerrada).length,
      totalPersonas: (staff ?? []).length,
    },
    cuentasCobro: {
      total: (cuentasCobro ?? []).length,
      firmadas: (cuentasCobro ?? []).filter((c) => c.estado === "firmada").length,
    },
  };

  return (
    <InformeEditor
      proposalId={id}
      eventName={proposal.event_name}
      eventCity={proposal.city}
      eventStartDate={proposal.event_start_date}
      eventEndDate={proposal.event_end_date}
      kpis={kpis}
      initialInforme={(informe as InformeFinal | null) ?? null}
    />
  );
}
export const metadata = { title: "Informe final" };
