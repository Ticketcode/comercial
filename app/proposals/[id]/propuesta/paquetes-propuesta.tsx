"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PaquetesDeGrupo } from "@/lib/data/paquetes";
import { GRUPO_INFO } from "@/lib/data/paquetes";
import { PedirCambioButton } from "../asistente/asistente-panel";
import { ResumenPrecioCard, type ResumenPrecio } from "../diagnostico/resumen-y-servicios";
import { saveVersion } from "../versiones/actions";

/** Vista de la propuesta como paquetes (igual que en la presentación): qué recibe el cliente, con su valor de promesa. */
export function PaquetesPropuesta({
  proposalId,
  eventName,
  grupos,
  resumen,
  faltantes,
  siguienteVersion,
}: {
  proposalId: string;
  eventName: string;
  grupos: PaquetesDeGrupo[];
  resumen: ResumenPrecio;
  faltantes: string[];
  siguienteVersion: number;
}) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const incompleto = faltantes.length > 0;

  function guardarVersion() {
    setMsg(null);
    start(async () => {
      const r = await saveVersion(proposalId, "");
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setMsg({ tipo: "ok", texto: `Guardada como V${siguienteVersion}.` });
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
        <p className={`rounded-2xl px-4 py-3 text-sm ${incompleto ? "bg-warn-bg text-warn-ink" : "bg-highlight text-highlight-ink"}`}>
          {incompleto ? (
            <>
              Faltan datos en el diagnóstico: {faltantes.join(", ")}.{" "}
              <Link href={`/proposals/${proposalId}/diagnostico`} className="font-semibold underline">
                Ir al diagnóstico
              </Link>
            </>
          ) : (
            "Diagnóstico completo."
          )}
        </p>

        {grupos.length === 0 && <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">Todavía no hay componentes ni servicios incluidos en esta propuesta.</p>}

        {grupos.map(({ grupo, paquetes }) => (
          <section key={grupo} aria-label={grupo} className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-2xl font-extrabold text-ink">{grupo}</h2>
            <p className="mt-1 text-sm text-muted">{GRUPO_INFO[grupo].intro}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {paquetes.map((p) => (
                <article key={p.nombre} className="rounded-2xl border border-border bg-surface2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-ink">{p.nombre}</h3>
                    <PedirCambioButton sobre={`${grupo}: ${p.nombre}`} className="no-print shrink-0 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface2" />
                  </div>
                  <p className="mt-1 text-sm italic text-muted">{p.promesa}</p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink">
                    {p.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={guardarVersion} disabled={pendiente} className="min-h-11 rounded-pill bg-accent px-6 text-sm font-bold text-accent-ink disabled:opacity-50">
              {pendiente ? "Guardando…" : `Guardar como V${siguienteVersion}`}
            </button>
            <p className="text-sm text-muted">Guarda una foto del diagnóstico y los precios.</p>
          </div>
          {msg && (
            <p role={msg.tipo === "error" ? "alert" : "status"} className={`mt-3 text-sm font-semibold ${msg.tipo === "error" ? "text-danger" : "text-ink"}`}>
              {msg.texto}{" "}
              {msg.tipo === "ok" && (
                <Link href={`/proposals/${proposalId}/versiones`} className="underline">
                  Ver versiones
                </Link>
              )}
            </p>
          )}
        </section>
      </div>

      <ResumenPrecioCard r={resumen} pendientes={faltantes.length} evento={eventName} />
    </div>
  );
}
