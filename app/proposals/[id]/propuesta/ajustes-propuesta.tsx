"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PedirCambioButton } from "../asistente/asistente-panel";
import { guardarComponente, guardarCronograma, guardarPagos, guardarRequerimientos, guardarTextoServicio } from "./guiado-actions";

export interface ComponenteProp {
  selId: string;
  grupo: "Componentes básicos" | "Logística 360";
  nombre: string;
  descripcion: string | null;
  incluido: boolean;
  customName: string | null;
  customDescription: string | null;
}
export interface ServicioProp {
  id: string;
  nombre: string;
  descripcion: string | null;
  customName: string | null;
  customDescription: string | null;
}
export interface PagoProp {
  id: string;
  label: string;
  pct: number;
}
export interface HitoProp {
  id: string;
  week_number: number;
  day_number: number | null;
  hito: string;
  comentario: string | null;
}
export interface RequerimientoProp {
  id: string;
  text: string;
}

const card = "space-y-4 rounded-2xl border border-border bg-surface p-5";
const input = "min-h-10 w-full rounded-field border border-border bg-input-bg px-3 text-sm text-ink";
const boton = "min-h-10 rounded-pill border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface2 disabled:opacity-50";
const botonPrimario = "min-h-10 rounded-pill bg-accent px-5 text-sm font-bold text-accent-ink disabled:opacity-50";

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

function Mensaje({ m }: { m: Mensaje }) {
  if (!m) return null;
  return (
    <p role={m.tipo === "error" ? "alert" : "status"} className={`text-sm font-semibold ${m.tipo === "error" ? "text-danger" : "text-ink"}`}>
      {m.texto}
    </p>
  );
}

/** Todo lo que se ajustaba en el modo avanzado de la Propuesta, ahora en la misma pantalla: qué incluye, pagos, cronograma y requerimientos. */
export function AjustesPropuesta({
  proposalId,
  componentes,
  servicios,
  pagos,
  cronograma,
  requerimientos,
}: {
  proposalId: string;
  componentes: ComponenteProp[];
  servicios: ServicioProp[];
  pagos: PagoProp[];
  cronograma: HitoProp[];
  requerimientos: RequerimientoProp[];
}) {
  return (
    <div className="space-y-5">
      <QueIncluye proposalId={proposalId} componentes={componentes} servicios={servicios} />
      <ModeloPagos proposalId={proposalId} inicial={pagos} />
      <Cronograma proposalId={proposalId} inicial={cronograma} />
      <Requerimientos proposalId={proposalId} inicial={requerimientos} />
    </div>
  );
}

function FilaTexto({
  titulo,
  descripcion,
  placeholderTitulo,
  onGuardar,
  onCancelar,
  pendiente,
}: {
  titulo: string;
  descripcion: string;
  placeholderTitulo: string;
  onGuardar: (titulo: string, descripcion: string) => void;
  onCancelar: () => void;
  pendiente: boolean;
}) {
  const [t, setT] = useState(titulo);
  const [d, setD] = useState(descripcion);
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-surface2 p-3">
      <input className={input} value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholderTitulo} maxLength={200} aria-label="Título" />
      <textarea className={`${input} py-2`} rows={3} value={d} onChange={(e) => setD(e.target.value)} placeholder="Descripción" maxLength={1500} aria-label="Descripción" />
      <div className="flex gap-2">
        <button type="button" className={botonPrimario} disabled={pendiente} onClick={() => onGuardar(t, d)}>
          Guardar texto
        </button>
        <button type="button" className={boton} onClick={onCancelar}>
          Cancelar
        </button>
      </div>
      <p className="text-xs text-muted">Déjalo vacío para volver al texto del catálogo.</p>
    </div>
  );
}

