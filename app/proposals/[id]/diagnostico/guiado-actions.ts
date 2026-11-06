"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cargarEstado, aplicarAtomos, marcarPreguntas } from "@/lib/ai/estado";
import { consultarCambios, excedeTope } from "@/lib/ai/consulta";
import { validarCambios, preguntasDeAtomo, PREGUNTAS_DIAGNOSTICO, type Atomo, type CambiosCrudos, type EstadoPropuesta } from "@/lib/ai/cambios";

export type EstadoPregunta = "ia" | "ok" | "na";

export type Respuesta =
  | { id: "evento"; aforo?: number; aforoVirtual?: number; dias: number; ciudad?: string }
  | { id: "equipo"; productor: number; supervisores: number; logisticos: number }
  | { id: "puntos"; valor: number }
  | { id: "pre"; modo: "no" | "completo" | "medio"; dias: number }
  | { id: "cred"; valor: "ninguna" | "manillas" | "escarapelas" | "ambas" };

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
  switch (r.id) {
    case "evento":
      // Aforo (recalcula la dotación), aforo virtual, días y ciudad se validan juntos con las mismas reglas del chat.
      return validarCambios(
        { ...(r.aforo !== undefined ? { aforo: r.aforo } : {}), ...(r.aforoVirtual !== undefined ? { aforoVirtual: r.aforoVirtual } : {}), dias: r.dias, ...(r.ciudad ? { ciudad: r.ciudad } : {}) },
        e,
        ctx
      ).atomos;
    case "equipo":
      return validarCambios({ productor: r.productor, supervisores: r.supervisores, logisticos: r.logisticos }, e, ctx).atomos;
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
  const nuevoEstado: Record<string, string> = { ...previo, [respuesta.id]: noAplica ? "na" : "ok" };
  // Si cambió el aforo, la dotación se recalculó: el equipo vuelve a quedar por revisar.
  if (respuesta.id === "evento" && respuesta.aforo !== undefined && Number(base.estado.proposal.aforo ?? 0) !== respuesta.aforo) delete nuevoEstado.equipo;
  await supabase.from("proposals").update({ diagnostico_estado: nuevoEstado }).eq("id", proposalId);

  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}

/** El asesor da por buena una respuesta que había dejado NOVA ("NOVA · confirma"). */
export async function confirmarPregunta(proposalId: string, id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta." };
  await marcarPreguntas(supabase, proposalId, base.estado, [id], "ok");
  revalidatePath(`/proposals/${proposalId}/diagnostico`);
  return { error: null };
}

/** Marca o desmarca un servicio personalizado del catálogo (misma validación que el resto de cambios). */
export async function alternarServicio(proposalId: string, label: string, incluir: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta." };
  const fila = base.estado.servicios.find((s) => s.label === label);
  if (!fila) return { error: "Ese servicio no está disponible para esta propuesta." };
  // Manillas y escarapelas físicas: una por asistente.
  const porAsistente = incluir && /manillas|escarapelas fisicas/.test(norm(label));
  const cantidad = porAsistente ? Math.max(1, Math.round(Number(base.estado.proposal.aforo ?? 0))) : undefined;
  const atomo: Atomo = { id: "gsv", tipo: "servicio", servicio: { label, incluir, ...(cantidad !== undefined ? { cantidad } : {}) } };
  const r = await aplicarAtomos(supabase, proposalId, base.estado, [atomo]);
  if (r.error) return { error: r.error };
  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}

type DiagnosticoJson = Record<string, unknown>;

async function leerDiagnostico(supabase: Awaited<ReturnType<typeof createClient>>, proposalId: string): Promise<DiagnosticoJson> {
  const { data } = await supabase.from("proposals").select("diagnostico_estado").eq("id", proposalId).single();
  return ((data as { diagnostico_estado?: DiagnosticoJson } | null)?.diagnostico_estado ?? {}) as DiagnosticoJson;
}

/**
 * Notas de la reunión → NOVA llena lo que entienda. Los datos del evento y las respuestas quedan aplicados
 * como "NOVA · confirma"; los servicios que sugiere NO se agregan: quedan por confirmar.
 */
