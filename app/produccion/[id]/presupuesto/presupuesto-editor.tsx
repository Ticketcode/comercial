"use client";

import { useMemo, useState, useTransition } from "react";
import type { PresupuestoItem, Proposal } from "@/lib/types";
import { PRESUPUESTO_CATEGORIAS } from "@/lib/data/presupuesto-template";
import { formatCOP } from "@/lib/pricing/summary";
import { savePresupuesto, type SavePresupuestoItemRow } from "./actions";

interface Props {
  proposalId: string;
  proposal: Pick<Proposal, "id" | "event_name" | "city" | "aforo" | "aforo_real" | "event_start_date" | "event_end_date">;
  initialItems: PresupuestoItem[];
}

const cellInput =
  "h-8 w-full rounded border border-neutral-300 px-1.5 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

let tempCounter = 0;
function tempId() {
  tempCounter += 1;
  return `temp-item-${tempCounter}`;
}
function isTemp(id: string) {
  return id.startsWith("temp-");
}

function num(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function PresupuestoEditor({ proposalId, proposal, initialItems }: Props) {
  const [aforoReal, setAforoReal] = useState<number | null>(proposal.aforo_real ?? null);
  const [items, setItems] = useState<PresupuestoItem[]>(initialItems);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const itemsByCategoria = useMemo(() => {
    const map: Record<string, PresupuestoItem[]> = {};
    for (const item of items) {
      (map[item.categoria] ??= []).push(item);
    }
    return map;
  }, [items]);

  const allCategorias = useMemo(() => {
    const extra = Object.keys(itemsByCategoria).filter((c) => !PRESUPUESTO_CATEGORIAS.includes(c as never));
    return [...PRESUPUESTO_CATEGORIAS, ...extra];
  }, [itemsByCategoria]);

  const totalProyectado = items.reduce((s, i) => s + (i.total_ajustado || 0), 0);
  const totalEjecucion = items.reduce((s, i) => s + (i.ejecucion_valor || 0), 0);

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function patchItem(id: string, patch: Partial<PresupuestoItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function addItem(categoria: string) {
    setItems((prev) => [
      ...prev,
      {
        id: tempId(),
        proposal_id: proposalId,
        categoria,
        nombre: "",
        dias_proyectado: null,
        cantidad_proyectado: null,
        valor_unitario_proyectado: null,
        iva_proyectado: null,
        total_proyectado: 0,
        dias_ajustado: null,
        cantidad_ajustado: null,
        valor_unitario_ajustado: null,
        iva_ajustado: null,
        total_ajustado: 0,
        transferido_fecha: null,
        transferido_a: null,
        ejecucion_valor: 0,
        comentario: null,
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!isTemp(id)) setDeletedIds((prev) => [...prev, id]);
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const toRow = (i: PresupuestoItem): SavePresupuestoItemRow => ({
        id: i.id,
        categoria: i.categoria,
        nombre: i.nombre,
        dias_proyectado: i.dias_proyectado,
        cantidad_proyectado: i.cantidad_proyectado,
        valor_unitario_proyectado: i.valor_unitario_proyectado,
        iva_proyectado: i.iva_proyectado,
        total_proyectado: i.total_proyectado,
        dias_ajustado: i.dias_ajustado,
        cantidad_ajustado: i.cantidad_ajustado,
        valor_unitario_ajustado: i.valor_unitario_ajustado,
        iva_ajustado: i.iva_ajustado,
        total_ajustado: i.total_ajustado,
        transferido_fecha: i.transferido_fecha,
        transferido_a: i.transferido_a,
        ejecucion_valor: i.ejecucion_valor,
        comentario: i.comentario,
        sort_order: i.sort_order,
      });
      const result = await savePresupuesto({
        proposalId,
        aforoReal,
        items: {
          existing: items.filter((i) => !isTemp(i.id)).map(toRow),
          new: items.filter((i) => isTemp(i.id)).map(toRow),
          deletedIds,
        },
      });
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
      if (!result.error) setDeletedIds([]);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-400">Ciudad</p>
            <p className="font-medium text-neutral-800">{proposal.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Fechas del evento</p>
            <p className="font-medium text-neutral-800">
              {proposal.event_start_date ?? "—"} — {proposal.event_end_date ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Aforo estimado</p>
            <p className="font-medium text-neutral-800">{proposal.aforo ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Aforo real</p>
            <input
              type="number"
              value={aforoReal ?? ""}
              onChange={(e) => setAforoReal(e.target.value === "" ? null : Number(e.target.value))}
              className={`${cellInput} h-9`}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-6 border-t border-neutral-100 pt-4">
          <div>
            <p className="text-xs text-neutral-400">Subtotal proyectado a la fecha</p>
            <p className="text-lg font-semibold text-neutral-900">{formatCOP(totalProyectado)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Subtotal real a la fecha</p>
            <p className="text-lg font-semibold text-neutral-900">{formatCOP(totalEjecucion)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Diferencia</p>
            <p
              className={`text-lg font-semibold ${
                totalProyectado - totalEjecucion >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {formatCOP(totalProyectado - totalEjecucion)}
            </p>
          </div>
        </div>
      </section>

      {allCategorias.map((cat) => {
        const catItems = itemsByCategoria[cat] ?? [];
        const catProyectado = catItems.reduce((s, i) => s + (i.total_ajustado || 0), 0);
        const catEjecucion = catItems.reduce((s, i) => s + (i.ejecucion_valor || 0), 0);
        const open = !!openCategories[cat];
        return (
          <section key={cat} className="rounded-xl border border-neutral-200 bg-white">
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              className="flex w-full items-center gap-3 p-4"
            >
              <span className="text-xs text-neutral-400">{open ? "▼" : "▶"}</span>
              <span className="text-sm font-semibold text-neutral-900">{cat}</span>
              <span className="text-xs text-neutral-400">
                Proyectado {formatCOP(catProyectado)} · Ejecutado {formatCOP(catEjecucion)}
              </span>
            </button>
            {open && (
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full min-w-[1400px] text-xs">
                  <thead>
                    <tr className="text-left text-neutral-400">
                      <th className="w-56 py-1">Ítem</th>
                      <th colSpan={5} className="border-l border-neutral-100 py-1 pl-2 text-center">
                        Proyectado inicial
                      </th>
                      <th colSpan={5} className="border-l border-neutral-100 py-1 pl-2 text-center">
                        Presupuesto ajustado
                      </th>
                      <th colSpan={2} className="border-l border-neutral-100 py-1 pl-2 text-center">
                        Transferido
                      </th>
                      <th colSpan={2} className="border-l border-neutral-100 py-1 pl-2 text-center">
                        Ejecución
                      </th>
                      <th className="border-l border-neutral-100 py-1 pl-2">Comentarios</th>
                      <th className="w-6"></th>
                    </tr>
                    <tr className="text-left text-neutral-400">
                      <th></th>
                      <th className="border-l border-neutral-100 pl-2">Días</th>
                      <th>Cant.</th>
                      <th>Vlr Unit.</th>
                      <th>IVA</th>
                      <th>Total</th>
                      <th className="border-l border-neutral-100 pl-2">Días</th>
                      <th>Cant.</th>
                      <th>Vlr Unit.</th>
                      <th>IVA</th>
                      <th>Total</th>
                      <th className="border-l border-neutral-100 pl-2">Fecha</th>
                      <th>A</th>
                      <th className="border-l border-neutral-100 pl-2">Valor</th>
                      <th>Diferencia</th>
                      <th className="border-l border-neutral-100 pl-2"></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((item) => {
                      const diferencia = (item.total_ajustado || 0) - (item.ejecucion_valor || 0);
                      return (
                        <tr key={item.id} className="border-t border-neutral-100">
                          <td className="py-1 pr-1">
                            <input
                              value={item.nombre}
                              onChange={(e) => patchItem(item.id, { nombre: e.target.value })}
                              className={cellInput}
                            />
                          </td>
                          <td className="border-l border-neutral-100 py-1 pl-2 pr-1">
                            <input
                              type="number"
                              value={item.dias_proyectado ?? ""}
                              onChange={(e) => patchItem(item.id, { dias_proyectado: num(e.target.value) })}
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.cantidad_proyectado ?? ""}
                              onChange={(e) =>
                                patchItem(item.id, { cantidad_proyectado: num(e.target.value) })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.valor_unitario_proyectado ?? ""}
                              onChange={(e) =>
                                patchItem(item.id, { valor_unitario_proyectado: num(e.target.value) })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.iva_proyectado ?? ""}
                              onChange={(e) => patchItem(item.id, { iva_proyectado: num(e.target.value) })}
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.total_proyectado ?? 0}
                              onChange={(e) =>
                                patchItem(item.id, { total_proyectado: Number(e.target.value) || 0 })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="border-l border-neutral-100 py-1 pl-2 pr-1">
                            <input
                              type="number"
                              value={item.dias_ajustado ?? ""}
                              onChange={(e) => patchItem(item.id, { dias_ajustado: num(e.target.value) })}
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.cantidad_ajustado ?? ""}
                              onChange={(e) =>
                                patchItem(item.id, { cantidad_ajustado: num(e.target.value) })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.valor_unitario_ajustado ?? ""}
                              onChange={(e) =>
                                patchItem(item.id, { valor_unitario_ajustado: num(e.target.value) })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.iva_ajustado ?? ""}
                              onChange={(e) => patchItem(item.id, { iva_ajustado: num(e.target.value) })}
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              value={item.total_ajustado ?? 0}
                              onChange={(e) =>
                                patchItem(item.id, { total_ajustado: Number(e.target.value) || 0 })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="border-l border-neutral-100 py-1 pl-2 pr-1">
                            <input
                              type="date"
                              value={item.transferido_fecha ?? ""}
                              onChange={(e) =>
                                patchItem(item.id, { transferido_fecha: e.target.value || null })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              value={item.transferido_a ?? ""}
                              onChange={(e) => patchItem(item.id, { transferido_a: e.target.value })}
                              className={`${cellInput} w-16`}
                            />
                          </td>
                          <td className="border-l border-neutral-100 py-1 pl-2 pr-1">
                            <input
                              type="number"
                              value={item.ejecucion_valor ?? 0}
                              onChange={(e) =>
                                patchItem(item.id, { ejecucion_valor: Number(e.target.value) || 0 })
                              }
                              className={cellInput}
                            />
                          </td>
                          <td
                            className={`py-1 pr-1 text-right font-medium ${
                              diferencia >= 0 ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {formatCOP(diferencia)}
                          </td>
                          <td className="border-l border-neutral-100 py-1 pl-2 pr-1">
                            <input
                              value={item.comentario ?? ""}
                              onChange={(e) => patchItem(item.id, { comentario: e.target.value })}
                              className={`${cellInput} w-40`}
                            />
                          </td>
                          <td className="py-1">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-neutral-400 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() => addItem(cat)}
                  className="mt-2 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  + Agregar línea
                </button>
              </div>
            )}
          </section>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        {message && <p className="text-xs text-neutral-500">{message}</p>}
      </div>
    </div>
  );
}
