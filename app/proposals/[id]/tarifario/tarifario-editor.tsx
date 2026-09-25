"use client";

import { useMemo, useState, useTransition } from "react";
import type { Modality, Proposal, ProposalCostItem } from "@/lib/types";
import type {
  AforoScaleRow,
  LogisticsLineItem,
  LogisticsRates,
  QuantityTier,
} from "@/lib/pricing/logistics";
import { staffingForAforo, logisticosPorSalon, totalLogisticosSalones } from "@/lib/pricing/logistics";
import { computeTarifarioSummary, formatCOP } from "@/lib/pricing/summary";
import { saveTarifario, type SaveTarifarioPayload } from "./actions";

interface Props {
  proposal: Proposal;
  serviceItems: ProposalCostItem[];
  logisticsRates: LogisticsRates;
  honorariosProductorScale: QuantityTier[];
  aforoScales: AforoScaleRow[];
}

type ServiceRow = Pick<ProposalCostItem, "id" | "included" | "quantity" | "unit_cost">;
type EventFields = SaveTarifarioPayload["eventFields"];

function toServiceRow(item: ProposalCostItem): ServiceRow {
  return {
    id: item.id,
    included: item.included,
    quantity: Number(item.quantity),
    unit_cost: Number(item.unit_cost),
  };
}

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
const cellInput =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
const labelClass = "text-xs font-medium text-neutral-500";

const SALONES_INTERNOS_SERVICE_LABEL =
  "Módulo para obtención de datos en diferentes sitios simultáneos";
const PREACREDITACION_SERVICE_LABEL = "Pre acreditación";