export async function extraerDiagnostico(
  proposalId: string,
  notas: string
): Promise<{ error: string | null; resumen: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar.", resumen: "" };
  const texto = notas.trim().slice(0, 6000);
  if (!texto) return { error: "Escribe o pega primero las notas de la reunión.", resumen: "" };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "Falta configurar ANTHROPIC_API_KEY en el servidor.", resumen: "" };
  if (excedeTope(auth.user.id)) return { error: "Muchas consultas seguidas. Espera unos minutos.", resumen: "" };

  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta.", resumen: "" };

  const { json, error } = await consultarCambios({
    apiKey,
    estado: base.estado,
    mensajes: [{ role: "user", content: `Notas de la reunión del diagnóstico (extrae solo lo que digan):\n${texto}` }],
    paso: "Diagnóstico (extracción desde notas)",
    sobre: null,
  });
  if (!json) return { error: error ?? "No se pudo consultar a NOVA.", resumen: "" };

  const { atomos } = validarCambios(json.cambios, base.estado, { aforoScales: base.aforoScales });
  // Todo lo que NOVA entiende de las notas se aplica directo; si algo no es correcto, se corrige con el chat o en los cuadros.
  const aAplicar = atomos;
  const sugeridos: Atomo[] = [];

  let estado = base.estado;
  if (aAplicar.length > 0) {
    const r = await aplicarAtomos(supabase, proposalId, estado, aAplicar);
    if (r.error) return { error: r.error, resumen: "" };
    estado = r.estado;
  }

  const confirmadasCrudas = (Array.isArray(json.confirmados) ? json.confirmados : []).filter(
    (x): x is string => typeof x === "string" && (PREGUNTAS_DIAGNOSTICO as readonly string[]).includes(x)
  );
  const preguntas = Array.from(new Set([...aAplicar.flatMap((a) => preguntasDeAtomo(a)), ...confirmadasCrudas]));

  const previo = await leerDiagnostico(supabase, proposalId);
  const yaPropuestos = Array.isArray(previo._servicios) ? (previo._servicios as string[]) : [];
  const nuevosServicios = sugeridos
    .map((a) => a.servicio!.label)
    .filter((l) => !yaPropuestos.includes(l) && !base.estado.servicios.find((s) => s.label === l)?.included);
  const sig: DiagnosticoJson = { ...previo };
  for (const q of preguntas) if (previo[q] !== "ok") sig[q] = "ia";
  if (nuevosServicios.length > 0) sig._servicios = [...yaPropuestos, ...nuevosServicios];
  await supabase.from("proposals").update({ diagnostico_estado: sig }).eq("id", proposalId);

  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  const partes = [
    preguntas.length > 0 ? `${preguntas.length} ${preguntas.length === 1 ? "respuesta" : "respuestas"}` : "",
    nuevosServicios.length > 0 ? `${nuevosServicios.length} ${nuevosServicios.length === 1 ? "servicio por confirmar" : "servicios por confirmar"}` : "",
  ].filter(Boolean);
  return {
    error: null,
    resumen: partes.length > 0 ? `Listo, completé ${partes.join(" y ")}. Revísalo abajo y confirma.` : "No encontré datos claros en las notas. Responde las preguntas a mano.",
  };
}

/** El asesor acepta o descarta un servicio que propuso NOVA desde las notas. */
export async function resolverServicioPropuesto(
  proposalId: string,
  label: string,
  aceptar: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  if (aceptar) {
    const r = await alternarServicio(proposalId, label, true);
    if (r.error) return r;
  }
  const previo = await leerDiagnostico(supabase, proposalId);
  const lista = (Array.isArray(previo._servicios) ? (previo._servicios as string[]) : []).filter((l) => l !== label);
  await supabase.from("proposals").update({ diagnostico_estado: { ...previo, _servicios: lista } }).eq("id", proposalId);
  revalidatePath(`/proposals/${proposalId}/diagnostico`);
  return { error: null };
}

