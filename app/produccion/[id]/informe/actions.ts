"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { formatCOP } from "@/lib/pricing/summary";
import type { InformeKpis } from "./informe-editor";

async function assertAccess() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    throw new Error("No autorizado.");
  }
  return supabase;
}

export interface InformeNotas {
  notasActividades: string;
  notasViaticos: string;
  notasPresupuesto: string;
  notasGenerales: string;
  analisisIa: string;
}

export async function saveInformeNotas(proposalId: string, notas: InformeNotas) {
  const supabase = await assertAccess();
  const { error } = await supabase.from("informe_final").upsert(
    {
      proposal_id: proposalId,
      notas_actividades: notas.notasActividades || null,
      notas_viaticos: notas.notasViaticos || null,
      notas_presupuesto: notas.notasPresupuesto || null,
      notas_generales: notas.notasGenerales || null,
      analisis_ia: notas.analisisIa || null,
    },
    { onConflict: "proposal_id" }
  );
  if (error) return { error: error.message };
  revalidatePath(`/produccion/${proposalId}/informe`);
  return { error: null };
}

function buildPrompt(
  notas: Omit<InformeNotas, "analisisIa">,
  eventName: string,
  eventCity: string | null,
  eventStartDate: string | null,
  eventEndDate: string | null,
  kpis: InformeKpis
): string {
  const fmt = formatCOP;
  return `Eres un analista que ayuda a un equipo de producción de eventos en Colombia (Ticketcode) a redactar el análisis de cierre de un evento, para un informe gerencial.

Con las cifras y notas de abajo, escribe un análisis en español, profesional pero directo, de 3 a 5 párrafos cortos, SIN inventar datos que no estén aquí. Destaca: cumplimiento de actividades, estado financiero (presupuesto vs. viáticos/legalización), riesgos o pendientes mencionados en las notas, y un cierre con recomendación general. No repitas las cifras como una lista — intégralas en la redacción. No uses encabezados ni markdown, solo párrafos de texto corrido.

EVENTO: ${eventName} — ${eventCity ?? "ciudad no especificada"} (${eventStartDate ?? "?"} a ${eventEndDate ?? "?"})

ACTIVIDADES: ${kpis.actividades.completadas} de ${kpis.actividades.total} completadas, ${kpis.actividades.enCurso} en curso, ${kpis.actividades.pendientes} pendientes, ${kpis.actividades.vencidas} vencidas sin completar.
Novedades de actividades reportadas por el equipo: ${notas.notasActividades || "(sin novedades reportadas)"}

PRESUPUESTO: proyectado inicial ${fmt(kpis.presupuesto.totalProyectado)}, ajustado final ${fmt(kpis.presupuesto.totalAjustado)}.
Novedades de presupuesto: ${notas.notasPresupuesto || "(sin novedades reportadas)"}

VIÁTICOS Y LEGALIZACIÓN: total girado al staff ${fmt(kpis.viaticos.totalGirado)}, total soportado con legalización ${fmt(kpis.legalizacion.totalSoportes)}, diferencia ${fmt(kpis.legalizacion.diferencia)} (${kpis.legalizacion.diferencia >= 0 ? "a favor de la empresa" : "pendiente de reembolsar"}). Legalizaciones cerradas: ${kpis.legalizacion.personasCerradas} de ${kpis.legalizacion.totalPersonas} personas.
Novedades de viáticos/legalización: ${notas.notasViaticos || "(sin novedades reportadas)"}

CUENTAS DE COBRO: ${kpis.cuentasCobro.firmadas} de ${kpis.cuentasCobro.total} firmadas.

NOTAS GENERALES DEL EVENTO: ${notas.notasGenerales || "(sin notas generales)"}`;
}

export async function generarAnalisisInforme(
  proposalId: string,
  notas: Omit<InformeNotas, "analisisIa">,
  eventName: string,
  eventCity: string | null,
  eventStartDate: string | null,
  eventEndDate: string | null,
  kpis: InformeKpis
): Promise<{ error: string | null; analisis: string | null }> {
  const supabase = await assertAccess();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "Falta configurar ANTHROPIC_API_KEY en el servidor.", analisis: null };
  }

  const prompt = buildPrompt(notas, eventName, eventCity, eventStartDate, eventEndDate, kpis);

  let analisis: string;
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1300,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });
    analisis = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!analisis) throw new Error("La IA no devolvió texto.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `No se pudo generar el análisis: ${msg}`, analisis: null };
  }

  const { error } = await supabase.from("informe_final").upsert(
    {
      proposal_id: proposalId,
      notas_actividades: notas.notasActividades || null,
      notas_viaticos: notas.notasViaticos || null,
      notas_presupuesto: notas.notasPresupuesto || null,
      notas_generales: notas.notasGenerales || null,
      analisis_ia: analisis,
      generado_at: new Date().toISOString(),
    },
    { onConflict: "proposal_id" }
  );
  if (error) return { error: error.message, analisis: null };

  revalidatePath(`/produccion/${proposalId}/informe`);
  return { error: null, analisis };
}
