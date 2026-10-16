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
  chunkComponentesItems,
  chunkLogisticaItems,
  getCheckedComponentesItems,
  getCheckedLogisticaItems,
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
function buildSlides(data: DeckData) {
  type SlideFn = (p: { data: DeckData; page: number; total: number }) => JSX.Element;
  const entries: { key: string; render: SlideFn }[] = [
    { key: "cover", render: (p) => <CoverSlide {...p} /> },
    { key: "plataforma", render: (p) => <PlataformaSlide page={p.page} total={p.total} /> },
    { key: "cifras", render: (p) => <CifrasSlide page={p.page} total={p.total} /> },
    { key: "organizador", render: (p) => <OrganizadorSlide page={p.page} total={p.total} /> },
    { key: "presencial", render: (p) => <PresencialSlide {...p} /> },
    { key: "perfil", render: (p) => <PerfilSlide {...p} /> },
    { key: "incluye", render: (p) => <IncluyeSlide {...p} /> },
    ...chunkComponentesItems(getCheckedComponentesItems(data)).map((chunk, i, all) => ({
      key: `componentes-${i}`,
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
      render: (p: Parameters<SlideFn>[0]) => (
        <LogisticaSlide
          items={chunk}
          chunkLabel={all.length > 1 ? `${i + 1}/${all.length}` : undefined}
          page={p.page}
          total={p.total}
        />
      ),
    })),
    { key: "comercial", render: (p) => <ComercialSlide {...p} /> },
    { key: "informes", render: (p) => <InformesSlide page={p.page} total={p.total} /> },
    ...(hasAcuerdoComercial(data) ? [{ key: "acuerdo", render: (p: Parameters<SlideFn>[0]) => <AcuerdoSlide {...p} /> }] : []),
    { key: "inversion", render: (p) => <InversionSlide {...p} /> },
    { key: "final", render: (p) => <FinalSlide {...p} /> },
    { key: "pagos", render: (p) => <PagosSlide {...p} /> },
    { key: "cronograma", render: (p) => <CronogramaSlide {...p} /> },
    { key: "requerimientos", render: (p) => <RequerimientosSlide {...p} /> },
    { key: "casos", render: (p) => <CasosSlide page={p.page} total={p.total} /> },
    { key: "cierre", render: (p) => <CierreSlide {...p} /> },
  ];
  const total = entries.length;
  return entries.map((e, i) => (
    <div key={e.key}>{e.render({ data, page: i + 1, total })}</div>
  ));
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

  return (
    <div className={`${exo.variable} ${poppins.variable} space-y-6`}>
      <section className="no-print rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Datos pendientes de la presentación</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Estos 3 datos no existen todavía en ningún otro paso de la app — complétalos aquí para que no
          salgan como [Por definir]. Los datos del asesor comercial salen de{" "}
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
          <LabeledField label="Impactos de marca — Registro">
            <input
              type="number"
              min={0}
              value={impactosRegistro}
              onChange={(e) => setImpactosRegistro(e.target.value)}
              className={inputClass}
            />
          </LabeledField>
          <LabeledField label="Impactos de marca — Acreditación">
            <input
              type="number"
              min={0}
              value={impactosAcreditacion}
              onChange={(e) => setImpactosAcreditacion(e.target.value)}
              className={inputClass}
            />
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

      <div className="no-print flex flex-col items-center gap-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        {buildSlides(data).map((slide, i) => (
          <div
            key={i}
            style={{ width: 1920 * PREVIEW_SCALE, height: 1080 * PREVIEW_SCALE, overflow: "hidden" }}
            className="rounded-lg border border-neutral-300 shadow-sm"
          >
            <div style={{ width: 1920, height: 1080, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
              {slide}
            </div>
          </div>
        ))}
      </div>

      {/* Área oculta a tamaño real (1920x1080 por lámina) — de acá sale el PDF. */}
      <div className="fixed left-[-9999px] top-0 -z-10">
        <div ref={printAreaRef}>{buildSlides(data)}</div>
      </div>
    </div>
  );
}
