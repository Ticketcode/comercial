"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCOP } from "@/lib/pricing/summary";
import { alternarServicio } from "./guiado-actions";

export interface ServicioDiag {
  label: string;
  incluido: boolean;
  /** Valor unitario de catálogo. */
  precio: number;
  /** Cantidad con la que entra al precio (los de correo y cloud usan el aforo). */
  cantidad: number;
}

export interface ResumenPrecio {
  logistica: number;
  servicios: number;
  totalCosto: number;
  rentabilidadPct: number;
  rentabilidad: number;
  comisionesPct: number;
  comisiones: number;
  valorFinal: number;
  iva: number;
  ivaRate: number;
  total: number;
}

const fila = "flex items-baseline justify-between gap-4 text-sm";

/** Tarjeta de resumen a la derecha del Diagnóstico: de dónde sale el valor de la propuesta. */
export function ResumenPrecioCard({ r, pendientes, evento }: { r: ResumenPrecio; pendientes: number; evento: string }) {
  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-4">
      <p className="text-xs text-muted">{evento}</p>
      <div>
        <p className="text-xs text-muted">Valor de la propuesta antes de IVA</p>
        <p className="font-display text-3xl font-extrabold text-ink">{formatCOP(r.valorFinal)}</p>
        <p className="text-xs text-muted">
          Con IVA ({Math.round(r.ivaRate * 100)}%): <strong className="text-ink">{formatCOP(r.total)}</strong>
        </p>
      </div>
      {pendientes > 0 && (
        <p className="rounded-xl bg-warn-bg px-3 py-2 text-xs text-warn-ink">
          Valor provisional: {pendientes} {pendientes === 1 ? "pregunta sin confirmar" : "preguntas sin confirmar"}. Usa valores de partida.
        </p>
      )}
      <dl className="space-y-2 border-t border-border pt-3">
        <div className={fila}>
          <dt className="text-muted">Logística (con imprevistos)</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.logistica)}</dd>
        </div>
        <div className={fila}>
          <dt className="text-muted">+ Servicios y paquetes</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.servicios)}</dd>
        </div>
        <div className={`${fila} border-t border-border pt-2`}>
          <dt className="font-semibold text-ink">Subtotal (costo, antes de rentabilidad)</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.totalCosto)}</dd>
        </div>
        <div className={fila}>
          <dt className="text-muted">+ Rentabilidad {Math.round(r.rentabilidadPct * 100)}%</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.rentabilidad)}</dd>
        </div>
        <div className={fila}>
          <dt className="text-muted">+ Comisiones {Math.round(r.comisionesPct * 100)}% (sobre subtotal + rentabilidad)</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.comisiones)}</dd>
        </div>
        <div className={`${fila} border-t border-border pt-2`}>
          <dt className="font-semibold text-ink">Valor propuesta antes de IVA</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.valorFinal)}</dd>
        </div>
        <div className={fila}>
          <dt className="text-muted">+ IVA {Math.round(r.ivaRate * 100)}%</dt>
          <dd className="font-semibold text-ink">{formatCOP(r.iva)}</dd>
        </div>
        <div className={`${fila} border-t border-border pt-2`}>
          <dt className="font-semibold text-ink">Total con IVA</dt>
          <dd className="font-display text-lg font-extrabold text-ink">{formatCOP(r.total)}</dd>
        </div>
      </dl>
    </aside>
  );
}

/** Servicios personalizados del catálogo: se marcan los que pidió el cliente. */
export function ServiciosPersonalizados({ proposalId, servicios }: { proposalId: string; servicios: ServicioDiag[] }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(label: string, incluir: boolean) {
    setError(null);
    start(async () => {
      const r = await alternarServicio(proposalId, label, incluir);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section aria-label="Servicios personalizados" className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-extrabold text-ink">Servicios personalizados</h2>
      <p className="mt-1 text-sm text-muted">Marca los que pidió el cliente. Precios de catálogo; los de correo y cloud usan el aforo.</p>
      {servicios.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No hay servicios personalizados para esta modalidad.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {servicios.map((s) => (
            <li key={s.label}>
              <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <input type="checkbox" checked={s.incluido} disabled={pendiente} onChange={(e) => cambiar(s.label, e.target.checked)} className="h-4 w-4 shrink-0" />
                  <span className="text-sm text-ink">{s.label}</span>
                </span>
                <span className="shrink-0 text-right text-sm text-muted">
                  {s.incluido && s.cantidad > 1 && <span className="mr-2 text-xs">× {s.cantidad.toLocaleString("es-CO")}</span>}
                  {formatCOP(s.precio)}
                </span>
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
