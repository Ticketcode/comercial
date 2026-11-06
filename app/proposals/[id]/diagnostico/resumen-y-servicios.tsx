"use client";

import { formatCOP } from "@/lib/pricing/summary";

export interface ResumenPrecio {
  logistica: number;
  /** Costo del acompañamiento de EVE en sitio (0 si no lo lleva). */
  acompanamientoEve: number;
  /** Precio de EVE: fee fijo más valor por asistente (0 si la propuesta no lleva EVE). */
  eve: number;
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
          Valor provisional: {pendientes === 1 ? "falta 1 dato" : `faltan ${pendientes} datos`} del diagnóstico.
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
        {r.acompanamientoEve > 0 && (
          <div className={fila}>
            <dt className="text-muted">+ Acompañamiento de EVE (con imprevistos)</dt>
            <dd className="font-semibold text-ink">{formatCOP(r.acompanamientoEve)}</dd>
          </div>
        )}
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
        {r.eve > 0 && (
          <div className={fila}>
            <dt className="text-muted">+ EVE (fee + valor por asistente, precio directo)</dt>
            <dd className="font-semibold text-ink">{formatCOP(r.eve)}</dd>
          </div>
        )}
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
