"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { totalLogisticosSalones } from "@/lib/pricing/logistics";
import type { CambiosCrudos } from "@/lib/ai/cambios";
import { LogisticaDetalle, NotasDiagnostico, type DetalleLogistica } from "./extras-diagnostico";
import { ResumenPrecioCard, type ResumenPrecio } from "./resumen-y-servicios";
import { ServiciosPersonalizados, type ServicioDiag } from "./servicios-diagnostico";
import { PedirCambioButton } from "../asistente/asistente-panel";
import { guardarDatos } from "./guiado-actions";

type Modalidad = "presencial" | "virtual" | "hibrido" | "mundo_virtual";

export interface DatosGuiado {
  proposalId: string;
  eventName: string;
  modality: Modalidad;
  dias: number;
  vendeBoletas: boolean;
  conLogistica: boolean;
  city: string;
  aforo: number;
  aforoVirtual: number;
  salones: number[];
  preModo: "no" | "completo" | "medio";
  preDias: number;
  productor: number;
  supervisores: number;
  logisticos: number;
  computadores: number;
  impresoras: number;
  /** Lo que propone la tabla de aforo, como pista. */
  tabla: { logistico: number; supervisor: number; productor: number; computadores: number; impresoras: number } | null;
  /** Datos que faltan para que el valor sea completo (aforo, ciudad…). */
  faltantes: string[];
  resumen: ResumenPrecio;
  logistica: DetalleLogistica;
  servicios: ServicioDiag[];
}

const chip = (on: boolean) =>
  `min-h-10 rounded-pill border px-4 text-sm font-semibold disabled:opacity-60 ${on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-ink hover:bg-surface2"}`;
const campo = "min-h-10 w-full rounded-pill border border-border bg-input-bg px-4 text-sm text-ink";
const etiqueta = "block space-y-1.5 text-xs font-semibold text-muted";

const MODALIDADES: [Modalidad, string][] = [
  ["presencial", "Presencial"],
  ["virtual", "Virtual"],
  ["hibrido", "Híbrido"],
];

/** Texto "2.000, 500, 500" → [2000, 500, 500]. */
function leerAforos(texto: string): number[] {
  return texto
    .split(/[,;\s]+/)
    .map((x) => Number(x.replace(/\./g, "")))
    .filter((x) => Number.isFinite(x) && x > 0);
}

