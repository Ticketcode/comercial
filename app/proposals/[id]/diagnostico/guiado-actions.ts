"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cargarEstado, aplicarAtomos } from "@/lib/ai/estado";
import { validarCambios, type Atomo, type EstadoPropuesta } from "@/lib/ai/cambios";

export type EstadoPregunta = "ia" | "ok" | "na";

export type Respuesta =
  | { id: "aforo" | "aforoVirtual" | "dias" | "productor" | "supervisores" | "logisticos" | "puntos"; valor: number }
  | { id: "ciudad"; valor: string }
  | { id: "pre"; modo: "no" | "completo" | "medio"; dias: number }
  | { id: "cred"; valor: "ninguna" | "manillas" | "escarapelas" | "ambas" }
  | { id: "extrasCred"; branding: boolean; labels: boolean };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

/** Busca un servicio del catálogo de la propuesta por una frase de su nombre. */
const buscar = (e: EstadoPropuesta, frase: string) => e.servicios.find((s) => norm(s.label).includes(frase));

function servicio(e: EstadoPropuesta, frase: string, incluir: boolean, cantidad?: number): Atomo[] {
  const s = buscar(e, frase);
  if (!s) return [];
  // Quitar algo que no estaba incluido no cambia nada.
  if (!incluir && !s.included) return [];
  return [{ id: `g${frase}`, tipo: "servicio", servicio: { label: s.label, incluir, ...(incluir && cantidad !== undefined ? { cantidad } : {}) } }];
}

/** Convierte la respuesta a una pregunta del diagnóstico en cambios concretos (todos se validan antes de escribir). */
function atomosDeRespuesta(r: Respuesta, e: EstadoPropuesta, aforoScales: Parameters<typeof validarCambios>[2]["aforoScales"]): Atomo[] {
  const ctx = { aforoScales };
  const simple = (clave: string, v: number) => validarCambios({ [clave]: v }, e, ctx).atomos;
  switch (r.id) {
    case "aforo":
    case "aforoVirtual":
    case "dias":
    case "productor":
    case "supervisores":
    case "logisticos":
      return simple(r.id, r.valor);
    case "ciudad":
      return validarCambios({ ciudad: r.valor }, e, ctx).atomos;
    case "puntos":
      return servicio(e, "venta de boleteria en sitio", r.valor > 0, r.valor);
    case "pre": {
      const campos: Atomo[] = [{ id: "gpre", tipo: "campos", campos: { preacreditacion_medio_dia: r.modo === "medio" } }];
      const dias = Math.min(10, Math.max(1, Math.round(r.dias || 1)));
      return [...campos, ...servicio(e, "pre acreditacion", r.modo !== "no", dias)];
    }
    case "cred": {
      const n = Math.max(1, Math.round(Number(e.proposal.aforo ?? 0)));
      return [
        ...servicio(e, "manillas", r.valor === "manillas" || r.valor === "ambas", n),
        ...servicio(e, "escarapelas fisicas", r.valor === "escarapelas" || r.valor === "ambas", n),
      ];
    }
    case "extrasCred":
      return [...servicio(e, "branding", r.branding, 1), ...servicio(e, "labels de seguridad", r.labels, 1)];
  }
}

/** El asesor contesta una pregunta del Diagnóstico: se aplican los cambios y la pregunta queda confirmada (o "no aplica"). */
export async function responderPregunta(
  proposalId: string,
  respuesta: Respuesta,
  noAplica = false
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta." };

  const atomos = atomosDeRespuesta(respuesta, base.estado, base.aforoScales);
  if (atomos.length > 0) {
    const r = await aplicarAtomos(supabase, proposalId, base.estado, atomos);
    if (r.error) return { error: r.error };
  }

  // Estado de la pregunta. Si la columna aún no existe (migración 0044 pendiente) no se frena el flujo.
  const previo = ((base.estado.proposal as unknown as { diagnostico_estado?: Record<string, string> }).diagnostico_estado ?? {}) as Record<string, string>;
  await supabase
    .from("proposals")
    .update({ diagnostico_estado: { ...previo, [respuesta.id]: noAplica ? "na" : "ok" } })
    .eq("id", proposalId);

  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}
