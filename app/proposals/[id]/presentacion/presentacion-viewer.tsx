"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { LabeledField } from "@/app/components/labeled-field";
import { callSafe, saveErrorMessage } from "@/lib/errors";
import type { DeckData } from "./deck-shell";
import { saveDatosPresentacion } from "./actions";
import { exo, poppins } from "@/lib/fonts";
import {
  CasosSlide,
  CifrasSlide,
  InformesSlide,
  OrganizadorSlide,
  PlataformaSlide,
  PreproduccionSlide,
} from "./slides-fixed";
import {
  AcuerdoSlide,
  CierreSlide,
  ComercialSlide,
  ComponentesSlide,
  CoverSlide,
  CronogramaSlide,
  FinalSlide,
  IncluyeSlide,
  InversionSlide,
  LogisticaSlide,
  PagosSlide,
  PerfilSlide,
  PresencialSlide,
  RequerimientosSlide,
  ServiciosSlide,
  chunkComponentesItems,
  chunkLogisticaItems,
  chunkServiciosItems,
  getCheckedComponentesItems,
  getCheckedLogisticaItems,
  getCheckedServiciosItems,
  hasAcuerdoComercial,
} from "./slides-app";

const PREVIEW_SCALE = 760 / 1920;

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

/**
 * Las láminas en orden, en un solo arreglo que reutilizan tanto la vista
 * previa como el área oculta que exporta el PDF — una sola fuente de
 * verdad. Acuerdo comercial se omite por completo (no solo se deja vacía)
 * cuando la propuesta no tiene ningún concepto incluido, y la numeración de
 * página se recalcula según cuántas láminas queden.
 */
/** Grupos de diapositiva que se pueden ocultar desde el panel — las que son
 * estructurales (portada, perfil, cierre) no se incluyen. */
export const HIDEABLE_SLIDE_GROUPS: { key: string; label: string }[] = [
  { key: "plataforma", label: "Quiénes somos" },
  { key: "cifras", label: "Cifras" },
  { key: "organizador", label: "Organizador" },
  { key: "presencial", label: "Presencial/Virtual" },
  { key: "incluye", label: "Lo que incluye tu evento" },
  { key: "componentes", label: "Componentes básicos" },
  { key: "logistica", label: "Logística 360" },
  { key: "servicios", label: "Servicios personalizados" },
  { key: "comercial", label: "Comercialización" },
  { key: "informes", label: "Informes y entregables" },
  { key: "acuerdo", label: "Acuerdo comercial" },
  { key: "inversion", label: "Inversión inicial" },
  { key: "final", label: "Presupuesto final" },
  { key: "pagos", label: "Modelo de pagos" },
  { key: "preproduccion", label: "Preproducción" },
  { key: "cronograma", label: "Cronograma" },
  { key: "requerimientos", label: "Requerimientos operativos" },
  { key: "casos", label: "Casos de éxito" },
];

