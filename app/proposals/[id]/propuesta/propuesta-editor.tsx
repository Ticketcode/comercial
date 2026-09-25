"use client";

import { useMemo, useRef, useState, useTransition } from "react";
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
import { savePropuesta } from "./actions";
import { addMilestone, removeMilestone, updateMilestonePct, type Milestone } from "./milestones";

// Paleta real de "Plantilla propuesta eventos 2026.pptx" (theme1.xml).
const BRAND = {
  dark: "#212121",
  blue: "#4285F4",
  teal: "#0097A7",
  orange: "#FFAB40",
  grey: "#78909C",
  lightGrey: "#EEEEEE",
};

interface IncludedService {
  name: string;
  description: string | null;
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
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]";

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
      className="pdf-slide overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      style={{ breakInside: "avoid", fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <div>
          {kicker && (
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: BRAND.grey }}>
              {kicker}
            </p>
          )}
          <h2 className="text-2xl font-bold" style={{ color: BRAND.dark }}>
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
  includedServices,
  agreementItems: initialAgreementItems,
  scheduleItems: initialScheduleItems,
  paymentMilestones: initialMilestones,
  operationalRequirements: initialRequirements,
}: Props) {
  const [lugar, setLugar] = useState(proposal.lugar ?? "");
  const [selections, setSelections] = useState(
    Object.fromEntries(initialSelections.map((s) => [s.catalog_item_id, { ...s }]))
  );
  const [agreementRows, setAgreementRows] = useState(initialAgreementItems.map((a) => ({ ...a })));
  const [globalPct, setGlobalPct] = useState(Number(proposal.acuerdo_comercial_pct_global));
  const [scheduleRows, setScheduleRows] = useState(initialScheduleItems.map((s) => ({ ...s })));
  const [deletedScheduleIds, setDeletedScheduleIds] = useState<string[]>([]);
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

  function patchAgreement(id: string, patch: Partial<ProposalCommercialAgreement>) {
    setAgreementRows((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function patchSchedule(id: string, patch: Partial<ProposalScheduleItem>) {
    setScheduleRows((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addScheduleRow(week: number) {
    setScheduleRows((prev) => [
      ...prev,
      {
        id: tempId(),
        proposal_id: proposal.id,
        week_number: week,
        hito: "",
        comentario: null,
        sort_order: prev.length,
      },
    ]);
  }

  function removeScheduleRow(id: string) {
    setScheduleRows((prev) => prev.filter((s) => s.id !== id));
    if (!id.startsWith("new-")) setDeletedScheduleIds((prev) => [...prev, id]);
  }

  function removeMilestoneRow(id: string) {
    setMilestones((prev) => removeMilestone(prev, id));
    if (!id.startsWith("new-")) setDeletedMilestoneIds((prev) => [...prev, id]);
  }

  function addRequirement() {
    setRequirements((prev) => [
      ...prev,
      { id: tempId(), proposal_id: proposal.id, text: "", sort_order: prev.length },
    ]);
  }

  function removeRequirement(id: string) {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
    if (!id.startsWith("new-")) setDeletedRequirementIds((prev) => [...prev, id]);
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const existingSchedule = scheduleRows.filter((s) => !s.id.startsWith("new-"));
      const newSchedule = scheduleRows.filter((s) => s.id.startsWith("new-"));
      const existingMilestones = milestones.filter((m) => !m.id.startsWith("new-"));
      const newMilestones = milestones.filter((m) => m.id.startsWith("new-"));
      const existingRequirements = requirements.filter((r) => !r.id.startsWith("new-"));
      const newRequirements = requirements.filter((r) => r.id.startsWith("new-"));

      const result = await savePropuesta({
        proposalId: proposal.id,
        lugar,
        acuerdo_comercial_pct_global: globalPct,
        agreementItems: agreementRows.map((a) => ({ id: a.id, included: a.included, pct: Number(a.pct) })),
        scheduleItems: existingSchedule.map((s) => ({
          id: s.id,
          week_number: s.week_number,
          hito: s.hito,
          comentario: s.comentario,
        })),
        newScheduleItems: newSchedule.map((s) => ({
          id: s.id,
          week_number: s.week_number,
          hito: s.hito,
          comentario: s.comentario,
        })),
        deletedScheduleItemIds: deletedScheduleIds,
        catalogSelections: Object.values(selections).map((s) => ({ id: s.id, included: s.included })),
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
      });
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
    });
  }

  const componentesBasicos = catalogItems.filter((c) => c.category === "componente_basico");
  const logistica360 = catalogItems.filter((c) => c.category === "logistica_360");

  const weekNumbers = useMemo(() => {
    const set = new Set(scheduleRows.map((s) => s.week_number));
    return Array.from(set).sort((a, b) => a - b);
  }, [scheduleRows]);

  return (
    <div className="space-y-6">
      <div className="no-print flex justify-end">
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
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
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Ej. Centro de Convenciones..."
                className={`${inputClass} mt-0.5`}
              />
            </div>
            <Stat label="Ciudad" value={proposal.city ?? "—"} />
            <Stat label="Modalidad" value={modalityLabel[proposal.modality] ?? proposal.modality} />
            <Stat label="Aforo" value={String(proposal.aforo ?? "—")} />
            <Stat
              label="Fechas"
              value={
                proposal.event_start_date
                  ? `${proposal.event_start_date}${proposal.event_end_date ? ` a ${proposal.event_end_date}` : ""}`
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
                label: c.name,
                description: c.description,
                checked: selections[c.id]?.included ?? false,
                onToggle: () => toggleSelection(c.id),
              }))}
              emptyLabel="No hay componentes básicos definidos para esta modalidad."
            />
            <ChecklistBox
              title="Logística 360"
              color={BRAND.orange}
              items={logistica360.map((c) => ({
                key: c.id,
                label: c.name,
                description: c.description,
                checked: selections[c.id]?.included ?? false,
                onToggle: () => toggleSelection(c.id),
              }))}
              emptyLabel="No aplica logística presencial para esta modalidad."
            />
            <ChecklistBox
              title="Servicios personalizados"
              color={BRAND.blue}
              items={includedServices.map((s) => ({
                key: s.name,
                label: s.name,
                description: s.description,
                checked: true,
                readOnly: true,
              }))}
              emptyLabel="No se seleccionó ningún servicio personalizado en el Tarifario."
              footnote="Se eligen en el paso 1 (Tarifario)."
            />
          </div>
        </Slide>

        {/* Inversión */}
        <Slide kicker="Presupuesto" title="Inversión inicial" accent={BRAND.blue}>
          <HeroNumber
            label="Valor Propuesta Final (+ IVA)"
            value={formatCOP(tarifarioSummary.valorPropuestaFinal + tarifarioSummary.iva)}
            color={BRAND.blue}
            large
          />
        </Slide>

        {/* Acuerdo comercial */}
        <Slide
          kicker="Negociación"
          title="Acuerdo comercial — lo que podemos negociar"
          accent={BRAND.orange}
        >
          <div className="mb-5 flex items-center gap-4 rounded-xl p-4" style={{ backgroundColor: BRAND.lightGrey }}>
            <label className="text-sm font-semibold" style={{ color: BRAND.dark }}>
              % del acuerdo comercial (descuento real que se aplica)
            </label>
            <input
              type="number"
              min={0}
              max={100}
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
              color={BRAND.blue}
              large
            />
          </div>
        </Slide>

        {/* Modelo de pagos */}
        <Slide kicker="Condiciones" title="Modelo de pagos" accent={BRAND.teal}>
          <div className="space-y-2">
            {milestones.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3">
                <input
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

        {/* Cronograma — grilla horizontal por semana */}
        <Slide kicker="Plan de trabajo" title="Cronograma" accent={BRAND.orange}>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {weekNumbers.map((week) => (
              <div key={week} className="rounded-lg p-3" style={{ backgroundColor: BRAND.lightGrey }}>
                <p className="mb-2 text-center text-xs font-bold uppercase" style={{ color: BRAND.orange }}>
                  Semana {week}
                </p>
                <div className="space-y-2">
                  {scheduleRows
                    .filter((r) => r.week_number === week)
                    .map((row) => (
                      <div key={row.id} className="rounded bg-white p-1.5 shadow-sm">
                        <input
                          value={row.hito}
                          onChange={(e) => patchSchedule(row.id, { hito: e.target.value })}
                          placeholder="Hito"
                          className="w-full border-none bg-transparent text-xs outline-none"
                          style={{ color: BRAND.dark }}
                        />
                        {!isDownloading && (
                          <div className="mt-1 flex justify-end">
                            <button
                              onClick={() => removeScheduleRow(row.id)}
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
                      onClick={() => addScheduleRow(week)}
                      className="no-print w-full text-center text-[11px] font-medium underline"
                      style={{ color: BRAND.grey }}
                    >
                      + hito
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!isDownloading && (
              <button
                onClick={() => addScheduleRow((weekNumbers.at(-1) ?? 0) + 1)}
                className="no-print rounded-lg border-2 border-dashed p-3 text-xs font-medium"
                style={{ borderColor: BRAND.grey, color: BRAND.grey }}
              >
                + Semana
              </button>
            )}
          </div>
        </Slide>

        {/* Requerimientos operativos — lista de ítems, no un bloque de texto */}
        <Slide kicker="Logística" title="Requerimientos operativos" accent={BRAND.blue}>
          <ul className="space-y-2">
            {requirements.map((req) => (
              <li key={req.id} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: BRAND.blue }} />
                <input
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

      <div className="no-print flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="h-10 rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar propuesta"}
        </button>
        {message && (
          <span className={`text-sm ${message.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
            {message}
          </span>
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
  }[];
  emptyLabel: string;
  footnote?: string;
}) {
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
                checked={item.checked}
                disabled={item.readOnly}
                onChange={item.onToggle}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <div>
                <p className={item.checked ? "font-medium" : "text-neutral-400 line-through"} style={item.checked ? { color: BRAND.dark } : undefined}>
                  {item.label}
                </p>
                {item.description && item.checked && (
                  <p className="mt-0.5 whitespace-pre-line" style={{ color: BRAND.grey }}>
                    {item.description}
                  </p>
                )}
              </div>
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