export function DiagnosticoGuiado({ datos }: { datos: DatosGuiado }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [b, setB] = useState<Record<string, string>>({});

  const pres = datos.modality === "presencial" || datos.modality === "hibrido";
  const virt = datos.modality !== "presencial";
  const conLog = pres && datos.conLogistica;

  /** Guarda al instante: lo que se ve en pantalla es lo que queda. */
  function guardar(crudos: CambiosCrudos) {
    setError(null);
    setGuardado(false);
    start(async () => {
      const r = await guardarDatos(datos.proposalId, crudos);
      if (r.error) {
        setError(r.error);
        return;
      }
      setB({});
      setGuardado(true);
      router.refresh();
    });
  }

  const val = (k: string, actual: string | number) => (k in b ? b[k] : String(actual));
  const set = (k: string, v: string) => setB((x) => ({ ...x, [k]: v }));
  /** Descarta lo que se estaba escribiendo y vuelve al valor guardado. */
  const limpiar = (k: string) =>
    setB((x) => {
      const c = { ...x };
      delete c[k];
      return c;
    });
  const num = (k: string, actual: number, min: number, max: number, aCrudos: (n: number) => CambiosCrudos) => ({
    value: val(k, actual === 0 && k !== "dias" ? "0" : actual),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
    onBlur: () => {
      const v = b[k];
      if (v === undefined || v === "") return limpiar(k);
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) return setError(`Escribe un número entre ${min} y ${max}.`);
      if (n !== actual) guardar(aCrudos(n));
      else limpiar(k);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && (e.target as HTMLInputElement).blur(),
    type: "number" as const,
    min,
    max,
  });

  const salonesTexto = val("salones", datos.salones.map((x) => x.toLocaleString("es-CO")).join(", "));
  const logisticosSalones = totalLogisticosSalones(datos.salones);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-label="Diagnóstico" className="min-w-0 space-y-4">
        <NotasDiagnostico proposalId={datos.proposalId} />

        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Datos del evento</h2>
              <p className="mt-1 text-sm text-muted">
                Cambia lo que necesites aquí o pídeselo a NOVA (botón «NOVA» o Ctrl+K). Todo se guarda al instante y el valor se actualiza.
              </p>
            </div>
            <span aria-live="polite" className="text-xs font-semibold text-muted">
              {pendiente ? "Guardando…" : guardado ? "Guardado ✓" : ""}
            </span>
          </div>

          {datos.faltantes.length > 0 && (
            <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-ink">Falta: {datos.faltantes.join(", ")}. Mientras tanto el valor es provisional.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${etiqueta} sm:col-span-2`}>
              Nombre del evento
              <input
                className={campo}
                value={val("nombre", datos.eventName)}
                onChange={(e) => set("nombre", e.target.value)}
                onBlur={() => {
                  const v = (b.nombre ?? "").trim();
                  if (b.nombre !== undefined && v && v !== datos.eventName) guardar({ nombre: v });
                }}
                maxLength={160}
              />
            </label>

            <div className={etiqueta}>
              ¿Es presencial, virtual o híbrido?
              <div className="flex flex-wrap gap-2">
                {MODALIDADES.map(([v, l]) => (
                  <button key={v} type="button" disabled={pendiente} className={chip(datos.modality === v)} onClick={() => datos.modality !== v && guardar({ modalidad: v })}>
                    {l}
                  </button>
                ))}
                {datos.modality === "mundo_virtual" && (
                  <button type="button" disabled className={chip(true)}>
                    Mundo virtual
                  </button>
                )}
              </div>
            </div>

            <label className={etiqueta}>
              Días del evento
              <input className={campo} {...num("dias", datos.dias, 1, 30, (n) => ({ dias: n }))} />
            </label>

            <div className={etiqueta}>
              ¿El evento vende boletas?
              <div className="flex gap-2">
                <button type="button" disabled={pendiente} className={chip(datos.vendeBoletas)} onClick={() => !datos.vendeBoletas && guardar({ vendeBoletas: true })}>
                  Sí
                </button>
                <button type="button" disabled={pendiente} className={chip(!datos.vendeBoletas)} onClick={() => datos.vendeBoletas && guardar({ vendeBoletas: false })}>
                  No
                </button>
              </div>
            </div>

            {pres && (
              <div className={etiqueta}>
                ¿Tiene logística en sitio?
                <div className="flex gap-2">
                  <button type="button" disabled={pendiente} className={chip(datos.conLogistica)} onClick={() => !datos.conLogistica && guardar({ conLogistica: true })}>
                    Sí
                  </button>
                  <button type="button" disabled={pendiente} className={chip(!datos.conLogistica)} onClick={() => datos.conLogistica && guardar({ conLogistica: false })}>
                    No
                  </button>
                </div>
                <span className="block text-xs font-normal text-muted">
                  {datos.conLogistica ? "El equipo se calcula con la tabla de aforo." : "Se muestran las cantidades (equipo, salones, pre-acreditación) para que el organizador sepa qué debe poner; no se cobran."}
                </span>
              </div>
            )}

            {pres && (
              <label className={etiqueta}>
                Aforo estimado (presencial)
                <input className={campo} placeholder="—" {...num("aforo", datos.aforo, 1, 100000, (n) => ({ aforo: n }))} value={val("aforo", datos.aforo || "")} />
              </label>
            )}
            {virt && (
              <label className={etiqueta}>
                Aforo estimado (virtual)
                <input className={campo} placeholder="—" {...num("aforoVirtual", datos.aforoVirtual, 1, 100000, (n) => ({ aforoVirtual: n }))} value={val("aforoVirtual", datos.aforoVirtual || "")} />
              </label>
            )}

            {pres && (
                <div className={etiqueta}>
                  Salones internos y su aforo estimado
                  <div className="flex gap-2">
                    <input
                      className={campo}
                      value={salonesTexto}
                      onChange={(e) => set("salones", e.target.value)}
                      onBlur={() => {
                        if (b.salones === undefined) return;
                        const aforos = leerAforos(b.salones);
                        if (JSON.stringify(aforos) !== JSON.stringify(datos.salones)) guardar({ salonesInternos: aforos });
                        else limpiar("salones");
                      }}
                      placeholder="Ej. 2.000, 500, 500"
                      aria-label="Aforo de cada salón interno"
                    />
                    <button type="button" disabled={pendiente} className={chip(datos.salones.length === 0)} onClick={() => datos.salones.length > 0 && guardar({ salonesInternos: [] })}>
                      Sin salones
                    </button>
                  </div>
                  <span className="block text-xs font-normal text-muted">
                    {datos.salones.length > 0
                      ? `${datos.salones.length} salón(es) → ${logisticosSalones} logístico(s) de salón (1 hasta 100, 2 hasta 400, 3 hasta 800, 4 desde ahí).`
                      : "Escribe el aforo de cada salón separado por comas."}
                  </span>
                </div>

            )}

            {pres && (
                <div className={`${etiqueta} sm:col-span-2`}>
                  ¿Habrá pre-acreditación?
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ["no", "No"],
                        ["completo", "Día completo"],
                        ["medio", "Medio día"],
                      ] as const
                    ).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        disabled={pendiente}
                        className={chip(datos.preModo === v)}
                        onClick={() => datos.preModo !== v && guardar({ preacreditacion: { modo: v, dias: datos.preDias || 1 } })}
                      >
                        {l}
                      </button>
                    ))}
                    {datos.preModo !== "no" && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                        Días
                        <input
                          className="min-h-10 w-20 rounded-pill border border-border bg-input-bg px-3 text-center text-sm text-ink"
                          {...num("preDias", datos.preDias || 1, 1, 10, (n) => ({ preacreditacion: { modo: datos.preModo, dias: n } }))}
                        />
                      </label>
                    )}
                  </div>
                </div>
            )}

            {conLog && (
              <>
                <label className={etiqueta}>
                  Ciudad
                  <div className="flex gap-2">
                    <input
                      className={campo}
                      value={val("ciudad", datos.city)}
                      onChange={(e) => set("ciudad", e.target.value)}
                      onBlur={() => {
                        const v = (b.ciudad ?? "").trim();
                        if (b.ciudad !== undefined && v && v !== datos.city) guardar({ ciudad: v });
                      }}
                      placeholder="Ciudad"
                      maxLength={80}
                    />
                    <button type="button" disabled={pendiente} className={chip(/^bogot/i.test(datos.city))} onClick={() => guardar({ ciudad: "Bogotá" })}>
                      Bogotá
                    </button>
                  </div>
                </label>

              </>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <PedirCambioButton sobre="los datos del evento" />
        </div>

        {pres && (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">{datos.conLogistica ? "Equipo y equipos en sitio" : "Equipo que necesita el evento"}</h2>
              <p className="mt-1 text-sm text-muted">
                {datos.conLogistica
                  ? "Calculado con la tabla de aforo. Si necesitas otra cantidad, cámbiala aquí o pídeselo a NOVA."
                  : "Calculado con la tabla de aforo. Lo pone el organizador: se muestra para que sepa qué debe disponer, pero no va en nuestro costo."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["productor", "Productores", datos.productor, 10, datos.tabla?.productor, (n: number) => ({ productor: n })],
                  ["supervisores", "Supervisores", datos.supervisores, 20, datos.tabla?.supervisor, (n: number) => ({ supervisores: n })],
                  ["logisticos", "Logísticos", datos.logisticos, 100, datos.tabla?.logistico, (n: number) => ({ logisticos: n })],
                  ["computadores", "Portátiles", datos.computadores, 200, datos.tabla?.computadores, (n: number) => ({ computadores: n })],
                  ["impresoras", "Impresoras", datos.impresoras, 200, datos.tabla?.impresoras, (n: number) => ({ impresoras: n })],
                ] as const
              ).map(([k, nombre, actual, max, sugerido, aCrudos]) => (
                <label key={k} className={etiqueta}>
                  {nombre}
                  <input className={campo} {...num(k, actual, 0, max, aCrudos)} />
                  {sugerido !== undefined && sugerido !== actual && <span className="block text-xs font-normal text-muted">La tabla propone {sugerido}.</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {!pres && (
          <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn-ink">
            Para esta modalidad, las preguntas de transmisión (salas, cámaras, personal audiovisual, stands) llegan en la siguiente fase. Mientras tanto, elige los servicios en la lista de abajo.
          </p>
        )}
        {pres && !datos.conLogistica && (
          <p className="rounded-2xl bg-surface2 px-4 py-3 text-sm text-ink">
            Este evento no lleva logística de Ticketcode: igual necesita ese equipo, la pre-acreditación y los salones, pero los pone el organizador. Aparecen con sus cantidades y sin costo; solo se cobra la capacitación al staff.
          </p>
        )}

        {conLog && <LogisticaDetalle d={datos.logistica} />}
        <ServiciosPersonalizados proposalId={datos.proposalId} servicios={datos.servicios} />
      </section>
      <ResumenPrecioCard r={datos.resumen} pendientes={datos.faltantes.length} evento={datos.eventName} />
    </div>
  );
}
