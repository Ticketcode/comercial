"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PresupuestoItem, Proposal } from "@/lib/types";
import { PRESUPUESTO_CATEGORIAS } from "@/lib/data/presupuesto-template";
import { formatCOP } from "@/lib/pricing/summary";
import { SaveStatus, useConfirm, useUnsavedChanges } from "@/app/components/ui-guard";
import { callSafe, problemsMessage, saveErrorMessage } from "@/lib/errors";
import { savePresupuesto, pullValoresTarifario, type SavePresupuestoItemRow } from "./actions";

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

const IVA_RATE = 0.19;

/** Total = días × cantidad × valor unitario, + 19% de IVA si el ítem lo
 * marca. Ya no se digita a mano — se recalcula siempre de estos 4 campos. */
function calcIvaYTotal(
  dias: number | null,
  cantidad: number | null,
  valorUnitario: number | null,
  ivaAplica: boolean
) {
  const base = (dias ?? 0) * (cantidad ?? 0) * (valorUnitario ?? 0);
  const iva = ivaAplica ? base * IVA_RATE : 0;
  return { iva, total: base + iva };
}

export function PresupuestoEditor({ proposalId, proposal, initialItems }: Props) {
  const [aforoReal, setAforoReal] = useState<number | null>(proposal.aforo_real ?? null);
  const [items, setItems] = useState<PresupuestoItem[]>(initialItems);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [isPulling, setIsPulling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirm();
  const { dirty, markSaved, resetTo } = useUnsavedChanges({ aforoReal, items, deletedIds });
  // Tras guardar, las líneas nuevas dejan de ser temporales: se adopta lo guardado en la base
  // de datos para que un segundo guardado no las inserte otra vez.
  const awaitingSync = useRef(false);

  useEffect(() => {
    if (!awaitingSync.current) return;
    awaitingSync.current = false;
    setItems(initialItems);
    setDeletedIds([]);
    setAforoReal(proposal.aforo_real ?? null);
    resetTo({ aforoReal: proposal.aforo_real ?? null, items: initialItems, deletedIds: [] });
  }, [initialItems, proposal.aforo_real, resetTo]);

  async function handlePullTarifario() {
    const ok = await confirm({
      title: "¿Traer los valores del Tarifario?",
      message:
        "Se reemplazan los valores de \"Proyectado inicial\" de los ítems que coinciden con el Tarifario (Honorarios, Alimentación, Transporte y Equipos). Si algún ítem no tiene ajustes, también se actualiza su \"Presupuesto ajustado\"." +
        (dirty ? "\n\nTienes cambios sin guardar en esta pantalla y se perderán." : ""),
      confirmLabel: "Traer valores",
      danger: dirty,
    });
    if (!ok) return;
    setIsPulling(true);
    setMessage(null);
    const result = await callSafe(() => pullValoresTarifario(proposalId));
    if (result.error) {
      setIsPulling(false);
      setMessage(saveErrorMessage(result.error));
    } else {
      // El estado del formulario vive en useState desde initialItems — un
      // router.refresh() no lo vuelve a sincronizar porque el componente ya
      // está montado, así que se recarga la página entera.
      markSaved(); // el usuario ya aceptó perder los cambios: evita el aviso del navegador
      window.location.reload();
    }
  }

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
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        if (
          patch.dias_proyectado !== undefined ||
          patch.cantidad_proyectado !== undefined ||
          patch.valor_unitario_proyectado !== undefined ||
          patch.iva_aplica !== undefined
        ) {
          const { iva, total } = calcIvaYTotal(
            next.dias_proyectado,
            next.cantidad_proyectado,
            next.valor_unitario_proyectado,
            next.iva_aplica
          );
          next.iva_proyectado = iva;
          next.total_proyectado = total;
        }
        if (
          patch.dias_ajustado !== undefined ||
          patch.cantidad_ajustado !== undefined ||
          patch.valor_unitario_ajustado !== undefined ||
          patch.iva_aplica !== undefined
        ) {
          const { iva, total } = calcIvaYTotal(
            next.dias_ajustado,
            next.cantidad_ajustado,
            next.valor_unitario_ajustado,
            next.iva_aplica
          );
          next.iva_ajustado = iva;
          next.total_ajustado = total;
        }
        return next;
      })
    );
  }

  function addItem(categoria: string) {
    setItems((prev) => [
      ...prev,
      {
        id: tempId(),
        proposal_id: proposalId,
        categoria,
        nombre: "",
        iva_aplica: false,
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

  async function removeItem(id: string) {
    if (!isTemp(id)) {
      const nombre = items.find((i) => i.id === id)?.nombre || "esta línea";
      const ok = await confirm({
        title: `¿Quitar "${nombre}"?`,
        message: "El cambio se aplica al pulsar Guardar.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!isTemp(id)) setDeletedIds((prev) => [...prev, id]);
  }

  function validar(): string[] {
    const problems: string[] = [];
    items.forEach((i) => {
      if (!i.nombre.trim()) problems.push(`Hay una línea sin nombre en "${i.categoria}"`);
    });
    return Array.from(new Set(problems));
  }

  function handleSave() {
    const problems = validar();
    if (problems.length > 0) {
      setMessage(problemsMessage(problems));
      return;
    }
    setMessage(null);
    awaitingSync.current = true;
    startTransition(async () => {
      const toRow = (i: PresupuestoItem): SavePresupuestoItemRow => ({
        id: i.id,
        categoria: i.categoria,
        nombre: i.nombre,
        iva_aplica: i.iva_aplica,
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
      const result = await callSafe(() => savePresupuesto({
        proposalId,
        aforoReal,
        items: {
          existing: items.filter((i) => !isTemp(i.id)).map(toRow),
          new: items.filter((i) => isTemp(i.id)).map(toRow),
          deletedIds,
        },
      }));
      if (result.error) awaitingSync.current = false;
      setMessage(result.error ? saveErrorMessage(result.error) : "Guardado.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Trae los valores de Honorarios, Alimentación, Transporte y Equipos que ya se calcularon
            en el Tarifario — el resto de los ítems se completan a mano. Todo queda editable.
          </p>
          <button
            type="button"
            onClick={handlePullTarifario}
            disabled={isPulling}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {isPulling ? "Trayendo..." : "Traer valores del Tarifario"}
          </button>
        </div>
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
                <table className="table-fixed border-collapse text-xs" style={{ width: 1426 }}>
                  <colgroup>
                    <col style={{ width: 200 }} />
                    <col style={{ width: 34 }} />
                    <col style={{ width: 46 }} />
                    <col style={{ width: 46 }} />
                    <col style={{ width: 84 }} />
                    <col style={{ width: 76 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 46 }} />
                    <col style={{ width: 46 }} />
                    <col style={{ width: 84 }} />
                    <col style={{ width: 76 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 108 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 84 }} />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 28 }} />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-neutral-400">
                      <th className="py-1">Ítem</th>
                      <th className="py-1 text-center">IVA</th>
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
                      <th></th>
                    </tr>
                    <tr className="text-left text-neutral-400">
                      <th></th>
                      <th className="text-center">19%</th>
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
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={item.iva_aplica}
                              onChange={(e) => patchItem(item.id, { iva_aplica: e.target.checked })}
                              title="Este rubro lleva IVA (19%)"
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
                          <td className="py-1 pr-1 text-right text-neutral-500">
                            {formatCOP(item.iva_proyectado ?? 0)}
                          </td>
                          <td className="py-1 pr-1 text-right font-medium text-neutral-700">
                            {formatCOP(item.total_proyectado ?? 0)}
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
                          <td className="py-1 pr-1 text-right text-neutral-500">
                            {formatCOP(item.iva_ajustado ?? 0)}
                          </td>
                          <td className="py-1 pr-1 text-right font-medium text-neutral-700">
                            {formatCOP(item.total_ajustado ?? 0)}
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
                              className={cellInput}
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
                              className={cellInput}
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
        <SaveStatus dirty={dirty} isPending={isPending} message={message} />
      </div>
    </div>
  );
}
