"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { LabeledField } from "@/app/components/labeled-field";
import { callSafe, saveErrorMessage } from "@/lib/errors";
import type { DeckData } from "./deck-shell";
import { saveDatosPresentacion } from "./actions";
import type { Profile, PresentacionContacto } from "@/lib/types";
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
  CoverSlide,
  CronogramaSlide,
  FinalSlide,
  GrupoSlide,
  LogisticaCantidadesSlide,
  PagosSlide,
  PerfilSlide,
  PresencialSlide,
  RequerimientosSlide,
  ServiciosPorPaqueteSlide,
  claveOcultarGrupo,
  getLogisticaDeck,
  getPaquetesDeck,
  getServiciosDeck,
  hasAcuerdoComercial,
} from "./slides-app";
import { HIDEABLE_SLIDE_GROUPS } from "@/lib/data/laminas";
import { EveDisenoSlide, EveEntregablesSlide, EveInversionSlide, EveSlide, getEveDeck } from "./slides-eve";

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

interface SlideEditHandlers {
  onEditImpactos?: (field: "registro" | "acreditacion", value: number | null) => void;
  onEditContacto?: (field: keyof PresentacionContacto, value: string) => void;
  onEditInformes?: (items: string[]) => void;
}

function buildSlides(data: DeckData, hidden: string[], edit: SlideEditHandlers = {}) {
  const { onEditImpactos, onEditContacto, onEditInformes } = edit;
  type SlideFn = (p: { data: DeckData; page: number; total: number }) => JSX.Element;
  const isHidden = (group: string) => hidden.includes(group);
  const todas: { key: string; group: string; render: SlideFn }[] = [
    { key: "cover", group: "cover", render: (p) => <CoverSlide {...p} /> },
    { key: "plataforma", group: "plataforma", render: (p) => <PlataformaSlide page={p.page} total={p.total} /> },
    { key: "cifras", group: "cifras", render: (p) => <CifrasSlide page={p.page} total={p.total} /> },
    { key: "organizador", group: "organizador", render: (p) => <OrganizadorSlide page={p.page} total={p.total} /> },
    { key: "presencial", group: "presencial", render: (p) => <PresencialSlide {...p} /> },
    { key: "perfil", group: "perfil", render: (p) => <PerfilSlide {...p} /> },
    // Componentes: cada grupo va en su lámina. La logística muestra las cantidades configuradas en el Diagnóstico.
    ...getPaquetesDeck(data)
      .filter((g) => g.grupo !== "Logística 360" && g.grupo !== "Servicios personalizados")
      .map(({ grupo, paquetes }) => ({
        key: `componentes-${grupo}`,
        group: claveOcultarGrupo(grupo),
        render: (p: Parameters<SlideFn>[0]) => <GrupoSlide grupo={grupo} paquetes={paquetes} page={p.page} total={p.total} />,
      })),
    // EVE, la IA del evento: va en todas las propuestas que la llevan, antes de la logística.
    ...(() => {
      const eve = getEveDeck(data);
      if (!eve) return [];
      return [
        { key: "eve-que-es", group: "eve", render: (p: Parameters<SlideFn>[0]) => <EveSlide page={p.page} total={p.total} /> },
        { key: "eve-diseno", group: "eve", render: (p: Parameters<SlideFn>[0]) => <EveDisenoSlide page={p.page} total={p.total} /> },
        { key: "eve-entregables", group: "eve", render: (p: Parameters<SlideFn>[0]) => <EveEntregablesSlide page={p.page} total={p.total} /> },
        { key: "eve-inversion", group: "eve", render: (p: Parameters<SlideFn>[0]) => <EveInversionSlide eve={eve} page={p.page} total={p.total} /> },
      ];
    })(),
    ...(getLogisticaDeck(data)
      ? [
          {
            key: "logistica-cantidades",
            group: "logistica",
            render: (p: Parameters<SlideFn>[0]) => <LogisticaCantidadesSlide datos={getLogisticaDeck(data)!} page={p.page} total={p.total} />,
          },
        ]
      : []),
    ...(() => {
      const laminas = getServiciosDeck(data);
      return laminas.map((filas, i) => ({
        key: `servicios-${i}`,
        group: "servicios",
        render: (p: Parameters<SlideFn>[0]) => (
          <ServiciosPorPaqueteSlide filas={filas} parte={laminas.length > 1 ? `${i + 1}/${laminas.length}` : undefined} page={p.page} total={p.total} />
        ),
      }));
    })(),
    {
      key: "comercial",
      group: "comercial",
      render: (p) => <ComercialSlide {...p} onEditImpactos={onEditImpactos} onEditContacto={onEditContacto} />,
    },
    {
      key: "informes",
      group: "informes",
      render: (p) => (
        <InformesSlide
          items={onEditInformes ? data.informes : data.informes.filter((i) => i.trim() !== "")}
          page={p.page}
          total={p.total}
          onEditInformes={onEditInformes}
        />
      ),
    },
    ...(hasAcuerdoComercial(data)
      ? [{ key: "acuerdo", group: "acuerdo", render: (p: Parameters<SlideFn>[0]) => <AcuerdoSlide {...p} /> }]
      : []),
    // "Presupuesto final" ya cuenta toda la historia de la inversión (valor sin acuerdo → acuerdo comercial → total, IVA y
    // total con IVA), así que no hay lámina aparte de "Inversión inicial": repetía el mismo valor.
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
    { key: "cierre", group: "cierre", render: (p) => <CierreSlide {...p} onEditContacto={onEditContacto} /> },
  ];
  // Solo EVE: se cotiza únicamente la IA, así que no van las láminas de plataforma, logística ni servicios.
  const SOLO_EVE_SIN = new Set(["presencial", "logistica", "servicios", "comercial", "informes", "preproduccion"]);
  const entries = todas.filter((e) => !(data.proposal.solo_eve === true && (SOLO_EVE_SIN.has(e.group) || e.key.startsWith("componentes-"))));
  // La numeración de página (dibujada dentro de cada lámina) solo cuenta las
  // visibles — una oculta conserva el número de la última visible, ya que no
  // se le asigna un puesto propio en el PDF final.
  const total = entries.filter((e) => !isHidden(e.group)).length;
  let counter = 0;
  return entries.map((e) => {
    const hidden = isHidden(e.group);
    if (!hidden) counter += 1;
    return {
      key: e.key,
      group: e.group,
      hidden,
      node: e.render({ data, page: Math.max(counter, 1), total }),
    };
  });
}