function buildSlides(
  data: DeckData,
  hidden: string[],
  onEditImpactos?: (field: "registro" | "acreditacion", value: number | null) => void
) {
  type SlideFn = (p: { data: DeckData; page: number; total: number }) => JSX.Element;
  const isHidden = (group: string) => hidden.includes(group);
  const entries: { key: string; group: string; render: SlideFn }[] = [
    { key: "cover", group: "cover", render: (p) => <CoverSlide {...p} /> },
    { key: "plataforma", group: "plataforma", render: (p) => <PlataformaSlide page={p.page} total={p.total} /> },
    { key: "cifras", group: "cifras", render: (p) => <CifrasSlide page={p.page} total={p.total} /> },
    { key: "organizador", group: "organizador", render: (p) => <OrganizadorSlide page={p.page} total={p.total} /> },
    { key: "presencial", group: "presencial", render: (p) => <PresencialSlide {...p} /> },
    { key: "perfil", group: "perfil", render: (p) => <PerfilSlide {...p} /> },
    { key: "incluye", group: "incluye", render: (p) => <IncluyeSlide {...p} /> },
    ...chunkComponentesItems(getCheckedComponentesItems(data)).map((chunk, i, all) => ({
      key: `componentes-${i}`,
      group: "componentes",
      render: (p: Parameters<SlideFn>[0]) => (
        <ComponentesSlide
          items={chunk}
          chunkLabel={all.length > 1 ? `${i + 1}/${all.length}` : undefined}
          page={p.page}
          total={p.total}
        />
      ),
    })),
    ...chunkLogisticaItems(getCheckedLogisticaItems(data)).map((chunk, i, all) => ({
      key: `logistica-${i}`,
      group: "logistica",
      render: (p: Parameters<SlideFn>[0]) => (
        <LogisticaSlide
          items={chunk}
          chunkLabel={all.length > 1 ? `${i + 1}/${all.length}` : undefined}
          page={p.page}
          total={p.total}
        />
      ),
    })),
    ...chunkServiciosItems(getCheckedServiciosItems(data)).map((chunk, i, all) => ({
      key: `servicios-${i}`,
      group: "servicios",
      render: (p: Parameters<SlideFn>[0]) => (
        <ServiciosSlide
          items={chunk}
          chunkLabel={all.length > 1 ? `${i + 1}/${all.length}` : undefined}
          page={p.page}
          total={p.total}
        />
      ),
    })),
    {
      key: "comercial",
      group: "comercial",
      render: (p) => <ComercialSlide {...p} onEditImpactos={onEditImpactos} />,
    },
    { key: "informes", group: "informes", render: (p) => <InformesSlide page={p.page} total={p.total} /> },
    ...(hasAcuerdoComercial(data)
      ? [{ key: "acuerdo", group: "acuerdo", render: (p: Parameters<SlideFn>[0]) => <AcuerdoSlide {...p} /> }]
      : []),
    // "Inversión inicial" solo tiene sentido como contraste antes/después
    // cuando hay un % de acuerdo comercial que restar — si no hay acuerdo,
    // el valor ya se muestra completo en "Presupuesto final".
    ...(data.proposal.acuerdo_comercial_pct_global > 0
      ? [{ key: "inversion", group: "inversion", render: (p: Parameters<SlideFn>[0]) => <InversionSlide {...p} /> }]
      : []),
    { key: "final", group: "final", render: (p) => <FinalSlide {...p} /> },
    { key: "pagos", group: "pagos", render: (p) => <PagosSlide {...p} /> },
    {
      key: "preproduccion",
      group: "preproduccion",
      render: (p) => <PreproduccionSlide page={p.page} total={p.total} />,
    },
    { key: "cronograma", group: "cronograma", render: (p) => <CronogramaSlide {...p} /> },
    { key: "requerimientos", group: "requerimientos", render: (p) => <RequerimientosSlide {...p} /> },
    { key: "casos", group: "casos", render: (p) => <CasosSlide page={p.page} total={p.total} /> },
    { key: "cierre", group: "cierre", render: (p) => <CierreSlide {...p} /> },
  ];
  const visible = entries.filter((e) => !isHidden(e.group));
  const total = visible.length;
  return visible.map((e, i) => ({
    key: e.key,
    group: e.group,
    node: e.render({ data, page: i + 1, total }),
  }));
}

