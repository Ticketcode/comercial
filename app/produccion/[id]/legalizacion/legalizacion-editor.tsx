"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { EventStaff, LegalizacionGasto, LegalizacionMeta, ViaticoAnticipo } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { saveLegalizacion, type SaveGastoRow, type SaveMetaRow } from "./actions";

interface Props {
  proposalId: string;
  eventName: string;
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

export function LegalizacionEditor({
  proposalId,
  eventName,
  initialMetas,
  initialGastos,
  anticipos,
  staff,
}: Props) {
  const [activeStaffId, setActiveStaffId] = useState<string | null>(staff[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  function copyLegalizarLink(staffId: string) {
    const url = `${window.location.origin}/legalizar/${staffId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(staffId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }
  const [metaByStaff, setMetaByStaff] = useState<Record<string, MetaFields>>(() =>
    Object.fromEntries(
      staff.map((s) => {
        const m = initialMetas.find((m) => m.staff_id === s.id);
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
    )
  );
  const [gastos, setGastos] = useState<LegalizacionGasto[]>(initialGastos);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

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

  function removeGasto(id: string) {
    setGastos((prev) => prev.filter((g) => g.id !== id));
    if (!isTemp(id)) setDeletedIds((prev) => [...prev, id]);
  }

  function handleSave() {
    setMessage(null);
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
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
      if (!result.error) setDeletedIds([]);
    });
  }

  async function downloadPdf() {
    if (!printAreaRef.current) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pageEls = printAreaRef.current.querySelectorAll<HTMLElement>("[data-pdf-page]");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const marginMm = 8;
      const usableWidthMm = 210 - marginMm * 2;

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], { scale: 2, useCORS: true, windowWidth: 700 });
        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const imgHeightMm = (canvas.height * usableWidthMm) / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", marginMm, marginMm, usableWidthMm, imgHeightMm);
      }

      pdf.save(`Legalizacion-${proposalId}.pdf`);
    } finally {
      setIsDownloading(false);
    }
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
            onClick={downloadPdf}
            disabled={isDownloading}
            className="mt-2 w-full rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {isDownloading ? "Generando PDF..." : "Descargar PDF de legalización"}
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

      {/* Área imprimible oculta — una hoja de legalización por persona, con
          sus datos, anticipo girado, soportes y espacio de firma. */}
      <div className="fixed left-[-9999px] top-0 -z-10">
        <div ref={printAreaRef} className="w-[700px] bg-white text-black">
          {staff.map((s) => {
            const meta = metaByStaff[s.id];
            const misAnticipos = anticiposByStaff[s.id] ?? [];
            const misGastos = gastosByStaff[s.id] ?? [];
            const totalAnt = totalAnticipoPorPersona[s.id] ?? 0;
            const totalSop = totalSoportesPorPersona[s.id] ?? 0;
            const dif = totalAnt - totalSop;
            return (
              <div key={s.id} data-pdf-page className="mb-4 border border-neutral-800 p-6">
                <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-3">
                  <span className="text-base font-extrabold tracking-tight text-emerald-700">
                    ticketcode
                  </span>
                  <span className="text-sm font-bold uppercase">Legalización de viáticos</span>
                </div>

                <table className="mt-3 w-full border border-neutral-800 text-xs">
                  <tbody>
                    <tr className="border-b border-neutral-800 bg-neutral-100">
                      <th className="w-1/2 border-r border-neutral-800 py-1.5 font-semibold">
                        Responsable
                      </th>
                      <th className="w-1/2 py-1.5 font-semibold">Actividad</th>
                    </tr>
                    <tr className="border-b border-neutral-800 text-center">
                      <td className="border-r border-neutral-800 py-1.5">{meta?.responsable || "—"}</td>
                      <td className="py-1.5">{meta?.actividad || "—"}</td>
                    </tr>
                    <tr className="border-b border-neutral-800 bg-neutral-100">
                      <th className="border-r border-neutral-800 py-1.5 font-semibold">Evento</th>
                      <th className="border-r border-neutral-800 py-1.5 font-semibold">
                        Ciudad de elaboración
                      </th>
                      <th className="py-1.5 font-semibold">Fecha de elaboración</th>
                    </tr>
                    <tr className="text-center">
                      <td className="border-r border-neutral-800 py-1.5">{eventName || "—"}</td>
                      <td className="border-r border-neutral-800 py-1.5">
                        {meta?.ciudad_elaboracion || "—"}
                      </td>
                      <td className="py-1.5">
                        {meta?.fecha_elaboracion ? formatFechaCorta(meta.fecha_elaboracion) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4">
                  <h2 className="border-b-2 border-neutral-800 pb-1 text-xs font-bold uppercase">
                    Anticipo girado
                  </h2>
                  {misAnticipos.length === 0 ? (
                    <p className="mt-1 text-xs text-neutral-500">Sin anticipos registrados.</p>
                  ) : (
                    <table className="mt-1 w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-300 text-left">
                          <th className="py-1">Fecha</th>
                          <th className="py-1 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misAnticipos.map((a) => (
                          <tr key={a.id} className="border-b border-neutral-100">
                            <td className="py-1">{a.fecha ? formatFechaCorta(a.fecha) : "—"}</td>
                            <td className="py-1 text-right">{formatCOP(a.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="mt-1 flex justify-end text-xs font-semibold">
                    <span className="mr-2">Total anticipo:</span>
                    <span>{formatCOP(totalAnt)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="border-b-2 border-neutral-800 pb-1 text-xs font-bold uppercase">
                    Soportes (gastos reales)
                  </h2>
                  {misGastos.length === 0 ? (
                    <p className="mt-1 text-xs text-neutral-500">Sin soportes registrados.</p>
                  ) : (
                    <table className="mt-1 w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-300 text-left">
                          <th className="py-1">Fecha</th>
                          <th className="py-1">N° Recibo</th>
                          <th className="py-1">Tercero</th>
                          <th className="py-1">Rubro</th>
                          <th className="py-1">Concepto</th>
                          <th className="py-1 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misGastos.map((g) => (
                          <tr key={g.id} className="border-b border-neutral-100">
                            <td className="py-1">{g.fecha ? formatFechaCorta(g.fecha) : "—"}</td>
                            <td className="py-1">{g.numero_recibo || "—"}</td>
                            <td className="py-1">{g.tercero || "—"}</td>
                            <td className="py-1">{g.rubro || "—"}</td>
                            <td className="py-1">{g.concepto || "—"}</td>
                            <td className="py-1 text-right">{formatCOP(g.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="mt-1 flex justify-end text-xs font-semibold">
                    <span className="mr-2">Total soportes:</span>
                    <span>{formatCOP(totalSop)}</span>
                  </div>
                </div>

                <table className="mt-3 w-full border border-neutral-800 text-xs">
                  <tbody>
                    <tr className={dif >= 0 ? "bg-emerald-100" : "bg-red-100"}>
                      <th className="border-r border-neutral-800 py-1.5 text-left">
                        Diferencia ({dif >= 0 ? "a favor de la empresa" : "a reembolsar"})
                      </th>
                      <td className="py-1.5 pr-2 text-right font-bold">{formatCOP(dif)}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="mt-4 w-full border border-neutral-800 text-xs">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border-r border-b border-neutral-800 py-1.5"></th>
                      <th className="border-r border-b border-neutral-800 py-1.5 font-semibold">Firma</th>
                      <th className="border-b border-neutral-800 py-1.5 font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-800">
                      <th className="border-r border-neutral-800 py-6 text-left font-semibold">
                        Trabajador
                      </th>
                      <td className="border-r border-neutral-800"></td>
                      <td></td>
                    </tr>
                    <tr>
                      <th className="border-r border-neutral-800 py-6 text-left font-semibold">
                        Autorizado por
                      </th>
                      <td className="border-r border-neutral-800"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
