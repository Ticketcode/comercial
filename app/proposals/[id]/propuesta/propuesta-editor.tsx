"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  CatalogItem,
  Proposal,
  ProposalCatalogSelection,
  ProposalCommercialAgreement,
  ProposalOperationalRequirement,
  ProposalPaymentMilestone,
  ProposalScheduleItem,
} from "@/lib/types";
import type { TarifarioSummary } from "@/lib/pricing/summary";
import { applyCommercialDiscount, formatCOP } from "@/lib/pricing/summary";
import { MobileSaveBar, SaveStatus, useConfirm, useUnsavedChanges } from "@/app/components/ui-guard";
import { callSafe, problemsMessage, saveErrorMessage } from "@/lib/errors";
import { formatFechaCorta } from "@/lib/fecha-local";
import { savePropuesta } from "./actions";
import { addMilestone, removeMilestone, updateMilestonePct, type Milestone } from "./milestones";

// Paleta del diseño aprobado del módulo Comercial (tema claro) — este
// documento se exporta a PDF, así que se mantiene siempre en claro
// independiente del tema que tenga activo quien lo prepara.
const BRAND = {
  dark: "#12142B",
  blue: "#21CF3C",
  // Variante oscura del verde de marca: el verde vivo no da suficiente
  // contraste como color de texto sobre blanco, así que las cifras y
  // títulos usan este tono en vez de BRAND.blue directamente.
  blueText: "#0E7A33",
  teal: "#5B2FD1",
  orange: "#B8860B",
  grey: "#4A4F73",
  lightGrey: "#E2E5F0",
};

interface IncludedService {
  id: string;
  name: string;
  description: string | null;
  custom_name: string | null;
  custom_description: string | null;
}

interface Props {
  proposal: Proposal;
  tarifarioSummary: TarifarioSummary;
  catalogItems: CatalogItem[];
  catalogSelections: ProposalCatalogSelection[];
  includedServices: IncludedService[];
  agreementItems: ProposalCommercialAgreement[];
  scheduleItems: ProposalScheduleItem[];
  paymentMilestones: ProposalPaymentMilestone[];
  operationalRequirements: ProposalOperationalRequirement[];
}