/** Si se pasa, la Presentación muestra esa versión guardada, solo para leer. */
export interface VersionVista {
  number: number;
  status: "borrador" | "enviada" | "aceptada";
  isFinal: boolean;
  createdAt: string;
}

export function PresentacionViewer({ data: initialData, version }: { data: DeckData; version?: VersionVista }) {
  const readOnly = !!version;
  const [contactName, setContactName] = useState(initialData.client?.contact_name ?? "");
  const [contactCargo, setContactCargo] = useState(initialData.client?.contact_cargo ?? "");
  const [impactosRegistro, setImpactosRegistro] = useState(
    initialData.proposal.impactos_registro != null ? String(initialData.proposal.impactos_registro) : ""
  );
  const [impactosAcreditacion, setImpactosAcreditacion] = useState(
    initialData.proposal.impactos_acreditacion != null ? String(initialData.proposal.impactos_acreditacion) : ""
  );
  const [hiddenSlides, setHiddenSlides] = useState<string[]>(initialData.proposal.presentacion_hidden_slides ?? []);
  const [contacto, setContacto] = useState<PresentacionContacto | null>(initialData.proposal.presentacion_contacto);
  const [informes, setInformes] = useState<string[]>(initialData.informes);
  const [vigenciaDias, setVigenciaDias] = useState(String(initialData.proposal.vigencia_dias ?? 15));
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // La lámina se arma en vivo con lo ya guardado; estos campos solo cubren
  // los 3 datos que hoy no existen en ningún otro paso de la app (ver
  // docs/propuesta-deck/spec.json → known_issues).
  const data: DeckData = {
    ...initialData,
    owner: contacto ? ({ ...initialData.owner, ...contacto } as Profile) : initialData.owner,
    informes,
    client: initialData.client ? { ...initialData.client, contact_name: contactName, contact_cargo: contactCargo } : null,
    proposal: {
      ...initialData.proposal,
      presentacion_contacto: contacto,
      impactos_registro: impactosRegistro === "" ? null : Number(impactosRegistro),
      impactos_acreditacion: impactosAcreditacion === "" ? null : Number(impactosAcreditacion),
      vigencia_dias: Math.min(90, Math.max(1, Number(vigenciaDias) || 15)),
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
          contacto,
          informes: informes.filter((i) => i.trim() !== ""),
          vigenciaDias: Number(vigenciaDias) || 15,
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
      pdf.save(`Presentacion${version ? ` V${version.number}` : ""} - ${initialData.proposal.event_name}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  function onEditImpactos(field: "registro" | "acreditacion", value: number | null) {
    if (field === "registro") setImpactosRegistro(value === null ? "" : String(value));
    else setImpactosAcreditacion(value === null ? "" : String(value));
  }

  function onEditContacto(field: keyof PresentacionContacto, value: string) {
    const owner = initialData.owner;
    setContacto((prev) => ({
      full_name: owner?.full_name ?? null,
      cargo: owner?.cargo ?? null,
      correo: owner?.correo ?? null,
      telefono: owner?.telefono ?? null,
      ...prev,
      [field]: value,
    }));
  }

  function toggleHiddenSlide(group: string) {
    setHiddenSlides((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  return (
    <div className={`${exo.variable} ${poppins.variable} space-y-6`}>
      {readOnly && version && (
        <section className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-5">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Versión {version.number}
              {version.isFinal ? " · final" : ""}
              {version.status === "aceptada" ? " · aceptada" : version.status === "enviada" ? " · enviada" : ""}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Guardada el {new Date(version.createdAt).toLocaleString("es-CO")}. Es una foto de ese momento: solo se
              puede leer y descargar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/proposals/${initialData.proposal.id}/versiones`} className="btn btn-secondary btn-sm">
              Volver a Versiones
            </Link>
            <button type="button" onClick={downloadPdf} disabled={isDownloading} className="btn btn-primary btn-sm">
              {isDownloading ? "Generando PDF..." : "Descargar en PDF"}
            </button>
          </div>
        </section>
      )}
      {!readOnly && (
      <section className="no-print rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Datos de la presentación</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Completa lo que lleva la presentación. También puedes pedírselo a NOVA (botón «NOVA» o Ctrl+K). Lo que dejes vacío usa el valor por defecto, y los datos del asesor
          salen de{" "}
          <Link href="/perfil" className="underline">
            tu perfil
          </Link>{" "}
          si no los cambias aquí. El resto se edita directo en cada lámina (lápiz o casillas), se oculta con el ojito de la lámina, o se lo pides a NOVA.
        </p>

        <div className="mt-4 space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Contacto del cliente</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LabeledField label="Nombre">
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} maxLength={120} />
              </LabeledField>
              <LabeledField label="Cargo">
                <input value={contactCargo} onChange={(e) => setContactCargo(e.target.value)} className={inputClass} maxLength={120} />
              </LabeledField>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Asesor comercial</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["full_name", "Nombre"],
                  ["cargo", "Cargo"],
                  ["correo", "Correo"],
                  ["telefono", "Teléfono"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <LabeledField key={campo} label={etiqueta}>
                  <input
                    value={contacto?.[campo] ?? initialData.owner?.[campo] ?? ""}
                    onChange={(e) => onEditContacto(campo, e.target.value)}
                    className={inputClass}
                    maxLength={campo === "telefono" ? 40 : 120}
                  />
                </LabeledField>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Oferta</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <LabeledField label="Vigencia (días)">
                <input type="number" min={1} max={90} value={vigenciaDias} onChange={(e) => setVigenciaDias(e.target.value)} className={inputClass} />
              </LabeledField>
              <p className="self-end text-xs text-neutral-500 sm:col-span-3">
                Aparece en la lámina de inversión como «Oferta válida hasta …», contada desde la fecha de la propuesta.
              </p>
            </div>
          </fieldset>

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
      )}

      <div className="no-print flex flex-col items-center gap-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        {buildSlides(data, hiddenSlides, readOnly ? {} : { onEditImpactos, onEditContacto, onEditInformes: setInformes }).map((slide) => {
          const hideable = HIDEABLE_SLIDE_GROUPS.some((g) => g.key === slide.group);
          return (
            <div
              key={slide.key}
              className="relative"
              style={{ width: 1920 * PREVIEW_SCALE, height: 1080 * PREVIEW_SCALE, overflow: "hidden" }}
            >
              <div
                className="h-full w-full overflow-hidden rounded-lg border border-neutral-300 shadow-sm"
                style={{ opacity: slide.hidden ? 0.35 : 1, filter: slide.hidden ? "grayscale(70%)" : undefined }}
              >
                <div
                  style={{ width: 1920, height: 1080, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}
                >
                  {slide.node}
                </div>
              </div>
              {!readOnly && hideable && !slide.hidden && (
                <button
                  type="button"
                  onClick={() => toggleHiddenSlide(slide.group)}
                  title="Ocultar esta diapositiva"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <EyeOffIcon />
                </button>
              )}
              {!readOnly && slide.hidden && (
                <button
                  type="button"
                  onClick={() => toggleHiddenSlide(slide.group)}
                  title="Mostrar esta diapositiva"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85">
                    <EyeIcon />
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Área oculta a tamaño real (1920x1080 por lámina) — de acá sale el PDF (sin inputs editables). Las ocultas no se incluyen. */}
      <div className="fixed left-[-9999px] top-0 -z-10">
        <div ref={printAreaRef}>
          {buildSlides(data, hiddenSlides)
            .filter((s) => !s.hidden)
            .map((s) => (
              <div key={s.key}>{s.node}</div>
            ))}
        </div>
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

function EyeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
