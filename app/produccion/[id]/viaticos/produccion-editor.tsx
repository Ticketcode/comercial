"use client";

import { useMemo, useState, useTransition } from "react";
import type { EventStaff, ViaticoGiro, ViaticoEstado } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { saveProduccion, type SaveStaffRow, type SaveGiroRow } from "./actions";

interface TarifasReferencia {
  alimentacion: Record<string, number>;
  transporte: Record<string, number>;
}

interface Props {
  proposalId: string;
  initialStaff: EventStaff[];
  initialGiros: ViaticoGiro[];
  tarifasReferencia: TarifasReferencia;
}

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

let tempCounter = 0;
function tempId(prefix: string) {
  tempCounter += 1;
  return `temp-${prefix}-${tempCounter}`;
}

function isTemp(id: string) {
  return id.startsWith("temp-");
}

const RUBROS_LIBRES = ["Honorarios", "Varios", "Otro"];

export function ProduccionEditor({ proposalId, initialStaff, initialGiros, tarifasReferencia }: Props) {
  const [staff, setStaff] = useState<EventStaff[]>(initialStaff);
  const [deletedStaffIds, setDeletedStaffIds] = useState<string[]>([]);
  const [giros, setGiros] = useState<ViaticoGiro[]>(initialGiros);
  const [deletedGiroIds, setDeletedGiroIds] = useState<string[]>([]);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(initialStaff[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function addStaff() {
    const newStaff = {
      id: tempId("staff"),
      proposal_id: proposalId,
      full_name: "",
      cargo: "",
      cedula: "",
      telefono: "",
      banco: "",
      tipo_cuenta: "",
      numero_cuenta: "",
      sort_order: staff.length,
      created_at: new Date().toISOString(),
    };
    setStaff((prev) => [...prev, newStaff]);
    setActiveStaffId(newStaff.id);
  }

  function patchStaff(id: string, patch: Partial<EventStaff>) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeStaff(id: string) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    if (!isTemp(id)) setDeletedStaffIds((prev) => [...prev, id]);
    const orphaned = giros.filter((g) => g.staff_id === id);
    setGiros((prev) => prev.filter((g) => g.staff_id !== id));
    setDeletedGiroIds((prev) => [...prev, ...orphaned.filter((g) => !isTemp(g.id)).map((g) => g.id)]);
    if (activeStaffId === id) {
      const remaining = staff.filter((s) => s.id !== id);
      setActiveStaffId(remaining[0]?.id ?? null);
    }
  }

  function addGiro(staffId: string) {
    setGiros((prev) => [
      ...prev,
      {
        id: tempId("giro"),
        proposal_id: proposalId,
        staff_id: staffId,
        rubro: "Honorarios",
        concepto: "",
        cantidad: 1,
        valor_unitario: 0,
        monto: 0,
        estado: "pendiente",
        fecha_giro: null,
        notas: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function patchGiro(id: string, patch: Partial<ViaticoGiro>) {
    setGiros((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g, ...patch };
        if (patch.cantidad !== undefined || patch.valor_unitario !== undefined) {
          next.monto = Math.round(next.cantidad * next.valor_unitario);
        }
        return next;
      })
    );
  }

  function selectRubroTarifa(id: string, label: string, valorUnitario: number | null) {
    patchGiro(id, {
      rubro: label,
      concepto: label,
      valor_unitario: valorUnitario ?? 0,
    });
  }

  function removeGiro(id: string) {
    setGiros((prev) => prev.filter((g) => g.id !== id));
    if (!isTemp(id)) setDeletedGiroIds((prev) => [...prev, id]);
  }

  const girosByStaff = useMemo(() => {
    const map: Record<string, ViaticoGiro[]> = {};
    for (const g of giros) {
      (map[g.staff_id] ??= []).push(g);
    }
    return map;
  }, [giros]);

  const totalPorPersona = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of staff) {
      map[s.id] = (girosByStaff[s.id] ?? []).reduce((sum, g) => sum + g.monto, 0);
    }
    return map;
  }, [staff, girosByStaff]);

  const totalGeneral = giros.reduce((s, g) => s + g.monto, 0);
  const totalGirado = giros.filter((g) => g.estado === "girado").reduce((s, g) => s + g.monto, 0);
  const totalPendiente = totalGeneral - totalGirado;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const toStaffRow = (s: EventStaff): SaveStaffRow => ({
        id: s.id,
        full_name: s.full_name,
        cargo: s.cargo,
        cedula: s.cedula,
        telefono: s.telefono,
        banco: s.banco,
        tipo_cuenta: s.tipo_cuenta,
        numero_cuenta: s.numero_cuenta,
        sort_order: s.sort_order,
      });
      const toGiroRow = (g: ViaticoGiro): SaveGiroRow => ({
        id: g.id,
        staff_id: g.staff_id,
        rubro: g.rubro,
        concepto: g.concepto,
        cantidad: g.cantidad,
        valor_unitario: g.valor_unitario,
        monto: g.monto,
        estado: g.estado,
        fecha_giro: g.fecha_giro,
        notas: g.notas,
        sort_order: g.sort_order,
      });

      const result = await saveProduccion({
        proposalId,
        staff: {
          existing: staff.filter((s) => !isTemp(s.id)).map(toStaffRow),
          new: staff.filter((s) => isTemp(s.id)).map(toStaffRow),
          deletedIds: deletedStaffIds,
        },
        giros: {
          existing: giros.filter((g) => !isTemp(g.id)).map(toGiroRow),
          new: giros.filter((g) => isTemp(g.id)).map(toGiroRow),
          deletedIds: deletedGiroIds,
        },
      });
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
      if (!result.error) {
        setDeletedStaffIds([]);
        setDeletedGiroIds([]);
      }
    });
  }

  function exportCSV() {
    const header = ["Persona", "Cargo", "Cédula", "Banco", "Tipo de cuenta", "Número de cuenta", "Rubro", "Concepto", "Cantidad", "Valor unitario", "Monto", "Estado", "Fecha giro"];
    const rows = giros.map((g) => {
      const s = staff.find((s) => s.id === g.staff_id);
      return [
        s?.full_name ?? "",
        s?.cargo ?? "",
        s?.cedula ?? "",
        s?.banco ?? "",
        s?.tipo_cuenta ?? "",
        s?.numero_cuenta ?? "",
        g.rubro ?? "",
        g.concepto ?? "",
        g.cantidad,
        g.valor_unitario,
        g.monto,
        g.estado,
        g.fecha_giro ?? "",
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viaticos-${proposalId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeStaff = staff.find((s) => s.id === activeStaffId) ?? null;
  const activeGiros = activeStaff ? girosByStaff[activeStaff.id] ?? [] : [];

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Personal asignado al evento</h3>
            <button
              type="button"
              onClick={addStaff}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              + Agregar persona
            </button>
          </div>
          <div className="space-y-3">
            {staff.length === 0 && (
              <p className="text-sm text-neutral-400">Todavía no hay personal asignado.</p>
            )}
            {staff.map((s) => (
              <div key={s.id} className="grid grid-cols-7 gap-2 rounded-md border border-neutral-100 p-3">
                <input
                  placeholder="Nombre completo"
                  value={s.full_name}
                  onChange={(e) => patchStaff(s.id, { full_name: e.target.value })}
                  className={`${inputClass} col-span-2`}
                />
                <input
                  placeholder="Cargo (ej. Productor)"
                  value={s.cargo ?? ""}
                  onChange={(e) => patchStaff(s.id, { cargo: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="Cédula"
                  value={s.cedula ?? ""}
                  onChange={(e) => patchStaff(s.id, { cedula: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="Banco"
                  value={s.banco ?? ""}
                  onChange={(e) => patchStaff(s.id, { banco: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="Tipo cuenta"
                  value={s.tipo_cuenta ?? ""}
                  onChange={(e) => patchStaff(s.id, { tipo_cuenta: e.target.value })}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <input
                    placeholder="N° cuenta"
                    value={s.numero_cuenta ?? ""}
                    onChange={(e) => patchStaff(s.id, { numero_cuenta: e.target.value })}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeStaff(s.id)}
                    className="shrink-0 text-neutral-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Tarifas fijas de referencia</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Valores fijos de la empresa — se seleccionan solos al elegir un rubro de Alimentación o
            Transporte en el cuadro de cada persona.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {Object.entries(tarifasReferencia.alimentacion).map(([label, valor]) => (
              <div key={label} className="flex items-center justify-between text-neutral-600">
                <span>{label}</span>
                <span className="font-medium">{formatCOP(valor)}</span>
              </div>
            ))}
            {Object.entries(tarifasReferencia.transporte).map(([label, valor]) => (
              <div key={label} className="flex items-center justify-between text-neutral-600">
                <span>{label}</span>
                <span className="font-medium">{formatCOP(valor)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">
            Viáticos por persona (uno por cada integrante del equipo)
          </h3>
          {staff.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Agrega personal arriba para poder armar su cuadro de viáticos.
            </p>
          ) : (
            <>
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
                    {s.full_name || "(sin nombre)"} {s.cargo ? `— ${s.cargo}` : ""}
                    {totalPorPersona[s.id] > 0 && (
                      <span className="ml-1 opacity-70">({formatCOP(totalPorPersona[s.id])})</span>
                    )}
                  </button>
                ))}
              </div>

              {activeStaff && (
                <div className="pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-800">
                      {activeStaff.full_name || "(sin nombre)"}
                    </p>
                    <button
                      type="button"
                      onClick={() => addGiro(activeStaff.id)}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      + Agregar rubro
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-400">
                        <th className="w-40 py-2">Rubro</th>
                        <th className="py-2">Concepto</th>
                        <th className="w-16 py-2">Cant.</th>
                        <th className="w-28 py-2">Vlr. unitario</th>
                        <th className="w-28 py-2">Monto</th>
                        <th className="w-28 py-2">Estado</th>
                        <th className="w-32 py-2">Fecha</th>
                        <th className="w-8 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGiros.map((g) => (
                        <tr key={g.id} className="border-t border-neutral-100">
                          <td className="py-1.5 pr-2">
                            <select
                              value={g.rubro ?? "Otro"}
                              onChange={(e) => {
                                const label = e.target.value;
                                const tarifa =
                                  tarifasReferencia.alimentacion[label] ??
                                  tarifasReferencia.transporte[label] ??
                                  null;
                                if (tarifa !== null) {
                                  selectRubroTarifa(g.id, label, tarifa);
                                } else {
                                  patchGiro(g.id, { rubro: label });
                                }
                              }}
                              className={inputClass}
                            >
                              <optgroup label="Alimentación (tarifa fija)">
                                {Object.keys(tarifasReferencia.alimentacion).map((label) => (
                                  <option key={label} value={label}>
                                    {label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Transporte (tarifa fija)">
                                {Object.keys(tarifasReferencia.transporte).map((label) => (
                                  <option key={label} value={label}>
                                    {label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Manual">
                                {RUBROS_LIBRES.map((label) => (
                                  <option key={label} value={label}>
                                    {label}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              value={g.concepto ?? ""}
                              onChange={(e) => patchGiro(g.id, { concepto: e.target.value })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              min={0}
                              value={g.cantidad}
                              onChange={(e) => patchGiro(g.id, { cantidad: Number(e.target.value) || 0 })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              min={0}
                              value={g.valor_unitario}
                              onChange={(e) =>
                                patchGiro(g.id, { valor_unitario: Number(e.target.value) || 0 })
                              }
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2 text-right font-medium text-neutral-700">
                            {formatCOP(g.monto)}
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={g.estado}
                              onChange={(e) =>
                                patchGiro(g.id, {
                                  estado: e.target.value as ViaticoEstado,
                                  fecha_giro:
                                    e.target.value === "girado"
                                      ? g.fecha_giro ?? new Date().toISOString().slice(0, 10)
                                      : null,
                                })
                              }
                              className={`${inputClass} ${
                                g.estado === "girado" ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="girado">Girado</option>
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="date"
                              value={g.fecha_giro ?? ""}
                              onChange={(e) => patchGiro(g.id, { fecha_giro: e.target.value || null })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5">
                            <button
                              type="button"
                              onClick={() => removeGiro(g.id)}
                              className="text-neutral-400 hover:text-red-600"
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {activeGiros.length === 0 && (
                    <p className="py-3 text-sm text-neutral-400">
                      Todavía no hay rubros para {activeStaff.full_name || "esta persona"}.
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
                    <span className="text-sm font-semibold text-neutral-900">Total {activeStaff.full_name}</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {formatCOP(totalPorPersona[activeStaff.id] ?? 0)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="col-span-1">
        <div className="sticky top-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Resumen para contabilidad</h3>
            {staff.map((s) =>
              (totalPorPersona[s.id] ?? 0) > 0 ? (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">{s.full_name || "(sin nombre)"}</span>
                  <span className="font-medium text-neutral-800">{formatCOP(totalPorPersona[s.id])}</span>
                </div>
              ) : null
            )}
            <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-1 text-sm">
              <span className="text-neutral-500">Total general</span>
              <span className="font-semibold text-neutral-900">{formatCOP(totalGeneral)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Ya girado</span>
              <span className="font-medium text-emerald-700">{formatCOP(totalGirado)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Pendiente por girar</span>
              <span className="font-medium text-amber-700">{formatCOP(totalPendiente)}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={exportCSV}
              className="w-full rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Exportar CSV para contabilidad
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
            {message && <p className="text-center text-xs text-neutral-500">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