export function TarifarioEditor({
  proposal,
  serviceItems,
  logisticsRates,
  honorariosProductorScale,
  aforoScales,
}: Props) {
  const [eventFields, setEventFields] = useState<EventFields>({
    modality: proposal.modality,
    city: proposal.city ?? "",
    dias: Number(proposal.dias),
    aforo: Number(proposal.aforo ?? 0),
    aforo_virtual: Number(proposal.aforo_virtual),
    tasa_conversion_pct: Number(proposal.tasa_conversion_pct),
    rentabilidad_pct: Number(proposal.rentabilidad_pct),
    comision_director_pct: Number(proposal.comision_director_pct),
    comision_asesor_pct: Number(proposal.comision_asesor_pct),
    visita_preoperativa_dias: Number(proposal.visita_preoperativa_dias),
    qty_logistico: Number(proposal.qty_logistico),
    qty_supervisor: Number(proposal.qty_supervisor),
    qty_logistica_salones_internos: Number(proposal.qty_logistica_salones_internos),
    qty_productor: Number(proposal.qty_productor),
    qty_transporte_aeropuerto: Number(proposal.qty_transporte_aeropuerto),
    qty_computadores: Number(proposal.qty_computadores),
    qty_impresoras: Number(proposal.qty_impresoras),
    qty_rollos_labels: Number(proposal.qty_rollos_labels),
    extra_camisetas_staff: proposal.extra_camisetas_staff,
    extra_lavado_chalecos: proposal.extra_lavado_chalecos,
    extra_compra_agua: proposal.extra_compra_agua,
    extra_compra_bloqueador_solar: proposal.extra_compra_bloqueador_solar,
    extra_actividad_cierre: proposal.extra_actividad_cierre,
  });

  const [serviceRows, setServiceRows] = useState<Record<string, ServiceRow>>(() =>
    Object.fromEntries(serviceItems.map((i) => [i.id, toServiceRow(i)]))
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [salonesAforos, setSalonesAforos] = useState<number[]>(
    () => proposal.salones_internos_aforos ?? []
  );
  const [logisticsOverrides, setLogisticsOverrides] = useState<
    Record<string, { dias?: number; quantity?: number }>
  >(() => proposal.logistics_overrides ?? {});

  function setOverride(label: string, field: "dias" | "quantity", value: number | null) {
    setLogisticsOverrides((prev) => {
      const next = { ...prev };
      const current = { ...next[label] };
      if (value === null) {
        delete current[field];
      } else {
        current[field] = value;
      }
      if (current.dias === undefined && current.quantity === undefined) {
        delete next[label];
      } else {
        next[label] = current;
      }
      return next;
    });
  }

  function patchEvent<K extends keyof EventFields>(key: K, value: EventFields[K]) {
    setEventFields((prev) => ({ ...prev, [key]: value }));
  }

  function recalcularSegunAforo() {
    const staffing = staffingForAforo(eventFields.aforo, aforoScales);
    if (!staffing) return;
    setEventFields((prev) => ({
      ...prev,
      qty_logistico: staffing.logistico,
      qty_supervisor: staffing.supervisor,
      qty_productor: staffing.productor,
      qty_computadores: staffing.computadores,
      qty_impresoras: staffing.impresoras,
      qty_rollos_labels: staffing.rollos_labels,
    }));
  }

  function patchService(id: string, patch: Partial<ServiceRow>) {
    setServiceRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    // "Módulo para obtención de datos en diferentes sitios simultáneos": la
    // cantidad define CUÁNTOS salones internos se habilitan, pero cada uno
    // tiene su propio aforo y por lo tanto su propia dotación de logísticos
    // (0-100 → 1, 100-400 → 2, 400-800 → 3, >800 → 4). El arreglo
    // `salonesAforos` se redimensiona según la cantidad.
    const item = serviceItems.find((i) => i.id === id);
    if (item?.label === SALONES_INTERNOS_SERVICE_LABEL) {
      if (patch.quantity !== undefined) {
        const n = Math.max(0, Math.round(patch.quantity));
        setSalonesAforos((prev) => {
          const next = prev.slice(0, n);
          while (next.length < n) next.push(100);
          return next;
        });
      }
      if (patch.included === false) {
        setSalonesAforos([]);
      }
    }
  }

  function updateSalonAforo(index: number, aforo: number) {
    setSalonesAforos((prev) => prev.map((a, i) => (i === index ? aforo : a)));
  }

  // "Pre acreditación" (servicio #25) define cuántos días operativos extra
  // se suman para TODO el equipo (honorarios, alimentación, transporte
  // completos) — sin reemplazar la Visita preoperativa (que sigue siendo
  // solo el día(s) de viaje del staff, independiente y editable).
  const preacreditacionItem = serviceItems.find((i) => i.label === PREACREDITACION_SERVICE_LABEL);
  const preacreditacionDias =
    preacreditacionItem && serviceRows[preacreditacionItem.id]?.included
      ? serviceRows[preacreditacionItem.id].quantity
      : 0;

  const qtyLogisticaSalonesInternos = useMemo(
    () => totalLogisticosSalones(salonesAforos),
    [salonesAforos]
  );

  const proposalForSummary: Proposal = useMemo(
    () => ({
      ...proposal,
      ...eventFields,
      dias: eventFields.dias + preacreditacionDias,
      qty_logistica_salones_internos: qtyLogisticaSalonesInternos,
      logistics_overrides: logisticsOverrides,
    }),
    [proposal, eventFields, preacreditacionDias, qtyLogisticaSalonesInternos, logisticsOverrides]
  );
  const serviceItemsForSummary = useMemo(
    () =>
      serviceItems.map((item) => ({
        ...item,
        included: serviceRows[item.id].included,
        quantity: serviceRows[item.id].quantity,
        unit_cost: serviceRows[item.id].unit_cost,
      })),
    [serviceItems, serviceRows]
  );
  const summary = useMemo(
    () =>
      computeTarifarioSummary(
        proposalForSummary,
        logisticsRates,
        serviceItemsForSummary,
        honorariosProductorScale
      ),
    [proposalForSummary, logisticsRates, serviceItemsForSummary, honorariosProductorScale]
  );

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTarifario({
        proposalId: proposal.id,
        eventFields,
        serviceItems: Object.values(serviceRows),
        salonesInternosAforos: salonesAforos,
        logisticsOverrides,
      });
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
    });
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        {/* Datos del evento */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Datos del evento</h3>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Field label="Modalidad">
              <select
                className={inputClass}
                value={eventFields.modality}
                onChange={(e) => patchEvent("modality", e.target.value as Modality)}
              >
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="hibrido">Híbrido</option>
                <option value="mundo_virtual">Mundo virtual</option>
              </select>
            </Field>
            <Field label="Ciudad">
              <input
                className={inputClass}
                value={eventFields.city}
                onChange={(e) => patchEvent("city", e.target.value)}
              />
            </Field>
            <Field label="Días">
              <NumberInput
                value={eventFields.dias}
                onChange={(v) => patchEvent("dias", v)}
              />
            </Field>
            <Field label="Aforo presencial">
              <NumberInput
                value={eventFields.aforo}
                onChange={(v) => patchEvent("aforo", v)}
              />
            </Field>
            <Field label="Aforo virtual">
              <NumberInput
                value={eventFields.aforo_virtual}
                onChange={(v) => patchEvent("aforo_virtual", v)}
              />
            </Field>
            <Field label="Tasa de conversión de asistencia">
              <PctInput
                value={eventFields.tasa_conversion_pct}
                onChange={(v) => patchEvent("tasa_conversion_pct", v)}
              />
            </Field>
            <Field label="Rentabilidad del evento">
              <PctInput
                value={eventFields.rentabilidad_pct}
                onChange={(v) => patchEvent("rentabilidad_pct", v)}
              />
            </Field>
            <Field label="Comisión Director Comercial">
              <PctInput
                value={eventFields.comision_director_pct}
                onChange={(v) => patchEvent("comision_director_pct", v)}
              />
            </Field>
            <Field label="Comisión Asesor Comercial">
              <PctInput
                value={eventFields.comision_asesor_pct}
                onChange={(v) => patchEvent("comision_asesor_pct", v)}
              />
            </Field>
          </div>
        </section>

        {/* Logística 360 — calculada, no se marca ítem por ítem */}
        <section className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-neutral-900">Logística 360</h3>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                showAdvanced
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {showAdvanced ? "Ocultar dotación y cantidades" : "Ajustar dotación y cantidades"}
            </button>
          </div>

          {showAdvanced && (
            <div className="border-b border-neutral-100 bg-neutral-50 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  Dotación por defecto según el aforo — editable por evento.
                </p>
                <button
                  type="button"
                  onClick={recalcularSegunAforo}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Recalcular según aforo ({eventFields.aforo})
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Field label="Visita preoperativa (días)">
                  <NumberInput
                    value={eventFields.visita_preoperativa_dias}
                    onChange={(v) => patchEvent("visita_preoperativa_dias", v)}
                  />
                </Field>
                <Field label="Logísticos">
                  <NumberInput
                    value={eventFields.qty_logistico}
                    onChange={(v) => patchEvent("qty_logistico", v)}
                  />
                </Field>
                <Field label="Supervisores">
                  <NumberInput
                    value={eventFields.qty_supervisor}
                    onChange={(v) => patchEvent("qty_supervisor", v)}
                  />
                </Field>
                <Field label="Logística salones internos (suma según aforo de cada salón, ver Servicios)">
                  <input
                    type="number"
                    value={qtyLogisticaSalonesInternos}
                    disabled
                    className={`${inputClass} bg-neutral-50 text-neutral-500`}
                  />
                </Field>
                <Field label="Productores">
                  <NumberInput
                    value={eventFields.qty_productor}
                    onChange={(v) => patchEvent("qty_productor", v)}
                  />
                </Field>
                <Field label="Computadores">
                  <NumberInput
                    value={eventFields.qty_computadores}
                    onChange={(v) => patchEvent("qty_computadores", v)}
                  />
                </Field>
                <Field label="Impresoras">
                  <NumberInput
                    value={eventFields.qty_impresoras}
                    onChange={(v) => patchEvent("qty_impresoras", v)}
                  />
                </Field>
                <Field label="Rollos / Labels">
                  <NumberInput
                    value={eventFields.qty_rollos_labels}
                    onChange={(v) => patchEvent("qty_rollos_labels", v)}
                  />
                </Field>
              </div>

              <p className="mb-2 mt-5 text-xs text-neutral-500">Extras (Costos Varios)</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-neutral-700">
                <CheckboxField
                  label="Camisetas para Staff"
                  checked={eventFields.extra_camisetas_staff}
                  onChange={(v) => patchEvent("extra_camisetas_staff", v)}
                />
                <CheckboxField
                  label="Lavado de chalecos"
                  checked={eventFields.extra_lavado_chalecos}
                  onChange={(v) => patchEvent("extra_lavado_chalecos", v)}
                />
                <CheckboxField
                  label="Compra de Agua"
                  checked={eventFields.extra_compra_agua}
                  onChange={(v) => patchEvent("extra_compra_agua", v)}
                />
                <CheckboxField
                  label="Compra de bloqueador Solar"
                  checked={eventFields.extra_compra_bloqueador_solar}
                  onChange={(v) => patchEvent("extra_compra_bloqueador_solar", v)}
                />
                <CheckboxField
                  label="Actividad de cierre"
                  checked={eventFields.extra_actividad_cierre}
                  onChange={(v) => patchEvent("extra_actividad_cierre", v)}
                />
              </div>
            </div>
          )}

          <div className="divide-y divide-neutral-100 px-5">
            <ExpandableCategory
              label="1. Honorarios"
              total={summary.logistica.honorarios}
              items={summary.logistica.lineItems.honorarios}
              overrides={logisticsOverrides}
              onOverride={setOverride}
            />
            <ExpandableCategory
              label="2. Alimentación y hotel"
              total={summary.logistica.alimentacionHotel}
              items={summary.logistica.lineItems.alimentacionHotel}
              overrides={logisticsOverrides}
              onOverride={setOverride}
            />
            <ExpandableCategory
              label="3. Transporte"
              total={summary.logistica.transporte}
              items={summary.logistica.lineItems.transporte}
              overrides={logisticsOverrides}
              onOverride={setOverride}
            />
            <ExpandableCategory
              label="4. Equipos"
              total={summary.logistica.equipos}
              items={summary.logistica.lineItems.equipos}
              overrides={logisticsOverrides}
              onOverride={setOverride}
            />
            <ExpandableCategory
              label="5. Costos Varios"
              total={summary.logistica.costosVarios}
              items={summary.logistica.lineItems.costosVarios}
              overrides={logisticsOverrides}
              onOverride={setOverride}
            />
            <SummaryLine
              label="Sub Total Costo Logística"
              value={formatCOP(summary.logistica.subTotalCostoLogistica)}
              bold
            />
            <SummaryLine
              label="Total Costo + Imprevistos (10%)"
              value={formatCOP(summary.logistica.totalCostoLogisticaConImprevistos)}
              bold
            />
          </div>
        </section>

        {/* Servicios personalizados — esto sí se elige ítem por ítem */}
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              2. Servicios personalizados de la plataforma
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="w-10 px-4 py-2"></th>
                <th className="px-2 py-2">Ítem</th>
                <th className="w-24 px-2 py-2">Cantidad</th>
                <th className="w-36 px-2 py-2">Valor unitario</th>
                <th className="w-36 px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {serviceItems.map((item) => {
                const row = serviceRows[item.id];
                const subtotal = row.included ? row.quantity * row.unit_cost : 0;
                const isSpecial =
                  item.label === PREACREDITACION_SERVICE_LABEL ||
                  item.label === SALONES_INTERNOS_SERVICE_LABEL;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-neutral-100 ${isSpecial ? "bg-amber-50" : ""}`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => patchService(item.id, { included: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-2 py-2 text-neutral-800">
                      {item.label}
                      {item.label === PREACREDITACION_SERVICE_LABEL && (
                        <p className="text-[11px] font-normal text-amber-700">
                          Cantidad = días operativos extra (todo el equipo) — se suman a los días
                          del evento en Logística 360, sin reemplazar la visita preoperativa.
                        </p>
                      )}
                      {item.label === SALONES_INTERNOS_SERVICE_LABEL && (
                        <p className="text-[11px] font-normal text-amber-700">
                          Cantidad = número de salones internos. Cada salón tiene su propio aforo y
                          su propia dotación de logísticos (0-100 → 1, 100-400 → 2, 400-800 → 3,
                          &gt;800 → 4 logísticos). Defínelos abajo.
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={row.quantity}
                        disabled={!row.included}
                        onChange={(e) =>
                          patchService(item.id, { quantity: Number(e.target.value) || 0 })
                        }
                        className={cellInput}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.unit_cost}
                        disabled={!row.included}
                        onChange={(e) =>
                          patchService(item.id, { unit_cost: Number(e.target.value) || 0 })
                        }
                        className={cellInput}
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-700">
                      {row.included ? formatCOP(subtotal) : "—"}
                    </td>
                  </tr>
                );
              })}
              {salonesAforos.length > 0 && (
                <tr className="border-t border-neutral-100 bg-amber-50">
                  <td className="px-4 py-2"></td>
                  <td colSpan={4} className="px-2 py-3">
                    <p className="mb-2 text-xs font-medium text-neutral-700">
                      Aforo por salón interno (define la dotación de logísticos de cada uno)
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {salonesAforos.map((aforo, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
                          <span className="text-xs text-neutral-500">Salón {i + 1}</span>
                          <input
                            type="number"
                            min={0}
                            value={aforo}
                            onChange={(e) => updateSalonAforo(i, Number(e.target.value) || 0)}
                            className="h-8 w-20 rounded border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                          />
                          <span className="text-xs text-neutral-400">
                            → {logisticosPorSalon(aforo)} logístico{logisticosPorSalon(aforo) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-medium text-neutral-700">
                      Total logísticos salones internos: {qtyLogisticaSalonesInternos}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="col-span-1">
        <div className="sticky top-6 space-y-2 rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Resumen</h3>
          <SummaryRow
            label="Total Costo Logística"
            value={formatCOP(summary.logistica.totalCostoLogisticaConImprevistos)}
          />
          <SummaryRow label="Subtotal Servicios" value={formatCOP(summary.subtotalServicios)} />
          <SummaryRow label="Total costo" value={formatCOP(summary.totalCosto)} bold />
          <div className="border-t border-neutral-100 pt-2" />
          <SummaryRow label="Rentabilidad ($)" value={formatCOP(summary.rentabilidad)} />
          <SummaryRow
            label="Valor Propuesta Inicial"
            value={formatCOP(summary.valorPropuestaInicial)}
            bold
          />
          <SummaryRow
            label="Costo Director Comercial"
            value={formatCOP(summary.costoDirectorComercial)}
          />
          <SummaryRow label="Costo Asesor Comercial" value={formatCOP(summary.costoAsesorComercial)} />
          <SummaryRow label="Valor Propuesta Final" value={formatCOP(summary.valorPropuestaFinal)} bold />
          <SummaryRow label="+ IVA (19%)" value={formatCOP(summary.iva)} />

          <button
            onClick={handleSave}
            disabled={isPending}
            className="mt-3 h-10 w-full rounded-md bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar tarifario"}
          </button>
          {message && (
            <p className={`text-sm ${message.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      step="0.5"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className={inputClass}
    />
  );
}