function QueIncluye({ proposalId, componentes, servicios }: { proposalId: string; componentes: ComponenteProp[]; servicios: ServicioProp[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<Mensaje>(null);
  const [editando, setEditando] = useState<string | null>(null);

  function correr(fn: () => Promise<{ error: string | null }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setEditando(null);
        router.refresh();
      }
    });
  }

  const grupos: ComponenteProp["grupo"][] = ["Componentes básicos", "Logística 360"];
  return (
    <section aria-label="Qué incluye la propuesta" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Qué incluye la propuesta</h2>
          <p className="mt-1 text-sm text-muted">Marca lo que va y cambia el texto con el que lo ve el cliente. Los servicios se eligen en el Diagnóstico.</p>
        </div>
        <PedirCambioButton sobre="qué incluye la propuesta" />
      </div>
      {grupos.map((g) => {
        const lista = componentes.filter((c) => c.grupo === g);
        if (lista.length === 0) return null;
        return (
          <div key={g}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{g}</h3>
            <ul className="mt-2 divide-y divide-border">
              {lista.map((c) => (
                <li key={c.selId} className="py-2.5">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={c.incluido} disabled={pendiente} onChange={() => correr(() => guardarComponente(proposalId, c.selId, { included: !c.incluido }))} aria-label={`Incluir ${c.customName || c.nombre}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{c.customName || c.nombre}</p>
                      {(c.customDescription || c.descripcion) && <p className="text-xs text-muted">{c.customDescription || c.descripcion}</p>}
                    </div>
                    <button type="button" className="shrink-0 text-xs font-semibold text-muted underline" onClick={() => setEditando(editando === c.selId ? null : c.selId)}>
                      Editar texto
                    </button>
                  </div>
                  {editando === c.selId && (
                    <FilaTexto
                      titulo={c.customName ?? ""}
                      descripcion={c.customDescription ?? ""}
                      placeholderTitulo={c.nombre}
                      pendiente={pendiente}
                      onCancelar={() => setEditando(null)}
                      onGuardar={(t, d) => correr(() => guardarComponente(proposalId, c.selId, { custom_name: t, custom_description: d }))}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {servicios.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Servicios personalizados</h3>
          <ul className="mt-2 divide-y divide-border">
            {servicios.map((s) => (
              <li key={s.id} className="py-2.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{s.customName || s.nombre}</p>
                    {(s.customDescription || s.descripcion) && <p className="text-xs text-muted">{s.customDescription || s.descripcion}</p>}
                  </div>
                  <button type="button" className="shrink-0 text-xs font-semibold text-muted underline" onClick={() => setEditando(editando === s.id ? null : s.id)}>
                    Editar texto
                  </button>
                </div>
                {editando === s.id && (
                  <FilaTexto
                    titulo={s.customName ?? ""}
                    descripcion={s.customDescription ?? ""}
                    placeholderTitulo={s.nombre}
                    pendiente={pendiente}
                    onCancelar={() => setEditando(null)}
                    onGuardar={(t, d) => correr(() => guardarTextoServicio(proposalId, s.id, { custom_name: t, custom_description: d }))}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Mensaje m={msg} />
    </section>
  );
}

function ModeloPagos({ proposalId, inicial }: { proposalId: string; inicial: PagoProp[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [filas, setFilas] = useState<{ id?: string; label: string; pct: string }[]>(inicial.map((p) => ({ id: p.id, label: p.label, pct: String(p.pct) })));
  const [msg, setMsg] = useState<Mensaje>(null);
  const suma = filas.reduce((a, f) => a + (Number(f.pct) || 0), 0);
  const cambiar = (i: number, parche: Partial<{ label: string; pct: string }>) => setFilas((p) => p.map((f, j) => (j === i ? { ...f, ...parche } : f)));

  function guardar() {
    setMsg(null);
    start(async () => {
      const r = await guardarPagos(proposalId, filas.map((f) => ({ id: f.id, label: f.label, pct: Number(f.pct) || 0 })));
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setMsg({ tipo: "ok", texto: "Modelo de pagos guardado." });
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Modelo de pagos" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Modelo de pagos</h2>
          <p className="mt-1 text-sm text-muted">Los porcentajes deben sumar 100%.</p>
        </div>
        <PedirCambioButton sobre="el modelo de pagos" />
      </div>
      <ul className="space-y-2">
        {filas.map((f, i) => (
          <li key={f.id ?? `n${i}`} className="flex flex-wrap items-center gap-2">
            <input className={`${input} min-w-48 flex-1`} value={f.label} onChange={(e) => cambiar(i, { label: e.target.value })} placeholder="Ej. Anticipo a la firma" aria-label="Nombre del pago" maxLength={200} />
            <input className={`${input} w-24 text-right`} type="number" min={0} max={100} step="any" value={f.pct} onChange={(e) => cambiar(i, { pct: e.target.value })} aria-label="Porcentaje" />
            <span className="text-sm text-muted">%</span>
            <button type="button" className={boton} disabled={filas.length <= 1} onClick={() => setFilas((p) => p.filter((_, j) => j !== i))} aria-label="Quitar pago">
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={boton} onClick={() => setFilas((p) => [...p, { label: "", pct: "0" }])}>
          + Agregar pago
        </button>
        <span className={`text-sm font-semibold ${Math.abs(suma - 100) > 0.01 ? "text-danger" : "text-ink"}`}>Suma: {Math.round(suma * 100) / 100}%</span>
        <button type="button" className={botonPrimario} disabled={pendiente} onClick={guardar}>
          {pendiente ? "Guardando…" : "Guardar pagos"}
        </button>
      </div>
      <Mensaje m={msg} />
    </section>
  );
}

function Cronograma({ proposalId, inicial }: { proposalId: string; inicial: HitoProp[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [filas, setFilas] = useState<{ id?: string; semana: string; dia: string; hito: string; comentario: string }[]>(
    inicial.map((h) => ({ id: h.id, semana: String(h.week_number), dia: h.day_number === null ? "" : String(h.day_number), hito: h.hito, comentario: h.comentario ?? "" }))
  );
  const [msg, setMsg] = useState<Mensaje>(null);
  const cambiar = (i: number, parche: Partial<{ semana: string; dia: string; hito: string; comentario: string }>) => setFilas((p) => p.map((f, j) => (j === i ? { ...f, ...parche } : f)));

  function guardar() {
    setMsg(null);
    start(async () => {
      const r = await guardarCronograma(
        proposalId,
        filas.map((f) => ({ id: f.id, week_number: Number(f.semana), day_number: f.dia.trim() === "" ? null : Number(f.dia), hito: f.hito, comentario: f.comentario || null }))
      );
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setMsg({ tipo: "ok", texto: "Cronograma guardado." });
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Cronograma" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Cronograma</h2>
          <p className="mt-1 text-sm text-muted">Cada hito va en una semana (y, si quieres, un día). Quita o agrega las filas que necesites.</p>
        </div>
        <PedirCambioButton sobre="el cronograma" />
      </div>
      <ul className="space-y-3">
        {filas.map((f, i) => (
          <li key={f.id ?? `n${i}`} className="grid gap-2 rounded-xl bg-surface2 p-3 sm:grid-cols-[5rem_5rem_minmax(0,1fr)_auto]">
            <label className="text-xs font-semibold text-muted">
              Semana
              <input className={input} type="number" min={1} max={52} value={f.semana} onChange={(e) => cambiar(i, { semana: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-muted">
              Día
              <input className={input} type="number" min={1} max={31} value={f.dia} placeholder="—" onChange={(e) => cambiar(i, { dia: e.target.value })} />
            </label>
            <div className="space-y-2">
              <input className={input} value={f.hito} onChange={(e) => cambiar(i, { hito: e.target.value })} placeholder="Hito" aria-label="Hito" maxLength={300} />
              <input className={input} value={f.comentario} onChange={(e) => cambiar(i, { comentario: e.target.value })} placeholder="Comentario (opcional)" aria-label="Comentario" maxLength={600} />
            </div>
            <button type="button" className={`${boton} self-start`} onClick={() => setFilas((p) => p.filter((_, j) => j !== i))} aria-label="Quitar hito">
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={boton} onClick={() => setFilas((p) => [...p, { semana: String(p.at(-1)?.semana ?? 1), dia: "", hito: "", comentario: "" }])}>
          + Agregar hito
        </button>
        <button type="button" className={botonPrimario} disabled={pendiente} onClick={guardar}>
          {pendiente ? "Guardando…" : "Guardar cronograma"}
        </button>
      </div>
      <Mensaje m={msg} />
    </section>
  );
}

function Requerimientos({ proposalId, inicial }: { proposalId: string; inicial: RequerimientoProp[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [filas, setFilas] = useState<{ id?: string; text: string }[]>(inicial.map((r) => ({ id: r.id, text: r.text })));
  const [msg, setMsg] = useState<Mensaje>(null);

  function guardar() {
    setMsg(null);
    start(async () => {
      const r = await guardarRequerimientos(proposalId, filas);
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setMsg({ tipo: "ok", texto: "Requerimientos guardados." });
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Requerimientos operativos" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Requerimientos operativos</h2>
          <p className="mt-1 text-sm text-muted">Lo que el organizador debe disponer para la operación.</p>
        </div>
        <PedirCambioButton sobre="los requerimientos operativos" />
      </div>
      <ul className="space-y-2">
        {filas.map((f, i) => (
          <li key={f.id ?? `n${i}`} className="flex items-start gap-2">
            <textarea className={`${input} py-2`} rows={2} value={f.text} onChange={(e) => setFilas((p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} aria-label={`Requerimiento ${i + 1}`} maxLength={500} />
            <button type="button" className={boton} onClick={() => setFilas((p) => p.filter((_, j) => j !== i))} aria-label="Quitar requerimiento">
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={boton} onClick={() => setFilas((p) => [...p, { text: "" }])}>
          + Agregar requerimiento
        </button>
        <button type="button" className={botonPrimario} disabled={pendiente} onClick={guardar}>
          {pendiente ? "Guardando…" : "Guardar requerimientos"}
        </button>
      </div>
      <Mensaje m={msg} />
    </section>
  );
}