export function PresentacionViewer({ data: initialData }: { data: DeckData }) {
  const [contactName, setContactName] = useState(initialData.client?.contact_name ?? "");
  const [contactCargo, setContactCargo] = useState(initialData.client?.contact_cargo ?? "");
  const [impactosRegistro, setImpactosRegistro] = useState(
    initialData.proposal.impactos_registro != null ? String(initialData.proposal.impactos_registro) : ""
  );
  const [impactosAcreditacion, setImpactosAcreditacion] = useState(
    initialData.proposal.impactos_acreditacion != null ? String(initialData.proposal.impactos_acreditacion) : ""
  );
  const [hiddenSlides, setHiddenSlides] = useState<string[]>(initialData.proposal.presentacion_hidden_slides ?? []);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // La lámina se arma en vivo con lo ya guardado; estos campos solo cubren
  // los 3 datos que hoy no existen en ningún otro paso de la app (ver
  // docs/propuesta-deck/spec.json → known_issues).
  const data: DeckData = {
    ...initialData,
    client: initialData.client ? { ...initialData.client, contact_name: contactName, contact_cargo: contactCargo } : null,
    proposal: {
      ...initialData.proposal,
      impactos_registro: impactosRegistro === "" ? null : Number(impactosRegistro),
      impactos_acreditacion: impactosAcreditacion === "" ? null : Number(impactosAcreditacion),
    },
  };

  const pesoAcuerdo = data.agreementItems.filter((a) => a.included).reduce((sum, a) => sum + Number(a.pct), 0);
  const pesoInvalido = data.agreementItems.some((a) => a.included) && pesoAcuerdo !== 100;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await callSafe(() =>
        saveDatosPresentacion({
          proposalId: initialData.proposal.id,
          clientId: initialData.client?.id ?? null,
          contactName,
          contactCargo,
          impactosRegistro: impactosRegistro === "" ? null : Number(impactosRegistro),
          impactosAcreditacion: impactosAcreditacion === "" ? null : Number(impactosAcreditacion),
          hiddenSlides,
        })
      );
      setMessage(result.error ? saveErrorMessage(result.error) : "Guardado.");
    });
  }

  async function downloadPdf() {
    if (!printAreaRef.current) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }, { renderSlidesToPdf, SLIDE_PDF_FORMAT }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
        import("@/lib/pdf/slides"),
      ]);
      const slideEls = printAreaRef.current.querySelectorAll<HTMLElement>("[data-pdf-slide]");
      const pdf = new jsPDF({ unit: "mm", format: SLIDE_PDF_FORMAT, orientation: "landscape" });
      await renderSlidesToPdf(pdf, slideEls, html2canvas);
      pdf.save(`Presentacion - ${initialData.proposal.event_name}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  function onEditImpactos(field: "registro" | "acreditacion", value: number | null) {
    if (field === "registro") setImpactosRegistro(value === null ? "" : String(value));
    else setImpactosAcreditacion(value === null ? "" : String(value));
  }

  function toggleHiddenSlide(group: string) {
    setHiddenSlides((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  return (
    <div className={`${exo.variable} ${poppins.variable} space-y-6`}>
      <section className="no-print rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Datos pendientes de la presentación</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Estos datos no existen todavía en ningún otro paso de la app — complétalos aquí para que no salgan
          como [Por definir]. Los demás datos (impacto inicial, etc.) ya se editan directo en su propia
          lámina, más abajo. Los datos del asesor comercial salen de{" "}
          <Link href="/perfil" className="underline">
            tu perfil
          </Link>
          .
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <LabeledField label="Nombre del contacto (cliente)">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
          </LabeledField>
          <LabeledField label="Cargo del contacto">
            <input value={contactCargo} onChange={(e) => setContactCargo(e.target.value)} className={inputClass} />
          </LabeledField>
        </div>
        {pesoInvalido && (
          <p className="mt-3 text-xs text-amber-700">
            Los pesos del acuerdo comercial incluidos suman {pesoAcuerdo}%, no 100%. Corrígelo en Propuesta →
            Acuerdo comercial antes de enviar la presentación.
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" disabled={isPending} onClick={handleSave} className="btn btn-primary btn-sm">
            {isPending ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={isDownloading}
            className="btn btn-secondary btn-sm"
          >
            {isDownloading ? "Generando PDF..." : "Descargar presentación en PDF"}
          </button>
          {message && <span className="text-xs text-neutral-500">{message}</span>}
        </div>
      </section>

      <section className="no-print rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Diapositivas a incluir</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Desmarca las que no apliquen para esta propuesta — no se borra la información, solo se omiten al
          generar.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {HIDEABLE_SLIDE_GROUPS.map((g) => (
            <label key={g.key} className="flex items-center gap-2 text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={!hiddenSlides.includes(g.key)}
                onChange={() => toggleHiddenSlide(g.key)}
                className="h-4 w-4"
              />
              {g.label}
            </label>
          ))}
        </div>
      </section>

      <div className="no-print flex flex-col items-center gap-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        {buildSlides(data, hiddenSlides, onEditImpactos).map((slide) => {
          const hideable = HIDEABLE_SLIDE_GROUPS.some((g) => g.key === slide.group);
          return (
            <div
              key={slide.key}
              className="relative"
              style={{ width: 1920 * PREVIEW_SCALE, height: 1080 * PREVIEW_SCALE, overflow: "hidden" }}
            >
              <div className="h-full w-full rounded-lg border border-neutral-300 shadow-sm">
                <div
                  style={{ width: 1920, height: 1080, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}
                >
                  {slide.node}
                </div>
              </div>
              {hideable && (
                <button
                  type="button"
                  onClick={() => toggleHiddenSlide(slide.group)}
                  title="Ocultar esta diapositiva"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <EyeOffIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Área oculta a tamaño real (1920x1080 por lámina) — de acá sale el PDF (sin inputs editables). */}
      <div className="fixed left-[-9999px] top-0 -z-10">
        <div ref={printAreaRef}>{buildSlides(data, hiddenSlides).map((s) => <div key={s.key}>{s.node}</div>)}</div>
      </div>
    </div>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