/** Se edita como porcentaje entero (45), se guarda como fracción (0.45). */
function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        max={100}
        step="1"
        value={Math.round(value * 100 * 100) / 100}
        onChange={(e) => onChange((Number(e.target.value) || 0) / 100)}
        className={`${inputClass} pr-6`}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
        %
      </span>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

function ExpandableCategory({
  label,
  total,
  items,
  overrides,
  onOverride,
}: {
  label: string;
  total: number;
  items: LogisticsLineItem[];
  overrides: Record<string, { dias?: number; quantity?: number }>;
  onOverride: (label: string, field: "dias" | "quantity", value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm text-neutral-600 hover:text-neutral-900"
      >
        <span className="flex items-center gap-1.5">
          <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          {label}
        </span>
        <span>{formatCOP(total)}</span>
      </button>
      {open && (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-neutral-400">
              <th className="pb-1 pl-5 text-left font-medium">Concepto</th>
              <th className="w-16 pb-1 text-right font-medium">Días</th>
              <th className="w-16 pb-1 text-right font-medium">Cantidad</th>
              <th className="w-24 pb-1 text-right font-medium">Valor unitario</th>
              <th className="w-28 pb-1 pr-1 text-right font-medium">Total</th>
              <th className="w-8 pb-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <EditableItemRow
                key={idx}
                item={item}
                override={overrides[item.label]}
                onOverride={(field, value) => onOverride(item.label, field, value)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EditableItemRow({
  item,
  override,
  onOverride,
}: {
  item: LogisticsLineItem;
  override: { dias?: number; quantity?: number } | undefined;
  onOverride: (field: "dias" | "quantity", value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [diasText, setDiasText] = useState(() => String(item.dias));
  const [qtyText, setQtyText] = useState(() => String(item.quantity));
  const overridden = !!override;

  function startEditing() {
    setDiasText(String(item.dias));
    setQtyText(String(item.quantity));
    setEditing(true);
  }

  function confirm() {
    const dias = Number(diasText);
    const qty = Number(qtyText);
    onOverride("dias", Number.isFinite(dias) && dias !== item.dias ? dias : null);
    onOverride("quantity", Number.isFinite(qty) && qty !== item.quantity ? qty : null);
    setEditing(false);
  }

  return (
    <tr className={`border-t border-neutral-100 ${editing ? "bg-amber-50" : ""}`}>
      <td className="py-1.5 pl-5 text-neutral-700">
        {item.label}
        <p className="text-[10px] text-neutral-400">{item.basis}</p>
      </td>
      <td className="py-1.5 text-right">
        {editing ? (
          <input
            autoFocus
            type="number"
            value={diasText}
            onChange={(e) => setDiasText(e.target.value)}
            className="h-7 w-14 rounded-md border border-neutral-300 px-1 text-right text-xs outline-none focus:border-neutral-900"
          />
        ) : (
          <span className={override?.dias !== undefined ? "font-medium text-amber-700" : "text-neutral-500"}>
            {item.dias}
          </span>
        )}
      </td>
      <td className="py-1.5 text-right">
        {editing ? (
          <input
            type="number"
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value)}
            className="h-7 w-14 rounded-md border border-neutral-300 px-1 text-right text-xs outline-none focus:border-neutral-900"
          />
        ) : (
          <span
            className={override?.quantity !== undefined ? "font-medium text-amber-700" : "text-neutral-500"}
          >
            {item.quantity}
          </span>
        )}
      </td>
      <td className="py-1.5 text-right text-neutral-500">{formatCOP(item.rate)}</td>
      <td
        className={`py-1.5 pr-1 text-right font-medium ${
          overridden ? "text-amber-700" : "text-neutral-700"
        }`}
        title={overridden ? "Incluye días y/o cantidad forzados a mano" : undefined}
      >
        {formatCOP(item.subtotal)}
      </td>
      <td className="py-1.5 text-right">
        {editing ? (
          <span className="inline-flex items-center gap-1">
            <button type="button" title="Guardar" onClick={confirm} className="text-emerald-600 hover:text-emerald-800">
              ✓
            </button>
            <button
              type="button"
              title="Cancelar"
              onClick={() => setEditing(false)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              ✕
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              title="Editar días/cantidad de este rubro"
              onClick={startEditing}
              className="text-neutral-400 hover:text-neutral-900"
            >
              ✎
            </button>
            {overridden && (
              <button
                type="button"
                title="Volver al cálculo automático"
                onClick={() => {
                  onOverride("dias", null);
                  onOverride("quantity", null);
                }}
                className="text-neutral-300 hover:text-red-600"
              >
                ↺
              </button>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

function SummaryLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-2 text-sm ${bold ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
