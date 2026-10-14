"use client";

import { useRef, useState, useTransition } from "react";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { LabeledField } from "@/app/components/labeled-field";
import { MobileSaveBar, SaveStatus, useUnsavedChanges } from "@/app/components/ui-guard";
import { callSafe, saveErrorMessage } from "@/lib/errors";
import type { InformeFinal } from "@/lib/types";
import { saveInformeNotas, generarAnalisisInforme, type InformeNotas } from "./actions";

export interface InformeKpis {
  actividades: { total: number; completadas: number; enCurso: number; pendientes: number; vencidas: number };
  presupuesto: { totalProyectado: number; totalAjustado: number };
  viaticos: { totalGirado: number };
  legalizacion: {
    totalSoportes: number;
    diferencia: number;
    personasCerradas: number;
    totalPersonas: number;
  };
  cuentasCobro: { total: number; firmadas: number };
}

interface Props {
  proposalId: string;
  eventName: string;
  eventCity: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  kpis: InformeKpis;
  initialInforme: InformeFinal | null;
}

const textareaClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

export function InformeEditor({
  proposalId,
  eventName,
  eventCity,
  eventStartDate,
  eventEndDate,
  kpis,
  initialInforme,
}: Props) {
  const [notasActividades, setNotasActividades] = useState(initialInforme?.notas_actividades ?? "");
  const [notasViaticos, setNotasViaticos] = useState(initialInforme?.notas_viaticos ?? "");
  const [notasPresupuesto, setNotasPresupuesto] = useState(initialInforme?.notas_presupuesto ?? "");
  const [notasGenerales, setNotasGenerales] = useState(initialInforme?.notas_generales ?? "");
  const [analisisIa, setAnalisisIa] = useState(initialInforme?.analisis_ia ?? "");
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const { dirty, resetTo } = useUnsavedChanges({
    notasActividades,
    notasViaticos,
    notasPresupuesto,
    notasGenerales,
    analisisIa,
  });

  function currentNotas(): InformeNotas {
    return { notasActividades, notasViaticos, notasPresupuesto, notasGenerales, analisisIa };
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await callSafe(() => saveInformeNotas(proposalId, currentNotas()));
      if (result.error) {
        setMessage(saveErrorMessage(result.error));
        return;
      }
      setMessage("Guardado.");
      resetTo(currentNotas());
    });
  }

  function handleGenerar() {
    setMessage(null);
    setIsGenerating(true);
    startTransition(async () => {
      try {
        const result = await generarAnalisisInforme(
          proposalId,
          { notasActividades, notasViaticos, notasPresupuesto, notasGenerales },
          eventName,
          eventCity,
          eventStartDate,
          eventEndDate,
          kpis
        );
        if (result.error || !result.analisis) {
          setMessage(saveErrorMessage(result.error ?? "No se pudo generar el análisis."));
          return;
        }
        setAnalisisIa(result.analisis);
        setMessage("Análisis generado y guardado.");
        resetTo({
          notasActividades,
          notasViaticos,
          notasPresupuesto,
          notasGenerales,
          analisisIa: result.analisis,
        });
      } catch (e) {
        setMessage(saveErrorMessage(e));
      } finally {
        setIsGenerating(false);
      }
    });
  }

  async function downloadPdf() {
    if (!printAreaRef.current) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }, { addElementsAsPdfPages }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
        import("@/lib/pdf/paginate"),
      ]);

      const pageEls = printAreaRef.current.querySelectorAll<HTMLElement>("[data-pdf-page]");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      await addElementsAsPdfPages(pdf, pageEls, html2canvas);

      pdf.save(`Informe-Final-${proposalId}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  const a = kpis.actividades;
  const p = kpis.presupuesto;
  const v = kpis.viaticos;
  const l = kpis.legalizacion;
  const c = kpis.cuentasCobro;
  const avancePct = a.total > 0 ? Math.round((a.completadas / a.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Resumen del evento</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-neutral-500">Actividades</p>
              <p className="text-lg font-semibold text-neutral-900">{avancePct}%</p>
              <p className="text-[11px] text-neutral-500">
                {a.completadas}/{a.total} completadas
                {a.vencidas > 0 && <span className="text-red-600"> · {a.vencidas} vencidas</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Presupuesto ajustado</p>
              <p className="text-lg font-semibold text-neutral-900">{formatCOP(p.totalAjustado)}</p>
              <p className="text-[11px] text-neutral-500">proyectado {formatCOP(p.totalProyectado)}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Girado a staff</p>
              <p className="text-lg font-semibold text-neutral-900">{formatCOP(v.totalGirado)}</p>
              <p className="text-[11px] text-neutral-500">
                diferencia{" "}
                <span className={l.diferencia >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {formatCOP(l.diferencia)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Cuentas de cobro</p>
              <p className="text-lg font-semibold text-neutral-900">
                {c.firmadas}/{c.total}
              </p>
              <p className="text-[11px] text-neutral-500">firmadas</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Situaciones y detalles</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Cuéntame las novedades de cada área — la IA las cruza con las cifras de arriba para
            redactar el análisis del informe final.
          </p>
          <div className="mt-4 space-y-4">
            <LabeledField label="Novedades de actividades">
              <textarea
                rows={3}
                value={notasActividades}
                onChange={(e) => setNotasActividades(e.target.value)}
                className={textareaClass}
                placeholder="Ej: la instalación de escenario se atrasó un día por lluvia, pero se recuperó el tiempo..."
              />
            </LabeledField>
            <LabeledField label="Novedades de viáticos / legalización">
              <textarea
                rows={3}
                value={notasViaticos}
                onChange={(e) => setNotasViaticos(e.target.value)}
                className={textareaClass}
                placeholder="Ej: faltan soportes de 2 personas, un anticipo se giró de más..."
              />
            </LabeledField>
            <LabeledField label="Novedades de presupuesto">
              <textarea
                rows={3}
                value={notasPresupuesto}
                onChange={(e) => setNotasPresupuesto(e.target.value)}
                className={textareaClass}
                placeholder="Ej: se tuvo que contratar transporte adicional no presupuestado..."
              />
            </LabeledField>
            <LabeledField label="Notas generales del evento">
              <textarea
                rows={3}
                value={notasGenerales}
                onChange={(e) => setNotasGenerales(e.target.value)}
                className={textareaClass}
                placeholder="Ej: buena asistencia, cliente satisfecho, incidente menor con..."
              />
            </LabeledField>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">Análisis para el informe</h3>
            <button
              type="button"
              onClick={handleGenerar}
              disabled={isGenerating}
              className="btn btn-secondary btn-sm shrink-0"
            >
              {isGenerating ? "Generando..." : analisisIa ? "Regenerar con IA" : "Generar análisis con IA"}
            </button>
          </div>
          {analisisIa ? (
            <textarea
              rows={10}
              value={analisisIa}
              onChange={(e) => setAnalisisIa(e.target.value)}
              className={textareaClass}
            />
          ) : (
            <p className="text-sm text-neutral-400">
              Todavía no hay análisis generado. Completa las notas de arriba y pulsa &ldquo;Generar
              análisis con IA&rdquo;. El texto que genere queda editable por si quieres ajustarlo.
            </p>
          )}
        </section>
      </div>

      <MobileSaveBar dirty={dirty} isPending={isPending} message={message} onSave={handleSave} />
      <div className="lg:col-span-1">
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-6">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Cierre de producción</h3>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={isDownloading || !analisisIa}
            title={!analisisIa ? "Genera el análisis antes de descargar el informe" : undefined}
            className="btn btn-secondary mt-2 w-full"
          >
            {isDownloading ? "Generando PDF..." : "Descargar informe en PDF"}
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

      {/* Área imprimible oculta — el informe final de una sola hoja (o varias
          si el análisis es largo), con el resumen de cifras y el análisis. */}
      <div className="fixed left-[-9999px] top-0 -z-10">
        <div ref={printAreaRef} className="w-[700px] bg-white text-black">
          <div data-pdf-page className="border border-neutral-800 p-6">
            <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-3">
              <span className="text-base font-extrabold tracking-tight text-emerald-700">ticketcode</span>
              <span className="text-sm font-bold uppercase">Informe final de producción</span>
            </div>

            <table className="mt-3 w-full border border-neutral-800 text-xs">
              <tbody>
                <tr className="border-b border-neutral-800 bg-neutral-100">
                  <th className="w-1/2 border-r border-neutral-800 py-1.5 font-semibold">Evento</th>
                  <th className="w-1/2 py-1.5 font-semibold">Ciudad</th>
                </tr>
                <tr className="border-b border-neutral-800 text-center">
                  <td className="border-r border-neutral-800 py-1.5">{eventName || "—"}</td>
                  <td className="py-1.5">{eventCity || "—"}</td>
                </tr>
                <tr className="border-b border-neutral-800 bg-neutral-100">
                  <th className="border-r border-neutral-800 py-1.5 font-semibold">Fecha inicio</th>
                  <th className="py-1.5 font-semibold">Fecha fin</th>
                </tr>
                <tr className="text-center">
                  <td className="border-r border-neutral-800 py-1.5">
                    {eventStartDate ? formatFechaCorta(eventStartDate) : "—"}
                  </td>
                  <td className="py-1.5">{eventEndDate ? formatFechaCorta(eventEndDate) : "—"}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4">
              <h2 className="border-b-2 border-neutral-800 pb-1 text-xs font-bold uppercase">
                Cifras clave
              </h2>
              <table className="mt-1 w-full text-xs">
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Actividades completadas</td>
                    <td className="py-1 text-right font-medium">
                      {a.completadas} / {a.total} ({avancePct}%)
                    </td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Actividades vencidas sin completar</td>
                    <td className="py-1 text-right font-medium">{a.vencidas}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Presupuesto proyectado inicial</td>
                    <td className="py-1 text-right font-medium">{formatCOP(p.totalProyectado)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Presupuesto ajustado final</td>
                    <td className="py-1 text-right font-medium">{formatCOP(p.totalAjustado)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Total girado a staff (viáticos)</td>
                    <td className="py-1 text-right font-medium">{formatCOP(v.totalGirado)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Total soportado (legalización)</td>
                    <td className="py-1 text-right font-medium">{formatCOP(l.totalSoportes)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">
                      Diferencia ({l.diferencia >= 0 ? "a favor de la empresa" : "a reembolsar"})
                    </td>
                    <td className="py-1 text-right font-medium">{formatCOP(l.diferencia)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1 pr-2">Legalizaciones cerradas</td>
                    <td className="py-1 text-right font-medium">
                      {l.personasCerradas} / {l.totalPersonas}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2">Cuentas de cobro firmadas</td>
                    <td className="py-1 text-right font-medium">
                      {c.firmadas} / {c.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <h2 className="border-b-2 border-neutral-800 pb-1 text-xs font-bold uppercase">
                Análisis
              </h2>
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">{analisisIa}</p>
            </div>

            <table className="mt-4 w-full border border-neutral-800 text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border-r border-b border-neutral-800 py-1.5"></th>
                  <th className="border-r border-b border-neutral-800 py-1.5 font-semibold">Firma</th>
                  <th className="border-b border-neutral-800 py-1.5 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="border-r border-neutral-800 py-6 text-left font-semibold">
                    Aprobado por
                  </th>
                  <td className="border-r border-neutral-800"></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
