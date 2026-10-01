"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoAnticipo } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { SaveStatus, useConfirm, useUnsavedChanges } from "@/app/components/ui-guard";
import { saveLegalizacionPersona, type SaveGastoRow } from "./actions";

interface Props {
  staffId: string;
  proposalId: string;
  staff: EventStaff;
  eventCity: string | null;
  anticipos: ViaticoAnticipo[];
  initialMeta: LegalizacionMeta | null;
  initialGastos: LegalizacionGasto[];
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

export function LegalizarForm({
  staffId,
  proposalId,
  staff,
  eventCity,
  anticipos,
  initialMeta,
  initialGastos,
}: Props) {
  const [responsable, setResponsable] = useState(initialMeta?.responsable ?? staff.full_name ?? "");
  const [actividad, setActividad] = useState(initialMeta?.actividad ?? "Producción");
  const [ciudadElaboracion, setCiudadElaboracion] = useState(
    initialMeta?.ciudad_elaboracion ?? eventCity ?? ""
  );
  const [fechaElaboracion, setFechaElaboracion] = useState(
    initialMeta?.fecha_elaboracion ?? new Date().toISOString().slice(0, 10)
  );
  const [gastos, setGastos] = useState<LegalizacionGasto[]>(initialGastos);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirm();
  const { dirty, resetTo } = useUnsavedChanges({
    responsable,
    actividad,
    ciudadElaboracion,
    fechaElaboracion,
    gastos,
    deletedIds,
  });
  // Tras guardar, los gastos nuevos dejan de ser temporales: se adopta lo guardado en la base
  // de datos para que guardar otra vez no los inserte duplicados.
  const awaitingSync = useRef(false);

  useEffect(() => {
    if (!awaitingSync.current) return;
    awaitingSync.current = false;
    setGastos(initialGastos);
    setDeletedIds([]);
    resetTo({
      responsable,
      actividad,
      ciudadElaboracion,
      fechaElaboracion,
      gastos: initialGastos,
      deletedIds: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGastos]);

  const totalAnticipo = anticipos.reduce((s, a) => s + a.valor, 0);
  const totalSoportes = gastos.reduce((s, g) => s + g.valor, 0);
  const diferencia = totalAnticipo - totalSoportes;

  function addGasto() {
    setGastos((prev) => [
      ...prev,
      {
        id: tempId(),
        proposal_id: proposalId,
        staff_id: staffId,
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

  async function removeGasto(id: string) {
    if (!isTemp(id)) {
      const ok = await confirm({
        title: "¿Quitar este gasto?",
        message: "El cambio se aplica al pulsar Guardar.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setGastos((prev) => prev.filter((g) => g.id !== id));
    if (!isTemp(id)) setDeletedIds((prev) => [...prev, id]);
  }

  function handleSave() {
    setMessage(null);
    awaitingSync.current = true;
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
      const result = await saveLegalizacionPersona({
        staffId,
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
      if (result.error) awaitingSync.current = false;
      setMessage(result.error ? `Error: ${result.error}` : "Guardado — puedes seguir editando si falta algo.");
    });
  }

  return (
    <div className="mt-5 space-y-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Tus datos</h2>
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
            value={fechaElaboracion}
            onChange={(e) => setFechaElaboracion(e.target.value)}
            className={inputClass}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-neutral-900">Anticipo que recibiste</h2>
        {anticipos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            Todavía no tienes un anticipo registrado por Producción.
          </p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="py-1">Fecha</th>
                <th className="py-1 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {anticipos.map((a) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="py-1.5">{a.fecha ? formatFechaCorta(a.fecha) : "—"}</td>
                  <td className="py-1.5 text-right">{formatCOP(a.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-900">
          <span>Total anticipo</span>
          <span>{formatCOP(totalAnticipo)}</span>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Soportes (recibos / facturas de lo que gastaste)
          </h2>
          <button
            type="button"
            onClick={addGasto}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Agregar gasto
          </button>
        </div>
        {gastos.length === 0 ? (
          <p className="text-sm text-neutral-400">Todavía no has agregado ningún gasto.</p>
        ) : (
          <div className="space-y-3">
            {gastos.map((g) => (
              <div key={g.id} className="rounded-md border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500">Gasto</span>
                  <button
                    type="button"
                    onClick={() => removeGasto(g.id)}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-neutral-500">
                    Fecha
                    <input
                      type="date"
                      value={g.fecha ?? ""}
                      onChange={(e) => patchGasto(g.id, { fecha: e.target.value || null })}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="text-xs text-neutral-500">
                    N° Recibo / factura
                    <input
                      value={g.numero_recibo ?? ""}
                      onChange={(e) => patchGasto(g.id, { numero_recibo: e.target.value })}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="text-xs text-neutral-500">
                    A quién le pagaste (tercero)
                    <input
                      value={g.tercero ?? ""}
                      onChange={(e) => patchGasto(g.id, { tercero: e.target.value })}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="text-xs text-neutral-500">
                    Rubro
                    <input
                      list="rubros-list"
                      value={g.rubro ?? ""}
                      onChange={(e) => patchGasto(g.id, { rubro: e.target.value })}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="col-span-2 text-xs text-neutral-500">
                    Concepto
                    <input
                      value={g.concepto ?? ""}
                      onChange={(e) => patchGasto(g.id, { concepto: e.target.value })}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="text-xs text-neutral-500">
                    Valor
                    <input
                      type="number"
                      min={0}
                      value={g.valor}
                      onChange={(e) => patchGasto(g.id, { valor: Number(e.target.value) || 0 })}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
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

      <section className="rounded-md bg-neutral-50 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-neutral-900">Diferencia</span>
          <span className={`font-semibold ${diferencia >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatCOP(diferencia)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">
          {diferencia >= 0
            ? "Si sobró dinero del anticipo, debes devolverlo o se te descuenta."
            : "Si gastaste más de lo que te giraron, Producción debe reembolsarte la diferencia."}
        </p>
      </section>

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar mi legalización"}
      </button>
      <SaveStatus dirty={dirty} isPending={isPending} message={message} className="text-center" />
    </div>
  );
}