const modalityLabel: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrido: "Híbrido",
  mundo_virtual: "Mundo virtual",
};

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-[#21CF3C] focus:ring-1 focus:ring-[#21CF3C]";

let tempIdCounter = 0;
function tempId() {
  tempIdCounter -= 1;
  return `new-${tempIdCounter}`;
}

function Slide({
  kicker,
  title,
  accent = BRAND.blue,
  children,
}: {
  kicker?: string;
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="pdf-slide font-sans overflow-hidden rounded-card border border-neutral-200 bg-white p-8 shadow-sm"
      style={{ breakInside: "avoid" }}
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <div>
          {kicker && (
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: BRAND.grey }}>
              {kicker}
            </p>
          )}
          <h2 className="font-display text-2xl font-bold" style={{ color: BRAND.dark }}>
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function PropuestaEditor({
  proposal,
  tarifarioSummary,
  catalogItems,
  catalogSelections: initialSelections,
  includedServices: initialIncludedServices,
  agreementItems: initialAgreementItems,
  scheduleItems: initialScheduleItems,
  paymentMilestones: initialMilestones,
  operationalRequirements: initialRequirements,
}: Props) {
  const [lugar, setLugar] = useState(proposal.lugar ?? "");
  const [selections, setSelections] = useState(
    Object.fromEntries(initialSelections.map((s) => [s.catalog_item_id, { ...s }]))
  );
  const [servicios, setServicios] = useState(
    Object.fromEntries(initialIncludedServices.map((s) => [s.id, { ...s }]))
  );
  const [agreementRows, setAgreementRows] = useState(initialAgreementItems.map((a) => ({ ...a })));
  const [globalPct, setGlobalPct] = useState(Number(proposal.acuerdo_comercial_pct_global));
  const [scheduleRows, setScheduleRows] = useState(initialScheduleItems.map((s) => ({ ...s })));
  const [deletedScheduleIds, setDeletedScheduleIds] = useState<string[]>([]);
  const [cronogramaSemanas, setCronogramaSemanas] = useState(proposal.cronograma_semanas);
  const [cronogramaDias, setCronogramaDias] = useState(proposal.cronograma_dias);
  const [milestones, setMilestones] = useState<Milestone[]>(
    initialMilestones.map((m) => ({ ...m, pct: Number(m.pct) }))
  );
  const [deletedMilestoneIds, setDeletedMilestoneIds] = useState<string[]>([]);
  const [requirements, setRequirements] = useState(initialRequirements.map((r) => ({ ...r })));
  const [deletedRequirementIds, setDeletedRequirementIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const { dirty, resetTo } = useUnsavedChanges({
    lugar,
    selections,
    servicios,
    agreementRows,
    globalPct,
    scheduleRows,
    deletedScheduleIds,
    cronogramaSemanas,
    cronogramaDias,
    milestones,
    deletedMilestoneIds,
    requirements,
    deletedRequirementIds,
  });
  // Tras guardar, las filas nuevas dejan de ser temporales: se adopta lo guardado en la base
  // de datos para que un segundo guardado no las inserte otra vez.
  const awaitingSync = useRef(false);

  useEffect(() => {
    if (!awaitingSync.current) return;
    awaitingSync.current = false;
    const next = {
      lugar: proposal.lugar ?? "",
      selections: Object.fromEntries(initialSelections.map((s) => [s.catalog_item_id, { ...s }])),
      servicios: Object.fromEntries(initialIncludedServices.map((s) => [s.id, { ...s }])),
      agreementRows: initialAgreementItems.map((a) => ({ ...a })),
      globalPct: Number(proposal.acuerdo_comercial_pct_global),
      scheduleRows: initialScheduleItems.map((s) => ({ ...s })),
      deletedScheduleIds: [] as string[],
      cronogramaSemanas: proposal.cronograma_semanas,
      cronogramaDias: proposal.cronograma_dias,
      milestones: initialMilestones.map((m) => ({ ...m, pct: Number(m.pct) })),
      deletedMilestoneIds: [] as string[],
      requirements: initialRequirements.map((r) => ({ ...r })),
      deletedRequirementIds: [] as string[],
    };
    setLugar(next.lugar);
    setSelections(next.selections);
    setServicios(next.servicios);
    setAgreementRows(next.agreementRows);
    setGlobalPct(next.globalPct);
    setScheduleRows(next.scheduleRows);
    setDeletedScheduleIds(next.deletedScheduleIds);
    setCronogramaSemanas(next.cronogramaSemanas);
    setCronogramaDias(next.cronogramaDias);
    setMilestones(next.milestones);
    setDeletedMilestoneIds(next.deletedMilestoneIds);
    setRequirements(next.requirements);
    setDeletedRequirementIds(next.deletedRequirementIds);
    resetTo(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScheduleItems, initialMilestones, initialRequirements]);

  async function handleDownloadPdf() {
    if (!printAreaRef.current) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          filename: `Propuesta - ${proposal.event_name}.pdf`,
          margin: 8,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(printAreaRef.current)
        .save();
    } finally {
      setIsDownloading(false);
    }
  }

  const discount = useMemo(
    () => applyCommercialDiscount(tarifarioSummary.valorPropuestaFinal, globalPct),
    [tarifarioSummary.valorPropuestaFinal, globalPct]
  );

  const totalPesoConceptos = agreementRows
    .filter((a) => a.included)
    .reduce((sum, a) => sum + Number(a.pct), 0);

  function toggleSelection(catalogItemId: string) {
    setSelections((prev) => ({
      ...prev,
      [catalogItemId]: { ...prev[catalogItemId], included: !prev[catalogItemId].included },
    }));
  }

  function editSelectionText(catalogItemId: string, name: string, description: string) {
    setSelections((prev) => ({
      ...prev,
      [catalogItemId]: {
        ...prev[catalogItemId],
        custom_name: name.trim() || null,
        custom_description: description.trim() || null,
      },
    }));
  }

  function editServicioText(costItemId: string, name: string, description: string) {
    setServicios((prev) => ({
      ...prev,
      [costItemId]: {
        ...prev[costItemId],
        custom_name: name.trim() || null,
        custom_description: description.trim() || null,
      },
    }));
  }

  function patchAgreement(id: string, patch: Partial<ProposalCommercialAgreement>) {
    setAgreementRows((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function patchSchedule(id: string, patch: Partial<ProposalScheduleItem>) {
    setScheduleRows((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addScheduleRow(week: number, dayNumber: number | null = null) {
    setScheduleRows((prev) => [
      ...prev,
      {
        id: tempId(),
        proposal_id: proposal.id,
        week_number: week,
        day_number: dayNumber,
        hito: "",
        comentario: null,
        sort_order: prev.length,
      },
    ]);
  }

  async function removeScheduleRow(id: string) {
    if (!id.startsWith("new-")) {
      const ok = await confirm({
        title: "¿Quitar este hito del cronograma?",
        message: "El cambio se aplica al pulsar Guardar propuesta.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setScheduleRows((prev) => prev.filter((s) => s.id !== id));
    if (!id.startsWith("new-")) setDeletedScheduleIds((prev) => [...prev, id]);
  }

  // Semanas/días configurados explícitamente (pueden existir vacíos, antes de
  // tener hitos cargados) — si nunca se tocó el +/- se derivan del contenido.
  const configuredWeeks = cronogramaSemanas ?? Math.max(0, ...scheduleRows.map((s) => s.week_number), 0);
  const configuredDays = cronogramaDias ?? Math.max(0, ...scheduleRows.map((s) => s.day_number ?? 0));

  function addWeek() {
    setCronogramaSemanas(configuredWeeks + 1);
  }

  async function removeWeek(week: number) {
    const hasContent = scheduleRows.some((s) => s.week_number === week && s.hito.trim());
    if (hasContent) {
      const ok = await confirm({
        title: `¿Quitar la semana ${week}?`,
        message: "Se borran todos los hitos cargados en esa semana. El cambio se aplica al pulsar Guardar propuesta.",
        confirmLabel: "Quitar semana",
        danger: true,
      });
      if (!ok) return;
    }
    const toRemove = scheduleRows.filter((s) => s.week_number === week);
    setScheduleRows((prev) =>
      prev
        .filter((s) => s.week_number !== week)
        .map((s) => (s.week_number > week ? { ...s, week_number: s.week_number - 1 } : s))
    );
    setDeletedScheduleIds((prev) => [...prev, ...toRemove.filter((s) => !s.id.startsWith("new-")).map((s) => s.id)]);
    setCronogramaSemanas(Math.max(0, configuredWeeks - 1));
  }

  function addDayColumn() {
    setCronogramaDias(configuredDays + 1);
  }

  async function removeDayColumn() {
    const hasContent = scheduleRows.some((s) => s.day_number === configuredDays && s.hito.trim());
    if (hasContent) {
      const ok = await confirm({
        title: `¿Quitar la columna del día ${configuredDays}?`,
        message: "Se borran todos los hitos cargados en ese día, en todas las semanas. El cambio se aplica al pulsar Guardar propuesta.",
        confirmLabel: "Quitar día",
        danger: true,
      });
      if (!ok) return;
    }
    const toRemove = scheduleRows.filter((s) => s.day_number === configuredDays);
    setScheduleRows((prev) => prev.filter((s) => s.day_number !== configuredDays));
    setDeletedScheduleIds((prev) => [...prev, ...toRemove.filter((s) => !s.id.startsWith("new-")).map((s) => s.id)]);
    setCronogramaDias(Math.max(0, configuredDays - 1));
  }

  async function removeMilestoneRow(id: string) {
    if (!id.startsWith("new-")) {
      const ok = await confirm({
        title: "¿Quitar este hito de pago?",
        message: "Los porcentajes se reajustan. El cambio se aplica al pulsar Guardar propuesta.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setMilestones((prev) => removeMilestone(prev, id));
    if (!id.startsWith("new-")) setDeletedMilestoneIds((prev) => [...prev, id]);
  }

  function addRequirement() {
    setRequirements((prev) => [
      ...prev,
      { id: tempId(), proposal_id: proposal.id, text: "", sort_order: prev.length },
    ]);
  }

  async function removeRequirement(id: string) {
    if (!id.startsWith("new-")) {
      const ok = await confirm({
        title: "¿Quitar este requerimiento?",
        message: "El cambio se aplica al pulsar Guardar propuesta.",
        confirmLabel: "Quitar",
        danger: true,
      });
      if (!ok) return;
    }
    setRequirements((prev) => prev.filter((r) => r.id !== id));
    if (!id.startsWith("new-")) setDeletedRequirementIds((prev) => [...prev, id]);
  }

  function validar(): string[] {
    const problems: string[] = [];
    scheduleRows.forEach((s) => {
      if (!s.hito.trim()) problems.push(`Hay un hito del cronograma sin texto (semana ${s.week_number})`);
    });
    milestones.forEach((m) => {
      if (!m.label.trim()) problems.push("Hay un hito de pago sin descripción");
    });
    requirements.forEach((r) => {
      if (!r.text.trim()) problems.push("Hay un requerimiento operativo vacío");
    });
    return Array.from(new Set(problems));
  }

  async function handleSave() {
    const problems = validar();
    if (problems.length > 0) {
      setMessage(problemsMessage(problems));
      return;
    }
    // Aviso (no bloquea): los pesos del acuerdo comercial deben repartir el 100%.
    const incluidos = agreementRows.filter((a) => a.included);
    if (incluidos.length > 0 && Math.abs(totalPesoConceptos - 100) > 0.01) {
      const ok = await confirm({
        title: "Los pesos del acuerdo comercial no suman 100%",
        message: `Suman ${totalPesoConceptos}%. Deberían repartir exactamente el 100% del descuento entre los conceptos marcados. ¿Guardar de todos modos?`,
        confirmLabel: "Guardar así",
        cancelLabel: "Corregir",
      });
      if (!ok) return;
    }
    setMessage(null);
    awaitingSync.current = true;
    startTransition(async () => {
      const existingSchedule = scheduleRows.filter((s) => !s.id.startsWith("new-"));
      const newSchedule = scheduleRows.filter((s) => s.id.startsWith("new-"));
      const existingMilestones = milestones.filter((m) => !m.id.startsWith("new-"));
      const newMilestones = milestones.filter((m) => m.id.startsWith("new-"));
      const existingRequirements = requirements.filter((r) => !r.id.startsWith("new-"));
      const newRequirements = requirements.filter((r) => r.id.startsWith("new-"));

      const result = await callSafe(() => savePropuesta({
        proposalId: proposal.id,
        lugar,
        acuerdo_comercial_pct_global: globalPct,
        cronograma_semanas: cronogramaSemanas,
        cronograma_dias: cronogramaDias,
        agreementItems: agreementRows.map((a) => ({ id: a.id, included: a.included, pct: Number(a.pct) })),
        scheduleItems: existingSchedule.map((s) => ({
          id: s.id,
          week_number: s.week_number,
          day_number: s.day_number,
          hito: s.hito,
          comentario: s.comentario,
        })),
        newScheduleItems: newSchedule.map((s) => ({
          id: s.id,
          week_number: s.week_number,
          day_number: s.day_number,
          hito: s.hito,
          comentario: s.comentario,
        })),
        deletedScheduleItemIds: deletedScheduleIds,
        catalogSelections: Object.values(selections).map((s) => ({
          id: s.id,
          included: s.included,
          custom_name: s.custom_name,
          custom_description: s.custom_description,
        })),
        costItems: Object.values(servicios).map((s) => ({
          id: s.id,
          custom_name: s.custom_name,
          custom_description: s.custom_description,
        })),
        milestones: {
          existing: existingMilestones,
          new: newMilestones,
          deletedIds: deletedMilestoneIds,
        },
        requerimientos: {
          existing: existingRequirements,
          new: newRequirements,
          deletedIds: deletedRequirementIds,
        },
      }));
      if (result.error) awaitingSync.current = false;
      setMessage(result.error ? saveErrorMessage(result.error) : "Guardado.");
    });
  }

  const componentesBasicos = catalogItems.filter((c) => c.category === "componente_basico");
  const logistica360 = catalogItems.filter((c) => c.category === "logistica_360");

  const weekNumbers = useMemo(
    () => Array.from({ length: configuredWeeks }, (_, i) => i + 1),
    [configuredWeeks]
  );
  const dayNumbers = useMemo(
    () => Array.from({ length: configuredDays }, (_, i) => i + 1),
    [configuredDays]
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex justify-end">
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex min-h-11 items-center rounded-pill bg-surface px-5 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {isDownloading ? "Generando PDF..." : "Descargar PDF"}
        </button>
      </div>

      <div ref={printAreaRef} className="space-y-6 bg-white">
        {/* Perfil del evento */}
        <Slide kicker="Ticketcode" title="Perfil del evento" accent={BRAND.blue}>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-6">
            <Stat label="Nombre" value={proposal.event_name} />
            <div>
              <p className="text-xs" style={{ color: BRAND.grey }}>
                Lugar
              </p>
              <input
                aria-label="Lugar del evento"
                spellCheck
                lang="es"
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Ej. Centro de Convenciones..."
                className={`${inputClass} mt-0.5`}
              />
            </div>
            <Stat label="Ciudad" value={proposal.city ?? "—"} />
            <Stat label="Modalidad" value={modalityLabel[proposal.modality] ?? proposal.modality} />
            {proposal.modality === "hibrido" ? (
              <>
                <Stat label="Aforo presencial" value={String(proposal.aforo ?? "—")} />
                <Stat label="Aforo virtual" value={String(proposal.aforo_virtual ?? "—")} />
              </>
            ) : proposal.modality === "virtual" || proposal.modality === "mundo_virtual" ? (
              <Stat label="Aforo virtual" value={String(proposal.aforo_virtual ?? "—")} />
            ) : (
              <Stat label="Aforo" value={String(proposal.aforo ?? "—")} />
            )}
            <Stat
              label="Fechas"
              value={
                proposal.event_start_date
                  ? `${formatFechaCorta(proposal.event_start_date)}${proposal.event_end_date ? ` a ${formatFechaCorta(proposal.event_end_date)}` : ""}`
                  : "—"
              }
            />
          </div>
        </Slide>

        {/* Qué incluye — componentes básicos, logística 360, servicios personalizados */}
        <Slide kicker="Propuesta" title="Lo que incluye tu evento" accent={BRAND.teal}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <ChecklistBox
              title="Componentes básicos"
              color={BRAND.teal}
              items={componentesBasicos.map((c) => ({
                key: c.id,
                label: selections[c.id]?.custom_name || c.name,
                description: selections[c.id]?.custom_description || c.description,
                checked: selections[c.id]?.included ?? false,
                onToggle: () => toggleSelection(c.id),
                onEditSave: (name, description) => editSelectionText(c.id, name, description),
              }))}
              emptyLabel="No hay componentes básicos definidos para esta modalidad."
            />
            <ChecklistBox
              title="Logística 360"
              color={BRAND.orange}
              items={logistica360.map((c) => ({
                key: c.id,
                label: selections[c.id]?.custom_name || c.name,
                description: selections[c.id]?.custom_description || c.description,
                checked: selections[c.id]?.included ?? false,
                onToggle: () => toggleSelection(c.id),
                onEditSave: (name, description) => editSelectionText(c.id, name, description),
              }))}
              emptyLabel="No aplica logística presencial para esta modalidad."
            />
            <ChecklistBox
              title="Servicios personalizados"
              color={BRAND.blueText}
              items={Object.values(servicios).map((s) => ({
                key: s.id,
                label: s.custom_name || s.name,
                description: s.custom_description || s.description,
                checked: true,
                readOnly: true,
                onEditSave: (name, description) => editServicioText(s.id, name, description),
              }))}
              emptyLabel="No se seleccionó ningún servicio personalizado en el Tarifario."
              footnote="Se eligen en el paso 1 (Tarifario)."
            />
          </div>
        </Slide>

        {/* Inversión */}
        <Slide kicker="Presupuesto" title="Inversión inicial" accent={BRAND.blue}>
          <HeroNumber
            label="Valor Propuesta Final"
            value={formatCOP(tarifarioSummary.valorPropuestaFinal)}
            color={BRAND.blueText}
            large
          />
        </Slide>

        {/* Acuerdo comercial */}
        <Slide
          kicker="Negociación"
          title="Acuerdo comercial — lo que podemos negociar"
          accent={BRAND.orange}
        >
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl p-4" style={{ backgroundColor: BRAND.lightGrey }}>
            <label className="text-sm font-semibold" style={{ color: BRAND.dark }}>
              % del acuerdo comercial (descuento real que se aplica)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              aria-label="Porcentaje del acuerdo comercial"
              value={globalPct}
              onChange={(e) => setGlobalPct(Number(e.target.value) || 0)}
              className="h-10 w-24 rounded-md border border-neutral-300 px-2 text-right text-lg font-bold"
              style={{ color: BRAND.orange }}
            />
            <span className="text-lg font-bold" style={{ color: BRAND.orange }}>
              %
            </span>
          </div>
          <p className="mb-3 text-xs" style={{ color: BRAND.grey }}>
            Los siguientes % son el peso de cada concepto DENTRO del {globalPct}% de arriba — deben sumar
            100% entre ellos, no se suman al descuento total.
          </p>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase" style={{ color: BRAND.grey }}>
              <tr>
                <th className="w-10 py-2"></th>
                <th className="py-2">Concepto</th>
                <th className="w-28 py-2 text-right">Peso dentro del {globalPct}%</th>
              </tr>
            </thead>
            <tbody>
              {agreementRows.map((row) => (
                <tr key={row.id} className="border-t align-top" style={{ borderColor: BRAND.lightGrey }}>
                  <td className="py-3">
                    <input
                      type="checkbox"
                      aria-label={`Incluir ${row.label}`}
                      checked={row.included}
                      onChange={(e) => patchAgreement(row.id, { included: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="py-3">
                    <p className="font-medium" style={{ color: BRAND.dark }}>
                      {row.label}
                    </p>
                    {row.notes && (
                      <p className="mt-1 text-xs" style={{ color: BRAND.grey }}>
                        {row.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!row.included}
                      aria-label={`Peso de ${row.label}`}
                      value={row.pct}
                      onChange={(e) => patchAgreement(row.id, { pct: Number(e.target.value) || 0 })}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            className="mt-4 flex justify-end text-lg font-bold"
            style={{ color: totalPesoConceptos === 100 ? BRAND.teal : BRAND.orange }}
          >
            Suma de pesos: {totalPesoConceptos}% {totalPesoConceptos !== 100 && "(debe ser 100%)"}
          </div>
        </Slide>

        {/* Presupuesto final */}
        <Slide
          kicker="Presupuesto"
          title="Presupuesto final — valor justo y ganador para las partes"
          accent={BRAND.blue}
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Stat label="Valor sin descuento" value={formatCOP(tarifarioSummary.valorPropuestaFinal)} />
            <Stat label={`Descuento comercial (${globalPct}%)`} value={`- ${formatCOP(discount.descuento)}`} />
            <Stat label="Valor con descuento" value={formatCOP(discount.valorConDescuento)} />
          </div>
          <div className="mt-6">
            <HeroNumber
              label="Total Propuesta (IVA incluido)"
              value={formatCOP(discount.valorConDescuento + discount.ivaFinal)}
              color={BRAND.blueText}
              large
            />
          </div>
        </Slide>

        {/* Modelo de pagos */}
        <Slide kicker="Condiciones" title="Modelo de pagos" accent={BRAND.teal}>
          <div className="space-y-2">
            {milestones.map((m, idx) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3">
                <input
                  aria-label="Descripción del hito de pago"
                  spellCheck
                  lang="es"
                  value={m.label}
                  onChange={(e) =>
                    setMilestones((prev) =>
                      prev.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x))
                    )
                  }
                  className={inputClass}
                  placeholder="Descripción del hito"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label="Porcentaje del hito de pago"
                  value={Math.round(m.pct * 100) / 100}
                  onChange={(e) =>
                    setMilestones((prev) => updateMilestonePct(prev, idx, Number(e.target.value) || 0))
                  }
                  className="h-9 w-20 rounded-md border border-neutral-300 px-2 text-right text-sm"
                />
                <span className="w-8 text-sm" style={{ color: BRAND.grey }}>
                  %
                </span>
                <span className="w-36 text-right text-sm font-semibold" style={{ color: BRAND.teal }}>
                  {formatCOP(((discount.valorConDescuento + discount.ivaFinal) * m.pct) / 100)}
                </span>
                {!isDownloading && milestones.length > 1 && (
                  <button
                    onClick={() => removeMilestoneRow(m.id)}
                    className="no-print text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isDownloading && (
            <button
              onClick={() => setMilestones((prev) => addMilestone(prev, tempId))}
              className="no-print mt-3 text-xs font-medium underline"
              style={{ color: BRAND.grey }}
            >
              + Agregar hito
            </button>
          )}
        </Slide>

        {/* Cronograma — semanas en filas, días en columnas (configurables). "General" es
            el bloque de toda la semana; las columnas de día son para desglosar puntualmente. */}
        <Slide kicker="Plan de trabajo" title="Cronograma" accent={BRAND.orange}>
          <div className="overflow-x-auto">
            <table className="w-full border-separate text-xs" style={{ borderSpacing: 6 }}>
              <thead>
                <tr>
                  <th className="w-20 text-left text-[11px] font-bold uppercase" style={{ color: BRAND.orange }}>
                    Semana
                  </th>
                  <th className="w-40 text-left text-[11px] font-bold uppercase" style={{ color: BRAND.grey }}>
                    General
                  </th>
                  {dayNumbers.map((day) => (
                    <th key={day} className="w-40 text-left text-[11px] font-bold uppercase" style={{ color: BRAND.grey }}>
                      Día {day}
                    </th>
                  ))}
                  {!isDownloading && (
                    <th className="no-print w-20">
                      <div className="flex gap-1">
                        <button
                          onClick={addDayColumn}
                          title="Agregar columna de día"
                          aria-label="Agregar columna de día"
                          className="rounded px-2 py-1 text-xs font-bold"
                          style={{ backgroundColor: BRAND.lightGrey, color: BRAND.orange }}
                        >
                          +Día
                        </button>
                        {dayNumbers.length > 0 && (
                          <button
                            onClick={removeDayColumn}
                            title="Quitar la última columna de día"
                            aria-label="Quitar la última columna de día"
                            className="rounded px-2 py-1 text-xs font-bold"
                            style={{ backgroundColor: BRAND.lightGrey, color: BRAND.grey }}
                          >
                            −Día
                          </button>
                        )}
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {weekNumbers.map((week) => (
                  <tr key={week} className="align-top">
                    <td className="pt-1">
                      <p className="text-[11px] font-bold" style={{ color: BRAND.orange }}>
                        Semana {week}
                      </p>
                      {!isDownloading && (
                        <button
                          onClick={() => removeWeek(week)}
                          className="no-print mt-1 text-[10px] text-red-500 hover:underline"
                        >
                          Quitar semana
                        </button>
                      )}
                    </td>
                    <CronogramaCell
                      rows={scheduleRows.filter((r) => r.week_number === week && r.day_number === null)}
                      onAdd={() => addScheduleRow(week, null)}
                      onPatch={patchSchedule}
                      onRemove={removeScheduleRow}
                      isDownloading={isDownloading}
                      ariaLabel={`Hito general, semana ${week}`}
                      textColor={BRAND.dark}
                      grey={BRAND.grey}
                    />
                    {dayNumbers.map((day) => (
                      <CronogramaCell
                        key={day}
                        rows={scheduleRows.filter((r) => r.week_number === week && r.day_number === day)}
                        onAdd={() => addScheduleRow(week, day)}
                        onPatch={patchSchedule}
                        onRemove={removeScheduleRow}
                        isDownloading={isDownloading}
                        ariaLabel={`Hito semana ${week}, día ${day}`}
                        textColor={BRAND.dark}
                        grey={BRAND.grey}
                      />
                    ))}
                  </tr>
                ))}
                {!isDownloading && (
                  <tr>
                    <td colSpan={2 + dayNumbers.length}>
                      <button
                        onClick={addWeek}
                        className="no-print mt-1 rounded border-2 border-dashed px-3 py-1.5 text-[11px] font-medium"
                        style={{ borderColor: BRAND.grey, color: BRAND.grey }}
                      >
                        + Semana
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Slide>

        {/* Requerimientos operativos — lista de ítems, no un bloque de texto */}
        <Slide kicker="Logística" title="Requerimientos operativos" accent={BRAND.blue}>
          <ul className="space-y-2">
            {requirements.map((req) => (
              <li key={req.id} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: BRAND.blue }} />
                <input
                  aria-label="Requerimiento operativo"
                  spellCheck
                  lang="es"
                  value={req.text}
                  onChange={(e) =>
                    setRequirements((prev) =>
                      prev.map((r) => (r.id === req.id ? { ...r, text: e.target.value } : r))
                    )
                  }
                  className={inputClass}
                />
                {!isDownloading && (
                  <button
                    onClick={() => removeRequirement(req.id)}
                    className="no-print shrink-0 text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!isDownloading && (
            <button
              onClick={addRequirement}
              className="no-print mt-3 text-xs font-medium underline"
              style={{ color: BRAND.grey }}
            >
              + Agregar requerimiento
            </button>
          )}
        </Slide>
      </div>

      <MobileSaveBar dirty={dirty} isPending={isPending} message={message} onSave={handleSave} label="Guardar propuesta" />
      <div className="no-print flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex min-h-11 items-center rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar propuesta"}
        </button>
        <SaveStatus dirty={dirty} isPending={isPending} message={message} />
        {message === "Guardado." && !dirty && (
          <a
            href={`/proposals/${proposal.id}/contrato`}
            className="no-print flex min-h-11 items-center rounded-pill bg-surface2 px-5 text-sm font-semibold text-ink"
          >
            Siguiente: Contrato →
          </a>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: BRAND.grey }}>
        {label}
      </p>
      <p className="mt-0.5 font-semibold" style={{ color: BRAND.dark }}>
        {value}
      </p>
    </div>
  );
}

function CronogramaCell({
  rows,
  onAdd,
  onPatch,
  onRemove,
  isDownloading,
  ariaLabel,
  textColor,
  grey,
}: {
  rows: ProposalScheduleItem[];
  onAdd: () => void;
  onPatch: (id: string, patch: Partial<ProposalScheduleItem>) => void;
  onRemove: (id: string) => void;
  isDownloading: boolean;
  ariaLabel: string;
  textColor: string;
  grey: string;
}) {
  return (
    <td className="align-top">
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.id} className="rounded p-1.5 shadow-sm" style={{ backgroundColor: "white" }}>
            <input
              aria-label={ariaLabel}
              spellCheck
              lang="es"
              value={row.hito}
              onChange={(e) => onPatch(row.id, { hito: e.target.value })}
              placeholder="Hito"
              className="w-full border-none bg-transparent text-xs outline-none"
              style={{ color: textColor }}
            />
            {!isDownloading && (
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => onRemove(row.id)}
                  className="no-print text-[10px] text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
        {!isDownloading && (
          <button
            onClick={onAdd}
            className="no-print w-full text-center text-[11px] font-medium underline"
            style={{ color: grey }}
          >
            + hito
          </button>
        )}
      </div>
    </td>
  );
}

function HeroNumber({
  label,
  value,
  color,
  large,
}: {
  label: string;
  value: string;
  color: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: BRAND.lightGrey }}>
      <p className="text-xs font-medium" style={{ color: BRAND.grey }}>
        {label}
      </p>
      <p className={`mt-1 font-extrabold ${large ? "text-4xl" : "text-2xl"}`} style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function ChecklistBox({
  title,
  color,
  items,
  emptyLabel,
  footnote,
}: {
  title: string;
  color: string;
  items: {
    key: string;
    label: string;
    description: string | null;
    checked: boolean;
    onToggle?: () => void;
    readOnly?: boolean;
    onEditSave?: (name: string, description: string) => void;
  }[];
  emptyLabel: string;
  footnote?: string;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  function startEdit(item: (typeof items)[number]) {
    setEditingKey(item.key);
    setDraftName(item.label);
    setDraftDescription(item.description ?? "");
  }

  function saveEdit(item: (typeof items)[number]) {
    item.onEditSave?.(draftName, draftDescription);
    setEditingKey(null);
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BRAND.lightGrey }}>
      <p className="mb-3 text-sm font-bold" style={{ color }}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs italic" style={{ color: BRAND.grey }}>
          {emptyLabel}
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
          {items.map((item) => (
            <li key={item.key} className="flex items-start gap-2">
              <input
                type="checkbox"
                aria-label={item.label}
                checked={item.checked}
                disabled={item.readOnly}
                onChange={item.onToggle}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              {editingKey === item.key ? (
                <div className="flex-1 space-y-1">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    spellCheck
                    lang="es"
                    className="w-full rounded border border-neutral-300 px-1.5 py-0.5 text-xs font-medium"
                  />
                  <textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    spellCheck
                    lang="es"
                    rows={2}
                    className="w-full rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(item)}
                      className="text-[11px] font-semibold underline"
                      style={{ color }}
                    >
                      Guardar texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="text-[11px] text-neutral-400 underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <p className={item.checked ? "font-medium" : "text-neutral-400 line-through"} style={item.checked ? { color: BRAND.dark } : undefined}>
                    {item.label}
                    {item.onEditSave && (
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        title="Editar título y descripción"
                        aria-label={`Editar ${item.label}`}
                        className="ml-1.5 text-neutral-400 hover:text-neutral-700"
                      >
                        ✎
                      </button>
                    )}
                  </p>
                  {item.description && item.checked && (
                    <p className="mt-0.5 whitespace-pre-line" style={{ color: BRAND.grey }}>
                      {item.description}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {footnote && (
        <p className="mt-3 text-[10px] italic" style={{ color: BRAND.grey }}>
          {footnote}
        </p>
      )}
    </div>
  );
}
