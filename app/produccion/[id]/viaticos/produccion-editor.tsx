"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { EventStaff, ViaticoAnticipo, ViaticoGiro } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { LabeledField } from "@/app/components/labeled-field";
import { MoneyInput } from "@/app/components/money-input";
import { MobileSaveBar, SaveStatus, useConfirm, useUnsavedChanges } from "@/app/components/ui-guard";
import { callSafe, problemsMessage, saveErrorMessage } from "@/lib/errors";
import { saveProduccion, type SaveStaffRow, type SaveGiroRow, type SaveAnticipoRow } from "./actions";

interface TarifasReferencia {
  alimentacion: Record<string, number>;
  alojamiento: Record<string, number>;
  transporte: Record<string, number>;
}

const CATEGORIAS = ["Transporte", "Alojamiento", "Honorarios", "Varios", "Alimentación"] as const;
type Categoria = (typeof CATEGORIAS)[number];

interface Props {
  proposalId: string;
  eventName: string;
  eventCity: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  initialStaff: EventStaff[];
  initialGiros: ViaticoGiro[];
  initialAnticipos: ViaticoAnticipo[];
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

export function ProduccionEditor({
  proposalId,
  eventName,
  eventCity,
  eventStartDate,
  eventEndDate,
  initialStaff,
  initialGiros,
  initialAnticipos,
  tarifasReferencia,
}: Props) {
  const [staff, setStaff] = useState<EventStaff[]>(initialStaff);
  const [deletedStaffIds, setDeletedStaffIds] = useState<string[]>([]);
  const [giros, setGiros] = useState<ViaticoGiro[]>(initialGiros);
  const [deletedGiroIds, setDeletedGiroIds] = useState<string[]>([]);
  const [anticipos, setAnticipos] = useState<ViaticoAnticipo[]>(initialAnticipos);
  const [deletedAnticipoIds, setDeletedAnticipoIds] = useState<string[]>([]);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(initialStaff[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const { dirty, resetTo } = useUnsavedChanges({
    staff,
    giros,
    anticipos,
    deletedStaffIds,
    deletedGiroIds,
    deletedAnticipoIds,
  });
  // Tras guardar, las filas nuevas dejan de ser temporales: se adopta lo que quedó en la
  // base de datos para que un segundo guardado no las inserte otra vez.
  const awaitingSync = useRef(false);
  const activeIndexAtSave = useRef(0);

  useEffect(() => {
    if (!awaitingSync.current) return;
    awaitingSync.current = false;
    setStaff(initialStaff);
    setGiros(initialGiros);
    setAnticipos(initialAnticipos);
    setDeletedStaffIds([]);
    setDeletedGiroIds([]);
    setDeletedAnticipoIds([]);
    setActiveStaffId((prev) =>
      prev && !isTemp(prev) && initialStaff.some((s) => s.id === prev)
        ? prev
        : initialStaff[activeIndexAtSave.current]?.id ?? initialStaff[0]?.id ?? null
    );
    resetTo({
      staff: initialStaff,
      giros: initialGiros,
      anticipos: initialAnticipos,
      deletedStaffIds: [],
      deletedGiroIds: [],
      deletedAnticipoIds: [],
    });
  }, [initialStaff, initialGiros, initialAnticipos, resetTo]);

  function categoriaDeRubro(rubro: string | null): Categoria {
    if (!rubro) return "Varios";
    if (rubro in tarifasReferencia.alojamiento) return "Alojamiento";
    if (rubro in tarifasReferencia.transporte) return "Transporte";
    if (rubro in tarifasReferencia.alimentacion) return "Alimentación";
    if (rubro === "Honorarios") return "Honorarios";
    return "Varios";
  }

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

  async function removeStaff(id: string) {
    const nGiros = giros.filter((g) => g.staff_id === id).length;
    const nAnticipos = anticipos.filter((a) => a.staff_id === id).length;
    const name = staff.find((s) => s.id === id)?.full_name || "esta persona";
    if (!isTemp(id) || nGiros > 0 || nAnticipos > 0) {
      const ok = await confirm({
        title: `¿Quitar a ${name}?`,
        message:
          nGiros + nAnticipos > 0
            ? `También se quitarán sus ${nGiros} rubro(s) y ${nAnticipos} anticipo(s). El cambio se aplica al pulsar Guardar.`
            : "El cambio se aplica al pulsar Guardar.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setStaff((prev) => prev.filter((s) => s.id !== id));
    if (!isTemp(id)) setDeletedStaffIds((prev) => [...prev, id]);
    const orphaned = giros.filter((g) => g.staff_id === id);
    setGiros((prev) => prev.filter((g) => g.staff_id !== id));
    setDeletedGiroIds((prev) => [...prev, ...orphaned.filter((g) => !isTemp(g.id)).map((g) => g.id)]);
    const orphanedAnticipos = anticipos.filter((a) => a.staff_id === id);
    setAnticipos((prev) => prev.filter((a) => a.staff_id !== id));
    setDeletedAnticipoIds((prev) => [
      ...prev,
      ...orphanedAnticipos.filter((a) => !isTemp(a.id)).map((a) => a.id),
    ]);
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

  async function removeGiro(id: string) {
    if (!isTemp(id)) {
      const ok = await confirm({
        title: "¿Quitar este rubro?",
        message: "El cambio se aplica al pulsar Guardar.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setGiros((prev) => prev.filter((g) => g.id !== id));
    if (!isTemp(id)) setDeletedGiroIds((prev) => [...prev, id]);
  }

  function addAnticipo(staffId: string) {
    setAnticipos((prev) => [
      ...prev,
      {
        id: tempId("anticipo"),
        proposal_id: proposalId,
        staff_id: staffId,
        fecha: new Date().toISOString().slice(0, 10),
        valor: 0,
        notas: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  function patchAnticipo(id: string, patch: Partial<ViaticoAnticipo>) {
    setAnticipos((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function removeAnticipo(id: string) {
    if (!isTemp(id)) {
      const ok = await confirm({
        title: "¿Quitar este anticipo?",
        message: "El cambio se aplica al pulsar Guardar.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setAnticipos((prev) => prev.filter((a) => a.id !== id));
    if (!isTemp(id)) setDeletedAnticipoIds((prev) => [...prev, id]);
  }

  const girosByStaff = useMemo(() => {
    const map: Record<string, ViaticoGiro[]> = {};
    for (const g of giros) {
      (map[g.staff_id] ??= []).push(g);
    }
    return map;
  }, [giros]);

  const anticiposByStaff = useMemo(() => {
    const map: Record<string, ViaticoAnticipo[]> = {};
    for (const a of anticipos) {
      (map[a.staff_id] ??= []).push(a);
    }
    return map;
  }, [anticipos]);

  const totalPorPersona = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of staff) {
      map[s.id] = (girosByStaff[s.id] ?? []).reduce((sum, g) => sum + g.monto, 0);
    }
    return map;
  }, [staff, girosByStaff]);

  const totalAnticipadoPorPersona = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of staff) {
      map[s.id] = (anticiposByStaff[s.id] ?? []).reduce((sum, a) => sum + a.valor, 0);
    }
    return map;
  }, [staff, anticiposByStaff]);

  const totalGeneral = giros.reduce((s, g) => s + g.monto, 0);
  const totalGirado = anticipos.reduce((s, a) => s + a.valor, 0);
  const totalPendiente = totalGeneral - totalGirado;

  function validar(): string[] {
    const problems: string[] = [];
    const nombre = (staffId: string) =>
      staff.find((s) => s.id === staffId)?.full_name.trim() || "una persona sin nombre";
    staff.forEach((s, i) => {
      if (!s.full_name.trim()) problems.push(`La persona #${i + 1} no tiene nombre`);
    });
    giros.forEach((g) => {
      if (!(g.cantidad > 0)) problems.push(`Un rubro de ${nombre(g.staff_id)} tiene cantidad 0`);
      else if (!(g.monto > 0)) problems.push(`Un rubro de ${nombre(g.staff_id)} tiene valor 0`);
    });
    anticipos.forEach((a) => {
      if (!(a.valor > 0)) problems.push(`Un anticipo de ${nombre(a.staff_id)} tiene valor 0`);
      if (!a.fecha) problems.push(`Un anticipo de ${nombre(a.staff_id)} no tiene fecha`);
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
    activeIndexAtSave.current = Math.max(
      0,
      staff.findIndex((s) => s.id === activeStaffId)
    );
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
      const toAnticipoRow = (a: ViaticoAnticipo): SaveAnticipoRow => ({
        id: a.id,
        staff_id: a.staff_id,
        fecha: a.fecha,
        valor: a.valor,
        notas: a.notas,
        sort_order: a.sort_order,
      });

      const result = await callSafe(() => saveProduccion({
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
        anticipos: {
          existing: anticipos.filter((a) => !isTemp(a.id)).map(toAnticipoRow),
          new: anticipos.filter((a) => isTemp(a.id)).map(toAnticipoRow),
          deletedIds: deletedAnticipoIds,
        },
      }));
      if (result.error) awaitingSync.current = false;
      setMessage(result.error ? saveErrorMessage(result.error) : "Guardado.");
    });
  }

  function categorizarGiros(lista: ViaticoGiro[]) {
    const map = new Map<Categoria, ViaticoGiro[]>();
    for (const cat of CATEGORIAS) map.set(cat, []);
    for (const g of lista) {
      map.get(categoriaDeRubro(g.rubro))!.push(g);
    }
    return map;
  }

  async function downloadPdf() {
    if (!printAreaRef.current) return;
    setIsDownloading(true);
    try {
      // Se arma el PDF a mano (una o más páginas por persona) en vez de usar
      // el "pagebreak" automático de html2pdf.js: ese modo calcula los
      // cortes sobre una sola imagen larga y dejaba una hoja casi en blanco
      // cada vez que sobraba espacio de la página anterior. Aquí cada hoja
      // de persona se captura por separado y, si no cabe completa en una
      // página A4, se divide en varias páginas de alto uniforme.
      const [{ default: html2canvas }, { jsPDF }, { addElementsAsPdfPages }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
        import("@/lib/pdf/paginate"),
      ]);

      const pageEls = printAreaRef.current.querySelectorAll<HTMLElement>("[data-pdf-page]");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      await addElementsAsPdfPages(pdf, pageEls, html2canvas);

      pdf.save(`Viaticos-${proposalId}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  const activeStaff = staff.find((s) => s.id === activeStaffId) ?? null;
  const activeGiros = activeStaff ? girosByStaff[activeStaff.id] ?? [] : [];
  const activeAnticipos = activeStaff ? anticiposByStaff[activeStaff.id] ?? [] : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Personal asignado al evento</h3>
            <button
              type="button"
              onClick={addStaff}
              className="btn btn-secondary btn-sm"
            >
              + Agregar persona
            </button>
          </div>
          <div className="space-y-3">
            {staff.length === 0 && (
              <p className="text-sm text-neutral-400">Todavía no hay personal asignado.</p>
            )}
            {staff.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-2 gap-2 rounded-md border border-neutral-100 p-3 sm:grid-cols-4 lg:grid-cols-7"
              >
                <LabeledField label="Nombre completo" className="col-span-2">
                  <input
                    value={s.full_name}
                    onChange={(e) => patchStaff(s.id, { full_name: e.target.value })}
                    className={inputClass}
                  />
                </LabeledField>
                <LabeledField label="Cargo">
                  <input
                    placeholder="Ej. Productor"
                    value={s.cargo ?? ""}
                    onChange={(e) => patchStaff(s.id, { cargo: e.target.value })}
                    className={inputClass}
                  />
                </LabeledField>
                <LabeledField label="Cédula">
                  <input
                    inputMode="numeric"
                    value={s.cedula ?? ""}
                    onChange={(e) => patchStaff(s.id, { cedula: e.target.value })}
                    className={inputClass}
                  />
                </LabeledField>
                <LabeledField label="Banco">
                  <input
                    value={s.banco ?? ""}
                    onChange={(e) => patchStaff(s.id, { banco: e.target.value })}
                    className={inputClass}
                  />
                </LabeledField>
                <LabeledField label="Tipo de cuenta">
                  <input
                    placeholder="Ahorros / Corriente"
                    value={s.tipo_cuenta ?? ""}
                    onChange={(e) => patchStaff(s.id, { tipo_cuenta: e.target.value })}
                    className={inputClass}
                  />
                </LabeledField>
                <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
                  <LabeledField label="N° de cuenta" className="min-w-0 flex-1">
                    <input
                      inputMode="numeric"
                      value={s.numero_cuenta ?? ""}
                      onChange={(e) => patchStaff(s.id, { numero_cuenta: e.target.value })}
                      className={inputClass}
                    />
                  </LabeledField>
                  <button
                    type="button"
                    onClick={() => removeStaff(s.id)}
                    className="icon-btn mb-1.5"
                    title="Quitar persona"
                    aria-label={`Quitar a ${s.full_name || "esta persona"}`}
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
            Valores fijos de la empresa — se seleccionan solos al elegir un rubro de Alimentación,
            Alojamiento o Transporte en el cuadro de cada persona.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {Object.entries(tarifasReferencia.alimentacion).map(([label, valor]) => (
              <div key={label} className="flex items-center justify-between text-neutral-600">
                <span>{label}</span>
                <span className="font-medium">{formatCOP(valor)}</span>
              </div>
            ))}
            {Object.entries(tarifasReferencia.alojamiento).map(([label, valor]) => (
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
              <div role="tablist" aria-label="Personas del evento" className="flex flex-wrap gap-1 border-b border-neutral-200 pb-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={activeStaffId === s.id}
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
                      className="btn btn-secondary btn-sm"
                    >
                      + Agregar rubro
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-400">
                        <th className="w-32 py-2">Fecha</th>
                        <th className="w-40 py-2">Rubro</th>
                        <th className="py-2">Concepto</th>
                        <th className="w-16 py-2">Cant.</th>
                        <th className="w-28 py-2">Vlr. unitario</th>
                        <th className="w-28 py-2">Monto</th>
                        <th className="w-8 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGiros.map((g) => (
                        <tr key={g.id} className="border-t border-neutral-100">
                          <td className="py-1.5 pr-2">
                            <input
                              type="date"
                              aria-label="Fecha del rubro"
                              value={g.fecha_giro ?? ""}
                              onChange={(e) => patchGiro(g.id, { fecha_giro: e.target.value || null })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              aria-label="Rubro"
                              value={g.rubro ?? "Otro"}
                              onChange={(e) => {
                                const label = e.target.value;
                                const tarifa =
                                  tarifasReferencia.alimentacion[label] ??
                                  tarifasReferencia.alojamiento[label] ??
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
                              <optgroup label="Alojamiento (tarifa fija)">
                                {Object.keys(tarifasReferencia.alojamiento).map((label) => (
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
                              aria-label="Concepto"
                              value={g.concepto ?? ""}
                              onChange={(e) => patchGiro(g.id, { concepto: e.target.value })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              min={0}
                              aria-label="Cantidad"
                              value={g.cantidad}
                              onChange={(e) => patchGiro(g.id, { cantidad: Number(e.target.value) || 0 })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <MoneyInput
                              aria-label="Valor unitario"
                              value={g.valor_unitario}
                              onChange={(v) => patchGiro(g.id, { valor_unitario: v ?? 0 })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2 text-right font-medium text-neutral-700">
                            {formatCOP(g.monto)}
                          </td>
                          <td className="py-1.5">
                            <button
                              type="button"
                              onClick={() => removeGiro(g.id)}
                              className="icon-btn"
                              title="Quitar rubro"
                              aria-label="Quitar rubro"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
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

        {activeStaff && (
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Anticipos / valores girados — {activeStaff.full_name || "(sin nombre)"}
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Registro de lo que realmente se le giró a la persona, con la fecha de la
                  transacción — independiente del desglose de rubros de arriba.
                </p>
              </div>
              <button
                type="button"
                onClick={() => addAnticipo(activeStaff.id)}
                className="btn btn-secondary btn-sm shrink-0"
              >
                + Agregar anticipo
              </button>
            </div>
            {activeAnticipos.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Todavía no hay anticipos registrados para {activeStaff.full_name || "esta persona"}.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="w-36 py-2">Fecha de transacción</th>
                    <th className="w-40 py-2">Valor</th>
                    <th className="py-2">Notas</th>
                    <th className="w-8 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {activeAnticipos.map((a) => (
                    <tr key={a.id} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-2">
                        <input
                          type="date"
                          aria-label="Fecha de la transacción"
                          value={a.fecha ?? ""}
                          onChange={(e) => patchAnticipo(a.id, { fecha: e.target.value || null })}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <MoneyInput
                          aria-label="Valor del anticipo"
                          value={a.valor}
                          onChange={(v) => patchAnticipo(a.id, { valor: v ?? 0 })}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          aria-label="Notas"
                          value={a.notas ?? ""}
                          onChange={(e) => patchAnticipo(a.id, { notas: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-1.5">
                        <button
                          type="button"
                          onClick={() => removeAnticipo(a.id)}
                          className="icon-btn"
                          title="Quitar anticipo"
                          aria-label="Quitar anticipo"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
              <span className="text-sm font-semibold text-neutral-900">
                Total girado a {activeStaff.full_name || "esta persona"}
              </span>
              <span className="text-sm font-semibold text-emerald-700">
                {formatCOP(totalAnticipadoPorPersona[activeStaff.id] ?? 0)}
              </span>
            </div>
          </section>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-6">
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
              onClick={downloadPdf}
              disabled={isDownloading}
              className="btn btn-secondary w-full"
            >
              {isDownloading ? "Generando PDF..." : "Descargar PDF para contabilidad"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="btn btn-primary w-full"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
            <SaveStatus dirty={dirty} isPending={isPending} message={message} className="text-center" />
          </div>
        </div>
      </div>

      <MobileSaveBar dirty={dirty} isPending={isPending} message={message} onSave={handleSave} />
      {/* Área imprimible oculta — el PDF sale de este bloque, una hoja de
          "Liquidación de viáticos" por persona, con sus rubros agrupados por
          categoría (Transporte, Alojamiento, Honorarios, Varios,
          Alimentación) y un espacio de firma — no del formulario de edición. */}
      <div className="fixed left-[-9999px] top-0 -z-10">
        <div ref={printAreaRef} className="w-[700px] bg-white text-black">
          {staff
            .filter((s) => (girosByStaff[s.id] ?? []).length > 0)
            .map((s) => {
              const misGiros = girosByStaff[s.id] ?? [];
              const misCategorias = categorizarGiros(misGiros);
              const misTotal = misGiros.reduce((sum, g) => sum + g.monto, 0);
              const misAnticipo = totalAnticipadoPorPersona[s.id] ?? 0;
              const misDiferencia = misAnticipo - misTotal;
              return (
                <div
                  key={s.id}
                  data-pdf-page
                  className="mb-4 border border-neutral-800 p-6"
                >
                  <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-3">
                    <span className="text-base font-extrabold tracking-tight text-emerald-700">
                      ticketcode
                    </span>
                    <span className="text-sm font-bold uppercase">Liquidación de viáticos</span>
                  </div>

                  <table className="mt-3 w-full border border-neutral-800 text-xs">
                    <tbody>
                      <tr className="border-b border-neutral-800 bg-neutral-100">
                        <th className="w-1/3 border-r border-neutral-800 py-1.5 font-semibold">
                          Nombres y apellidos
                        </th>
                        <th className="w-1/3 border-r border-neutral-800 py-1.5 font-semibold">
                          N° identidad
                        </th>
                        <th className="w-1/3 py-1.5 font-semibold">Evento</th>
                      </tr>
                      <tr className="border-b border-neutral-800 text-center">
                        <td className="border-r border-neutral-800 py-1.5">{s.full_name || "—"}</td>
                        <td className="border-r border-neutral-800 py-1.5">{s.cedula || "—"}</td>
                        <td className="py-1.5">{eventName}</td>
                      </tr>
                      <tr className="border-b border-neutral-800 bg-neutral-100">
                        <th className="border-r border-neutral-800 py-1.5 font-semibold">Desde</th>
                        <th className="border-r border-neutral-800 py-1.5 font-semibold">Hasta</th>
                        <th className="border-r border-neutral-800 py-1.5 font-semibold">Cargo</th>
                        <th className="border-r border-neutral-800 py-1.5 font-semibold">Ciudad</th>
                        <th className="py-1.5 font-semibold">Teléfono</th>
                      </tr>
                      <tr className="text-center">
                        <td className="border-r border-neutral-800 py-1.5">
                          {eventStartDate ? formatFechaCorta(eventStartDate) : "—"}
                        </td>
                        <td className="border-r border-neutral-800 py-1.5">
                          {eventEndDate ? formatFechaCorta(eventEndDate) : "—"}
                        </td>
                        <td className="border-r border-neutral-800 py-1.5">{s.cargo || "—"}</td>
                        <td className="border-r border-neutral-800 py-1.5">{eventCity || "—"}</td>
                        <td className="py-1.5">{s.telefono || "—"}</td>
                      </tr>
                    </tbody>
                  </table>

                  {CATEGORIAS.map((cat) => {
                    const items = misCategorias.get(cat) ?? [];
                    if (items.length === 0) return null;
                    const subtotal = items.reduce((sum, g) => sum + g.monto, 0);
                    return (
                      <div key={cat} className="mt-4">
                        <h2 className="border-b-2 border-neutral-800 pb-1 text-xs font-bold uppercase">
                          {cat}
                        </h2>
                        <table className="mt-1 w-full text-xs">
                          <thead>
                            <tr className="border-b border-neutral-300 text-left">
                              <th className="py-1">Fecha</th>
                              <th className="py-1">Concepto</th>
                              <th className="py-1 text-right">Cant.</th>
                              <th className="py-1 text-right">Vlr. unitario</th>
                              <th className="py-1 text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((g) => (
                              <tr key={g.id} className="border-b border-neutral-100">
                                <td className="py-1">
                                  {g.fecha_giro ? formatFechaCorta(g.fecha_giro) : "—"}
                                </td>
                                <td className="py-1">{g.concepto || g.rubro || "—"}</td>
                                <td className="py-1 text-right">{g.cantidad}</td>
                                <td className="py-1 text-right">{formatCOP(g.valor_unitario)}</td>
                                <td className="py-1 text-right">{formatCOP(g.monto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-1 flex justify-end text-xs font-semibold">
                          <span className="mr-2">Subtotal {cat}:</span>
                          <span>{formatCOP(subtotal)}</span>
                        </div>
                      </div>
                    );
                  })}

                  <table className="mt-3 w-full border border-neutral-800 text-xs">
                    <tbody>
                      <tr className="border-b border-neutral-800 bg-emerald-100">
                        <th className="border-r border-neutral-800 py-1.5 text-left">Total viáticos</th>
                        <td className="py-1.5 pr-2 text-right font-bold">{formatCOP(misTotal)}</td>
                      </tr>
                      <tr className="border-b border-neutral-800">
                        <th className="border-r border-neutral-800 py-1.5 text-left">
                          Anticipo girado a la persona
                        </th>
                        <td className="py-1.5 pr-2 text-right font-bold">{formatCOP(misAnticipo)}</td>
                      </tr>
                      <tr>
                        <th className="border-r border-neutral-800 py-1.5 text-left">
                          {misDiferencia >= 0 ? "Saldo a favor de Ticketcode" : "Saldo a reembolsar al trabajador"}
                        </th>
                        <td className="py-1.5 pr-2 text-right font-bold">{formatCOP(Math.abs(misDiferencia))}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="mt-4 w-full border border-neutral-800 text-xs">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="border-r border-b border-neutral-800 py-1.5"></th>
                        <th className="border-r border-b border-neutral-800 py-1.5 font-semibold">
                          Firma
                        </th>
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

                  <table className="mt-4 w-full border border-neutral-800 text-xs">
                    <tbody>
                      <tr className="border-b border-neutral-800">
                        <th className="w-1/3 border-r border-neutral-800 bg-neutral-100 py-1.5 text-left">
                          Depositar a cuenta N°
                        </th>
                        <td className="py-1.5 pl-2">{s.numero_cuenta || "—"}</td>
                      </tr>
                      <tr>
                        <th className="border-r border-neutral-800 bg-neutral-100 py-1.5 text-left">
                          Banco
                        </th>
                        <td className="py-1.5 pl-2">{s.banco || "—"}</td>
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