/** Cambia la cantidad de un servicio ya incluido (solo los que no se calculan solos ni dependen de una pregunta). */
export async function cambiarCantidadServicio(proposalId: string, label: string, cantidad: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const n = Math.round(Number(cantidad));
  if (!Number.isFinite(n) || n < 1 || n > 100000) return { error: "La cantidad debe estar entre 1 y 100.000." };
  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta." };
  const fila = base.estado.servicios.find((s) => s.label === label);
  if (!fila || !fila.included) return { error: "Ese servicio no está incluido." };
  const atomo: Atomo = { id: "gcant", tipo: "servicio", servicio: { label, incluir: true, cantidad: n } };
  const r = await aplicarAtomos(supabase, proposalId, base.estado, [atomo]);
  if (r.error) return { error: r.error };
  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}

/**
 * El asesor edita un dato en los cuadros del Diagnóstico (o lo cambia NOVA): se valida con las mismas reglas
 * y se guarda al instante. Aquí no hay confirmaciones: lo que se ve en pantalla es lo que queda.
 */
export async function guardarDatos(proposalId: string, crudos: CambiosCrudos): Promise<{ error: string | null; avisos: string[] }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar.", avisos: [] };
  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta.", avisos: [] };

  const { atomos, bloqueados } = validarCambios(crudos, base.estado, { aforoScales: base.aforoScales });
  const avisos = bloqueados.map((b) => `${b.etiqueta}: ${b.motivo}`);
  if (atomos.length === 0) return { error: avisos.length > 0 ? avisos.join(". ") : null, avisos };

  const r = await aplicarAtomos(supabase, proposalId, base.estado, atomos);
  if (r.error) return { error: r.error, avisos };
  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null, avisos };
}

/** Ajusta a mano los días y/o la cantidad de un rubro de la Logística 360 (null = volver al cálculo automático). */
export async function ajustarRubroLogistica(
  proposalId: string,
  label: string,
  ajuste: { dias?: number; quantity?: number } | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  if (!label || label.length > 160) return { error: "Rubro no válido." };
  const { data } = await supabase.from("proposals").select("logistics_overrides").eq("id", proposalId).single();
  const actual = ((data as { logistics_overrides?: Record<string, { dias?: number; quantity?: number }> } | null)?.logistics_overrides ?? {}) as Record<string, { dias?: number; quantity?: number }>;
  const sig = { ...actual };
  if (ajuste === null) delete sig[label];
  else {
    const limpio: { dias?: number; quantity?: number } = { ...(actual[label] ?? {}) };
    if (ajuste.dias !== undefined) {
      if (!Number.isFinite(ajuste.dias) || ajuste.dias < 0 || ajuste.dias > 60) return { error: "Los días deben estar entre 0 y 60." };
      limpio.dias = Math.round(ajuste.dias * 10) / 10;
    }
    if (ajuste.quantity !== undefined) {
      if (!Number.isFinite(ajuste.quantity) || ajuste.quantity < 0 || ajuste.quantity > 100000) return { error: "La cantidad debe estar entre 0 y 100.000." };
      limpio.quantity = Math.round(ajuste.quantity * 10) / 10;
    }
    sig[label] = limpio;
  }
  const { error } = await supabase.from("proposals").update({ logistics_overrides: sig }).eq("id", proposalId);
  if (error) return { error: error.message };
  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}

/** Cambia a mano el valor unitario de un servicio incluido (por ejemplo, un precio negociado distinto al de catálogo). */
export async function cambiarPrecioServicio(proposalId: string, label: string, precio: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const n = Math.round(Number(precio));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return { error: "El valor debe estar entre 0 y 1.000.000.000." };
  const base = await cargarEstado(supabase, proposalId);
  if (!base) return { error: "No se encontró la propuesta." };
  const fila = base.estado.servicios.find((s) => s.label === label);
  if (!fila || !fila.included) return { error: "Ese servicio no está incluido." };
  const { error } = await supabase.from("proposal_cost_items").update({ unit_cost: n }).eq("id", fila.id);
  if (error) return { error: error.message };
  for (const sub of ["diagnostico", "propuesta", "presentacion", "versiones", "contrato"]) {
    revalidatePath(`/proposals/${proposalId}/${sub}`);
  }
  return { error: null };
}
