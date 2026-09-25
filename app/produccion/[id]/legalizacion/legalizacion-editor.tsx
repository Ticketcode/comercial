"use client";

import { useMemo, useState, useTransition } from "react";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoGiro } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { saveLegalizacion, type SaveGastoRow } from "./actions";

interface Props {
  proposalId: string;
  meta: LegalizacionMeta | null;
  initialGastos: LegalizacionGasto[];
  anticipos: ViaticoGiro[];
  staff: EventStaff[];
}

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

const RUBROS = [
  "Transporte",
  "Alimentación y cenas",
  "Refrigerios",
  "Honorarios",
  "Hospedaje",
  "Tiquetes terrestres",
  "Tiquetes aéreos",
  "Varios",
];

let tempCounter = 0;
function tempId() {
  tempCounter += 1;
  return `temp-gasto-${tempCounter}`;
}
function isTemp(id: string) {
  return id.startsWith("temp-");
}

export function LegalizacionEditor({ proposalId, meta, initialGastos, anticipos, staff }: Props) {
  const [responsable, setResponsable] = useState(meta?.responsable ?? "");
  const [actividad, setActividad] = useState(meta?.actividad ?? "Producción");
  const [ciudadElaboracion, setCiudadElaboracion] = useState(meta?.ciudad_elaboracion ?? "");
  const [fechaElaboracion, setFechaElaboracion] = useState(meta?.fecha_elaboracion ?? "");
  const [gastos, setGastos] = useState<LegalizacionGasto[]>(initialGastos);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const staffById = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s.full_name])),
    [staff]
  );

  const totalAnticipo = anticipos.reduce((s, a) => s + a.monto, 0);
  const totalSoportes = gastos.reduce((s, g) => s + g.valor, 0);
  const diferencia = totalAnticipo - totalSoportes;

  function addGasto() {
    setGastos((prev) => [
      ...prev,
      {
        id: tempId(),
        proposal_id: proposalId,
        fecha: null,
        numero_recibo: "",
        tercero: "",
        rubro: RUBROS[0],
        concepto: "",
        valor: 0,
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function patchGasto(id: string, patch: Partial<LegalizacionGasto>) {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGasto(id: string) {
    setGastos((prev) => prev.filter((g) => g.id !== id));
    if (!isTemp(id)) setDeletedIds((prev) => [...prev, id]);
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const toRow = (g: LegalizacionGasto): SaveGastoRow => ({
        id: g.id,
        fecha: g.fecha,
        numero_recibo: g.numero_recibo,
        tercero: g.tercero,
        rubro: g.rubro,
        concepto: g.concepto,
        valor: g.valor,
        sort_order: g.sort_order,
      });
      const result = await saveLegalizacion({
        proposalId,
        meta: {
          responsable: responsable || null,
          actividad: actividad || null,
          ciudad_elaboracion: ciudadElaboracion || null,
          fecha_elaboracion: fechaElaboracion || null,
        },
        gastos: {
          existing: gastos.filter((g) => !isTemp(g.id)).map(toRow),
          new: gastos.filter((g) => isTemp(g.id)).map(toRow),
          deletedIds,
        },
      });
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
      if (!result.error) setDeletedIds([]);
    });
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Datos de la legalización</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Actividad"
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Ciudad de elaboración"
              value={ciudadElaboracion}
              onChange={(e) => setCiudadElaboracion(e.target.value)}
              className={inputClass}
            />
            <input
              type="date"
              value={fechaElaboracion ?? ""}
              onChange={(e) => setFechaElaboracion(e.target.value)}
              className={inputClass}
            />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Anticipos girados</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Se toman automáticamente de los giros marcados &quot;Girado&quot; en Viáticos.
          </p>
          {anticipos.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">
              Todavía no hay giros marcados como &quot;Girado&quot; en Viáticos.
            </p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-400">
                  <th className="py-1">Fecha</th>
                  <th className="py-1">Girado a</th>
                  <th className="py-1 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {anticipos.map((a) => (
                  <tr key={a.id} className="border-t border-neutral-100">
                    <td className="py-1.5">
                      {a.fecha_giro ? formatFechaCorta(a.fecha_giro) : "—"}
                    </td>
                    <td className="py-1.5">{staffById[a.staff_id] ?? "—"}</td>
                    <td className="py-1.5 text-right">{formatCOP(a.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-900">
            <span>Total anticipos</span>
            <span>{formatCOP(totalAnticipo)}</span>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Soportes (gastos reales)</h3>
            <button
              type="button"
              onClick={addGasto}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              + Agregar gasto
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="w-28 py-1">Fecha</th>
                <th className="w-24 py-1">N° Recibo</th>
                <th className="py-1">Tercero</th>
                <th className="w-40 py-1">Rubro</th>
                <th className="py-1">Concepto</th>
                <th className="w-28 py-1 text-right">Valor</th>
                <th className="w-8 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-t border-neutral-100">
                  <td className="py-1 pr-1">
                    <input
                      type="date"
                      value={g.fecha ?? ""}
                      onChange={(e) => patchGasto(g.id, { fecha: e.target.value || null })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      value={g.numero_recibo ?? ""}
                      onChange={(e) => patchGasto(g.id, { numero_recibo: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      value={g.tercero ?? ""}
                      onChange={(e) => patchGasto(g.id, { tercero: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      list="rubros-list"
                      value={g.rubro ?? ""}
                      onChange={(e) => patchGasto(g.id, { rubro: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      value={g.concepto ?? ""}
                      onChange={(e) => patchGasto(g.id, { concepto: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      type="number"
                      min={0}
                      value={g.valor}
                      onChange={(e) => patchGasto(g.id, { valor: Number(e.target.value) || 0 })}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => removeGasto(g.id)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="rubros-list">
            {RUBROS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-900">
            <span>Total soportes</span>
            <span>{formatCOP(totalSoportes)}</span>
          </div>
        </section>
      </div>

      <div className="col-span-1">
        <div className="sticky top-6 space-y-2 rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Resumen</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Valor del anticipo</span>
            <span className="font-medium text-neutral-800">{formatCOP(totalAnticipo)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Soportes</span>
            <span className="font-medium text-neutral-800">{formatCOP(totalSoportes)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-sm">
            <span className="font-semibold text-neutral-900">Diferencia</span>
            <span className={`font-semibold ${diferencia >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatCOP(diferencia)}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {diferencia >= 0
              ? "Sobrante a favor de la empresa (debe devolverse o descontarse)."
              : "Faltante — se le debe reembolsar al responsable."}
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="mt-2 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
          {message && <p className="text-center text-xs text-neutral-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}
