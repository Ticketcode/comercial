"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoAnticipo } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { SaveStatus, useConfirm, useUnsavedChanges } from "@/app/components/ui-guard";
import { saveLegalizacion, type SaveGastoRow, type SaveMetaRow } from "./actions";

interface Props {
  proposalId: string;
  initialMetas: LegalizacionMeta[];
  initialGastos: LegalizacionGasto[];
  anticipos: ViaticoAnticipo[];
  staff: EventStaff[];
}

interface MetaFields {
  responsable: string;
  actividad: string;
  ciudad_elaboracion: string;
  fecha_elaboracion: string;
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

function buildMetaByStaff(staff: EventStaff[], metas: LegalizacionMeta[]): Record<string, MetaFields> {
  return Object.fromEntries(
    staff.map((s) => {
      const m = metas.find((m) => m.staff_id === s.id);
      return [
        s.id,
        {
          responsable: m?.responsable ?? s.full_name ?? "",
          actividad: m?.actividad ?? "Producción",
          ciudad_elaboracion: m?.ciudad_elaboracion ?? "",
          fecha_elaboracion: m?.fecha_elaboracion ?? "",
        },
      ];
    })
  );
}

export function LegalizacionEditor({
  proposalId,
  initialMetas,
  initialGastos,
  anticipos,
  staff,
}: Props) {
  const [activeStaffId, setActiveStaffId] = useState<string | null>(staff[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyLegalizarLink(staffId: string) {
    const url = `${window.location.origin}/legalizar/${staffId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(staffId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }
  const [metaByStaff, setMetaByStaff] = useState<Record<string, MetaFields>>(() =>
    buildMetaByStaff(staff, initialMetas)
  );
  const [gastos, setGastos] = useState<LegalizacionGasto[]>(initialGastos);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirm();
  const { dirty, resetTo } = useUnsavedChanges({ metaByStaff, gastos, deletedIds });
  // Tras guardar, los gastos nuevos dejan de ser temporales: se adopta lo guardado en la base
  // de datos para que un segundo guardado no los inserte otra vez.
  const awaitingSync = useRef(false);

  useEffect(() => {
    if (!awaitingSync.current) return;
    awaitingSync.current = false;
    const metas = buildMetaByStaff(staff, initialMetas);
    setMetaByStaff(metas);
    setGastos(initialGastos);
    setDeletedIds([]);
    resetTo({ metaByStaff: metas, gastos: initialGastos, deletedIds: [] });
  }, [initialMetas, initialGastos, staff, resetTo]);

  function patchMeta(staffId: string, patch: Partial<MetaFields>) {
    setMetaByStaff((prev) => ({ ...prev, [staffId]: { ...prev[staffId], ...patch } }));
  }

  const anticiposByStaff = useMemo(() => {
    const map: Record<string, ViaticoAnticipo[]> = {};
    for (const a of anticipos) {
      (map[a.staff_id] ??= []).push(a);
    }
    return map;
  }, [anticipos]);

  const gastosByStaff = useMemo(() => {
    const map: Record<string, LegalizacionGasto[]> = {};
    for (const g of gastos) {
      (map[g.staff_id] ??= []).push(g);
    }
    return map;
  }, [gastos]);

  const totalAnticipoPorPersona = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of staff) {
      map[s.id] = (anticiposByStaff[s.id] ?? []).reduce((sum, a) => sum + a.valor, 0);
    }
    return map;
  }, [staff, anticiposByStaff]);

  const totalSoportesPorPersona = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of staff) {
      map[s.id] = (gastosByStaff[s.id] ?? []).reduce((sum, g) => sum + g.valor, 0);
    }
    return map;
  }, [staff, gastosByStaff]);

  const totalAnticipo = anticipos.reduce((s, a) => s + a.valor, 0);
  const totalSoportes = gastos.reduce((s, g) => s + g.valor, 0);
  const diferencia = totalAnticipo - totalSoportes;

  function addGasto(staffId: string) {
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
        staff_id: g.staff_id,
        fecha: g.fecha,
        numero_recibo: g.numero_recibo,
        tercero: g.tercero,
        rubro: g.rubro,
        concepto: g.concepto,
        valor: g.valor,
        sort_order: g.sort_order,
      });
      const metas: SaveMetaRow[] = staff.map((s) => {
        const m = metaByStaff[s.id];
        return {
          staff_id: s.id,
          responsable: m.responsable || null,
          actividad: m.actividad || null,
          ciudad_elaboracion: m.ciudad_elaboracion || null,
          fecha_elaboracion: m.fecha_elaboracion || null,
        };
      });
      const result = await saveLegalizacion({
        proposalId,
        metas,
        gastos: {
          existing: gastos.filter((g) => !isTemp(g.id)).map(toRow),
          new: gastos.filter((g) => isTemp(g.id)).map(toRow),
          deletedIds,
        },
      });
      if (result.error) awaitingSync.current = false;
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
    });
  }

  const activeStaff = staff.find((s) => s.id === activeStaffId) ?? null;
  const activeMeta = activeStaff ? metaByStaff[activeStaff.id] : null;
  const activeGastos = activeStaff ? gastosByStaff[activeStaff.id] ?? [] : [];
  const activeAnticipos = activeStaff ? anticiposByStaff[activeStaff.id] ?? [] : [];
  const activeDiferencia = activeStaff
    ? (totalAnticipoPorPersona[activeStaff.id] ?? 0) - (totalSoportesPorPersona[activeStaff.id] ?? 0)
    : 0;

  if (staff.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Todavía no hay personal asignado a este evento. Agrégalo desde Viáticos.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-2">
          {staff.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStaffId(s.id)}
              className={`rounded-t-md px-3 py-1.5 text-xs font-medium ${
                activeStaffId === s.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s.full_name || "(sin nombre)"}
            </button>
          ))}
        </div>

        {activeStaff && activeMeta && (
          <>
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Datos de la legalización — {activeStaff.full_name || "(sin nombre)"}
                </h3>
                <button
                  type="button"
                  onClick={() => copyLegalizarLink(activeStaff.id)}
                  className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {copiedId === activeStaff.id ? "¡Copiado!" : "Copiar link para que él/ella lo llene"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Responsable"
                  value={activeMeta.responsable}
                  onChange={(e) => patchMeta(activeStaff.id, { responsable: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="Actividad"
                  value={activeMeta.actividad}
                  onChange={(e) => patchMeta(activeStaff.id, { actividad: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="Ciudad de elaboración"
                  value={activeMeta.ciudad_elaboracion}
                  onChange={(e) => patchMeta(activeStaff.id, { ciudad_elaboracion: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={activeMeta.fecha_elaboracion}
                  onChange={(e) => patchMeta(activeStaff.id, { fecha_elaboracion: e.target.value })}
                  className={inputClass}
                />
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-neutral-900">Anticipo girado</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Se toma automáticamente del cuadro de Anticipos / valores girados en Viáticos.
              </p>
              {activeAnticipos.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-400">
                  Todavía no hay anticipos registrados para {activeStaff.full_name || "esta persona"}{" "}
                  en Viáticos.
                </p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-400">
                      <th className="py-1">Fecha</th>
                      <th className="py-1 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAnticipos.map((a) => (
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
                <span>{formatCOP(totalAnticipoPorPersona[activeStaff.id] ?? 0)}</span>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Soportes (gastos reales)</h3>
                <button
                  type="button"
                  onClick={() => addGasto(activeStaff.id)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  + Agregar gasto
                </button>
              </div>
              {activeGastos.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Todavía no hay soportes para {activeStaff.full_name || "esta persona"}.
                </p>
              ) : (
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
                    {activeGastos.map((g) => (
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
              )}
              <datalist id="rubros-list">
                {RUBROS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-900">
                <span>Total soportes</span>
                <span>{formatCOP(totalSoportesPorPersona[activeStaff.id] ?? 0)}</span>
              </div>
            </section>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-neutral-900">
                  Diferencia — {activeStaff.full_name || "(sin nombre)"}
                </span>
                <span
                  className={`font-semibold ${
                    activeDiferencia >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {formatCOP(activeDiferencia)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-400">
                {activeDiferencia >= 0
                  ? "Sobrante a favor de la empresa (debe devolverse o descontarse)."
                  : "Faltante — se le debe reembolsar."}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="col-span-1">
        <div className="sticky top-6 space-y-2 rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Resumen general del evento</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Total anticipos</span>
            <span className="font-medium text-neutral-800">{formatCOP(totalAnticipo)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Total soportes</span>
            <span className="font-medium text-neutral-800">{formatCOP(totalSoportes)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-sm">
            <span className="font-semibold text-neutral-900">Diferencia</span>
            <span className={`font-semibold ${diferencia >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatCOP(diferencia)}
            </span>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="mt-2 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
          <SaveStatus dirty={dirty} isPending={isPending} message={message} className="text-center" />
        </div>
      </div>
    </div>
  );
}
