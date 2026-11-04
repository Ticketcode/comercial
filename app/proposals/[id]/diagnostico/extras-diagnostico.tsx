"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCOP } from "@/lib/pricing/summary";
import { extraerDiagnostico, resolverServicioPropuesto } from "./guiado-actions";

const card = "rounded-2xl border border-border bg-surface p-5";

/** Notas de la reunión: Claude llena lo que entienda y pide confirmarlo abajo. */
export function NotasDiagnostico({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [notas, setNotas] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pensando, start] = useTransition();

  function extraer() {
    setMsg(null);
    start(async () => {
      const r = await extraerDiagnostico(proposalId, notas);
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setMsg({ tipo: "ok", texto: r.resumen });
        setNotas("");
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Notas del diagnóstico" className={card}>
      <h2 className="font-display text-xl font-extrabold text-ink">Notas del diagnóstico</h2>
      <p className="mt-1 text-sm text-muted">Pega las notas de la reunión. Claude llena lo que entienda y te pide confirmarlo abajo.</p>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={4}
        maxLength={6000}
        spellCheck
        lang="es"
        aria-label="Notas de la reunión"
        placeholder="Ej. Congreso en Cartagena, 14 a 16 de marzo, unas 1.200 personas. Quieren acreditación…"
        className="mt-3 w-full rounded-xl border border-border bg-input-bg p-3 text-sm text-ink"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={extraer} disabled={pensando || !notas.trim()} className="min-h-11 rounded-pill bg-accent px-5 text-sm font-bold text-accent-ink disabled:opacity-50">
          {pensando ? "Leyendo las notas…" : "Extraer con Claude"}
        </button>
        {msg && (
          <p role={msg.tipo === "error" ? "alert" : "status"} className={`text-sm font-semibold ${msg.tipo === "error" ? "text-danger" : "text-ink"}`}>
            {msg.texto}
          </p>
        )}
      </div>
    </section>
  );
}

/** Servicios que Claude sacó de las notas: no se agregan hasta que el asesor los acepta. */
export function ServiciosPropuestos({ proposalId, servicios }: { proposalId: string; servicios: string[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (servicios.length === 0) return null;

  function resolver(label: string, aceptar: boolean) {
    setError(null);
    start(async () => {
      const r = await resolverServicioPropuesto(proposalId, label, aceptar);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section aria-label="Servicios propuestos por Claude" className="rounded-2xl border border-accent bg-surface p-5">
      <h2 className="font-display text-lg font-extrabold text-ink">Claude propone estos servicios: ¿los confirmas?</h2>
      <ul className="mt-3 divide-y divide-border">
        {servicios.map((s) => (
          <li key={s} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <span className="text-sm font-semibold text-ink">{s}</span>
            <span className="flex gap-2">
              <button type="button" disabled={pendiente} onClick={() => resolver(s, true)} className="min-h-9 rounded-pill bg-accent px-4 text-xs font-bold text-accent-ink disabled:opacity-50">
                Aceptar
              </button>
              <button type="button" disabled={pendiente} onClick={() => resolver(s, false)} className="min-h-9 rounded-pill border border-border px-3 text-xs font-semibold text-muted disabled:opacity-50">
                Descartar
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

export interface LineaLogistica {
  label: string;
  dias: number;
  cantidad: number;
  tarifa: number;
  subtotal: number;
}
export interface RubroLogistica {
  titulo: string;
  total: number;
  lineas: LineaLogistica[];
}
export interface DetalleLogistica {
  rubros: RubroLogistica[];
  subtotal: number;
  imprevistos: number;
  total: number;
}

/** Desglose de la Logística 360 por rubros, para ver de dónde sale cada peso. */
export function LogisticaDetalle({ d }: { d: DetalleLogistica }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const todosAbiertos = abiertos.size === d.rubros.length;
  const alternar = (t: string) =>
    setAbiertos((prev) => {
      const sig = new Set(prev);
      if (sig.has(t)) sig.delete(t);
      else sig.add(t);
      return sig;
    });

  return (
    <section aria-label="Logística 360: costos" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold text-ink">Logística 360: costos</h2>
        <button type="button" className="text-sm font-semibold text-muted underline" onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(d.rubros.map((r) => r.titulo)))}>
          {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
        </button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {d.rubros.map((r, i) => {
          const abierto = abiertos.has(r.titulo);
          return (
            <li key={r.titulo} className="py-2">
              <button type="button" onClick={() => alternar(r.titulo)} aria-expanded={abierto} className="flex w-full items-center justify-between gap-4 py-1 text-left">
                <span className="text-sm font-semibold text-ink">
                  {i + 1}. {r.titulo}
                </span>
                <span className="flex items-center gap-3 text-sm text-ink">
                  {formatCOP(r.total)}
                  <span aria-hidden className="text-muted">
                    {abierto ? "▾" : "▸"}
                  </span>
                </span>
              </button>
              {abierto && (
                <ul className="mt-2 space-y-1.5 pl-4">
                  {r.lineas.length === 0 && <li className="text-xs text-muted">Sin líneas en este rubro.</li>}
                  {r.lineas.map((l) => (
                    <li key={l.label} className="flex flex-wrap items-baseline justify-between gap-3 text-xs">
                      <span className="text-muted">
                        {l.label}
                        <span className="ml-2">
                          ({l.dias > 1 ? `${l.dias} días × ` : ""}
                          {l.cantidad} × {formatCOP(l.tarifa)})
                        </span>
                      </span>
                      <span className="font-semibold text-ink">{formatCOP(l.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Sub total costo logística</dt>
          <dd className="font-semibold text-ink">{formatCOP(d.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Imprevistos (10%)</dt>
          <dd className="font-semibold text-ink">{formatCOP(d.imprevistos)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-ink">Total costo + imprevistos</dt>
          <dd className="font-semibold text-ink">{formatCOP(d.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
