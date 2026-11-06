"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCOP } from "@/lib/pricing/summary";
import { alternarServicio, cambiarCantidadServicio, cambiarPrecioServicio } from "./guiado-actions";

export interface ServicioDiag {
  label: string;
  incluido: boolean;
  /** Valor unitario de catálogo. */
  precio: number;
  /** Cantidad con la que entra al precio (los de correo y cloud usan el aforo). */
  cantidad: number;
  /** Se puede cambiar a mano (no se calcula solo ni depende de una pregunta). */
  editable: boolean;
  /** Texto bajo el nombre: de dónde sale la cantidad. */
  nota: string;
  /** Lo pone el organizador (evento sin logística de Ticketcode): se muestra con su cantidad pero sin costo. */
  sinCosto?: boolean;
}

const th = "py-2 text-xs font-semibold uppercase tracking-wide text-muted";

/** Servicios personalizados: arriba los incluidos (cantidad, unitario y costo) y abajo solo los que faltan por elegir. */
export function ServiciosPersonalizados({ proposalId, servicios }: { proposalId: string; servicios: ServicioDiag[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});

  const incluidos = servicios.filter((s) => s.incluido);
  const disponibles = servicios.filter((s) => !s.incluido);

  function correr(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else {
        setBorrador({});
        router.refresh();
      }
    });
  }
  const cambiar = (label: string, incluir: boolean) => correr(() => alternarServicio(proposalId, label, incluir));
  const guardarPrecio = (s: ServicioDiag) => {
    const v = borrador["p:" + s.label];
    if (v === undefined || v === "" || Number(v) === s.precio) return;
    correr(() => cambiarPrecioServicio(proposalId, s.label, Number(v)));
  };
  const guardarCantidad = (s: ServicioDiag) => {
    const v = borrador[s.label];
    if (v === undefined || Number(v) === s.cantidad) return;
    correr(() => cambiarCantidadServicio(proposalId, s.label, Number(v)));
  };

  return (
    <section aria-label="Servicios personalizados" className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-extrabold text-ink">Servicios personalizados</h2>
      <p className="mt-1 text-sm text-muted">Marca los que pidió el cliente. Parten del precio de catálogo y puedes cambiar el valor unitario si negociaste otro; los de correo y cloud usan el aforo.</p>

      {incluidos.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="border-b border-border text-left">
              <tr>
                <th className={th}>Incluidos ahora</th>
                <th className={`${th} text-right`}>Cantidad</th>
                <th className={`${th} text-right`}>Unitario</th>
                <th className={`${th} text-right`}>Costo</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {incluidos.map((s) => (
                <tr key={s.label} className="align-top">
                  <td className="py-2.5 pr-3">
                    <p className="text-ink">{s.label}</p>
                    <p className="text-xs text-muted">{s.sinCosto ? `${s.nota} · Lo pone el organizador, sin costo` : s.nota}</p>
                  </td>
                  <td className="py-2.5 text-right text-ink">
                    {s.editable ? (
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        value={borrador[s.label] ?? String(s.cantidad)}
                        onChange={(e) => setBorrador((b) => ({ ...b, [s.label]: e.target.value }))}
                        onBlur={() => guardarCantidad(s)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        aria-label={`Cantidad de ${s.label}`}
                        className="min-h-9 w-20 rounded-field border border-border bg-input-bg px-2 text-right text-sm"
                      />
                    ) : (
                      s.cantidad.toLocaleString("es-CO")
                    )}
                  </td>
                  <td className="py-2.5 text-right text-ink">
                    {s.sinCosto ? (
                      "—"
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={borrador["p:" + s.label] ?? String(s.precio)}
                        onChange={(e) => setBorrador((b) => ({ ...b, ["p:" + s.label]: e.target.value }))}
                        onBlur={() => guardarPrecio(s)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        aria-label={`Valor unitario de ${s.label}`}
                        className="min-h-9 w-28 rounded-field border border-border bg-input-bg px-2 text-right text-sm"
                      />
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-ink">{s.sinCosto ? "Sin costo" : formatCOP(s.precio * s.cantidad)}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <button type="button" disabled={pendiente} onClick={() => cambiar(s.label, false)} className="text-xs font-semibold text-muted underline disabled:opacity-50">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{incluidos.length > 0 ? "Otros servicios disponibles" : "Servicios disponibles"}</h3>
      {disponibles.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{servicios.length === 0 ? "No hay servicios personalizados para esta modalidad." : "Ya incluiste todos los servicios disponibles."}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {disponibles.map((s) => (
            <li key={s.label}>
              <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <input type="checkbox" checked={false} disabled={pendiente} onChange={() => cambiar(s.label, true)} className="h-4 w-4 shrink-0" />
                  <span className="text-sm text-ink">{s.label}</span>
                </span>
                <span className="shrink-0 text-right text-sm text-muted">{formatCOP(s.precio)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
