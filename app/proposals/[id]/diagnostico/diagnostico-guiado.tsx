"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCOP } from "@/lib/pricing/summary";
import { PedirCambioButton } from "../asistente/asistente-panel";
import { responderPregunta, type EstadoPregunta, type Respuesta } from "./guiado-actions";

export interface DatosGuiado {
  proposalId: string;
  eventName: string;
  modality: "presencial" | "virtual" | "hibrido" | "mundo_virtual";
  aforo: number;
  aforoVirtual: number;
  dias: number;
  city: string;
  productor: number;
  supervisores: number;
  logisticos: number;
  preMedioDia: boolean;
  preDias: number; // 0 = sin pre-acreditación
  puntos: number;
  manillas: boolean;
  escarapelas: boolean;
  branding: boolean;
  labels: boolean;
  /** Lo que propone la tabla de aforo, como pista. */
  tabla: { logistico: number; supervisor: number; productor: number } | null;
  estado: Record<string, EstadoPregunta>;
  valorAntesIva: number;
}

type Id = "preDias" | "aforo" | "aforoVirtual" | "dias" | "ciudad" | "productor" | "supervisores" | "logisticos" | "puntos" | "pre" | "cred" | "extrasCred";

interface Pregunta {
  id: Id;
  texto: string;
  resumen: string;
}

function preguntas(d: DatosGuiado): Pregunta[] {
  const pres = d.modality === "presencial" || d.modality === "hibrido";
  const virt = d.modality !== "presencial";
  const n = (x: number) => x.toLocaleString("es-CO");
  const Q: Pregunta[] = [];
  if (pres) Q.push({ id: "aforo", texto: "¿Cuál es el aforo presencial que confirma el organizador?", resumen: `${n(d.aforo)} personas` });
  if (virt) Q.push({ id: "aforoVirtual", texto: "¿Cuántos asistentes virtuales espera?", resumen: `${n(d.aforoVirtual)} personas` });
  Q.push({ id: "dias", texto: "¿Cuántos días dura el evento?", resumen: `${d.dias} día(s)` });
  if (pres) {
    Q.push({ id: "ciudad", texto: "¿En qué ciudad es?", resumen: d.city || "—" });
    Q.push({ id: "productor", texto: "¿El evento lleva productor de Ticketcode?", resumen: d.productor > 0 ? `Sí, ${d.productor}` : "Sin productor, solo supervisores" });
    Q.push({ id: "supervisores", texto: "¿Cuántos supervisores?", resumen: `${d.supervisores} supervisor(es)` });
    Q.push({ id: "logisticos", texto: "¿Cuántos logísticos en total?", resumen: `${d.logisticos} logístico(s)` });
    Q.push({ id: "puntos", texto: "¿Cuántos puntos de venta de boletería en sitio necesita?", resumen: d.puntos > 0 ? `${d.puntos} punto(s) de venta` : "Sin venta en sitio" });
    Q.push({
      id: "pre",
      texto: "¿Habrá pre-acreditación?",
      resumen: d.preDias > 0 ? `${d.preMedioDia ? "Medio día" : "Día completo"} × ${d.preDias} día(s)` : "Sin pre-acreditación",
    });
    Q.push({
      id: "cred",
      texto: "¿Qué credenciales necesita?",
      resumen: d.manillas && d.escarapelas ? "Manillas y escarapelas" : d.manillas ? "Manillas" : d.escarapelas ? "Escarapelas físicas" : "Ninguna",
    });
    Q.push({
      id: "extrasCred",
      texto: "¿Branding de aliados en la credencial o labels de seguridad para proteger equipos?",
      resumen: [d.branding && "Branding de aliados", d.labels && "Labels de seguridad"].filter(Boolean).join(" y ") || "Ninguno",
    });
  }
  return Q;
}

const chipBase = "min-h-10 rounded-pill border px-4 text-sm font-semibold";
const chip = (on: boolean) => `${chipBase} ${on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-ink hover:bg-surface2"}`;

function BtnConfirmar({ onClick, pendiente, children = "Confirmar" }: { onClick: () => void; pendiente: boolean; children?: string }) {
  return (
    <button type="button" disabled={pendiente} onClick={onClick} className="min-h-10 rounded-pill bg-accent px-5 text-sm font-bold text-accent-ink disabled:opacity-50">
      {pendiente ? "Guardando…" : children}
    </button>
  );
}
function BtnNoAplica({ onClick, pendiente }: { onClick: () => void; pendiente: boolean }) {
  return (
    <button type="button" disabled={pendiente} onClick={onClick} className={chip(false)}>
      No aplica
    </button>
  );
}

export function DiagnosticoGuiado({ datos }: { datos: DatosGuiado }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Id | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [preModo, setPreModo] = useState<"no" | "completo" | "medio" | null>(null);

  const Q = preguntas(datos);
  const estadoDe = (id: Id): EstadoPregunta | "pendiente" => datos.estado[id] ?? "pendiente";
  const primeraPendiente = Q.find((q) => estadoDe(q.id) === "pendiente")?.id ?? null;
  const confirmadas = Q.filter((q) => estadoDe(q.id) !== "pendiente").length;
  const activa = abierta ?? primeraPendiente;

  function enviar(r: Respuesta, noAplica = false) {
    setError(null);
    start(async () => {
      const res = await responderPregunta(datos.proposalId, r, noAplica);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAbierta(null);
      setBorrador({});
      setPreModo(null);
      router.refresh();
    });
  }

  const num = (id: string, fallback: number | "") => (borrador[id] ?? (fallback === "" ? "" : String(fallback)));
  const setNum = (id: string, v: string) => setBorrador((b) => ({ ...b, [id]: v }));
  const paso = (id: string, base: number, d: number, min: number, max: number) => {
    const actual = Number(borrador[id] ?? base) || 0;
    setNum(id, String(Math.min(max, Math.max(min, actual + d))));
  };

  const contador = ({ id, base, min, max, hint }: { id: Id; base: number | ""; min: number; max: number; hint?: string }) => (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={chip(false)} onClick={() => paso(id, Number(base) || 0, -1, min, max)} aria-label="Menos">
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={num(id, base)}
        onChange={(e) => setNum(id, e.target.value)}
        placeholder="—"
        aria-label="Valor"
        className="min-h-10 w-28 rounded-pill border border-border bg-input-bg px-4 text-center text-sm text-ink"
      />
      <button type="button" className={chip(false)} onClick={() => paso(id, Number(base) || 0, 1, min, max)} aria-label="Más">
        +
      </button>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );

  function confirmarNumero(id: "aforo" | "aforoVirtual" | "dias" | "productor" | "supervisores" | "logisticos" | "puntos", min: number, max: number, noAplica = false) {
    const v = noAplica ? 0 : Number(borrador[id]);
    if (!noAplica && (borrador[id] === undefined || borrador[id] === "" || !Number.isFinite(v) || v < min || v > max)) {
      setError(`Escribe un número entre ${min} y ${max}.`);
      return;
    }
    enviar({ id, valor: v }, noAplica);
  }

  function controles(q: Pregunta) {
    const id = q.id;
    const sinResponder = estadoDe(id) === "pendiente";
    switch (id) {
      case "aforo":
        return (
          <div className="space-y-3">
            {contador({ id: "aforo", base: sinResponder ? "" : datos.aforo, min: 1, max: 100000, hint: "Al confirmar se recalcula la dotación según la tabla de aforo." })}
            <BtnConfirmar pendiente={pendiente} onClick={() => confirmarNumero("aforo", 1, 100000)} />
          </div>
        );
      case "aforoVirtual":
        return (
          <div className="space-y-3">
            {contador({ id: "aforoVirtual", base: sinResponder ? "" : datos.aforoVirtual, min: 1, max: 100000 })}
            <BtnConfirmar pendiente={pendiente} onClick={() => confirmarNumero("aforoVirtual", 1, 100000)} />
          </div>
        );
      case "dias":
        return (
          <div className="space-y-3">
            {contador({ id: "dias", base: sinResponder ? "" : datos.dias, min: 1, max: 30 })}
            <BtnConfirmar pendiente={pendiente} onClick={() => confirmarNumero("dias", 1, 30)} />
          </div>
        );
      case "ciudad":
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(!sinResponder && /^bogot/i.test(datos.city))} disabled={pendiente} onClick={() => enviar({ id: "ciudad", valor: "Bogotá" })}>
                Bogotá
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={borrador.ciudad ?? (sinResponder || /^bogot/i.test(datos.city) ? "" : datos.city)}
                onChange={(e) => setBorrador((b) => ({ ...b, ciudad: e.target.value }))}
                placeholder="Otra ciudad"
                aria-label="Ciudad"
                className="min-h-10 w-56 rounded-pill border border-border bg-input-bg px-4 text-sm text-ink"
              />
              <BtnConfirmar pendiente={pendiente} onClick={() => (borrador.ciudad?.trim() ? enviar({ id: "ciudad", valor: borrador.ciudad.trim() }) : setError("Escribe la ciudad."))} />
            </div>
          </div>
        );
      case "productor":
        return (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente} className={chip(!sinResponder && datos.productor > 0)} onClick={() => enviar({ id: "productor", valor: 1 })}>
              Sí, lleva productor
            </button>
            <button type="button" disabled={pendiente} className={chip(!sinResponder && datos.productor === 0)} onClick={() => enviar({ id: "productor", valor: 0 })}>
              No, solo supervisores
            </button>
          </div>
        );
      case "supervisores":
        return (
          <div className="space-y-3">
            {contador({ id: "supervisores", base: sinResponder ? "" : datos.supervisores, min: 0, max: 20, hint: datos.tabla ? `La tabla de aforo propone ${datos.tabla.supervisor}.` : undefined })}
            <div className="flex flex-wrap gap-2">
              <BtnConfirmar pendiente={pendiente} onClick={() => confirmarNumero("supervisores", 0, 20)} />
              <BtnNoAplica pendiente={pendiente} onClick={() => confirmarNumero("supervisores", 0, 20, true)} />
            </div>
          </div>
        );
      case "logisticos":
        return (
          <div className="space-y-3">
            {contador({ id: "logisticos", base: sinResponder ? "" : datos.logisticos, min: 0, max: 100, hint: datos.tabla ? `La tabla de aforo propone ${datos.tabla.logistico}.` : undefined })}
            <BtnConfirmar pendiente={pendiente} onClick={() => confirmarNumero("logisticos", 0, 100)} />
          </div>
        );
      case "puntos":
        return (
          <div className="space-y-3">
            {contador({ id: "puntos", base: sinResponder ? "" : datos.puntos, min: 0, max: 20 })}
            <div className="flex flex-wrap gap-2">
              <BtnConfirmar pendiente={pendiente} onClick={() => confirmarNumero("puntos", 0, 20)} />
              <BtnNoAplica pendiente={pendiente} onClick={() => confirmarNumero("puntos", 0, 20, true)} />
            </div>
          </div>
        );
      case "pre": {
        const modoActual = preModo ?? (sinResponder ? null : datos.preDias === 0 ? "no" : datos.preMedioDia ? "medio" : "completo");
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["no", "No"],
                  ["completo", "Día completo"],
                  ["medio", "Medio día"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" disabled={pendiente} className={chip(modoActual === v)} onClick={() => (v === "no" ? enviar({ id: "pre", modo: "no", dias: 0 }) : setPreModo(v))}>
                  {l}
                </button>
              ))}
            </div>
            {modoActual && modoActual !== "no" && (
              <div className="space-y-3">
                <p className="text-sm text-ink">¿Cuántos días?</p>
                {contador({ id: "preDias", base: datos.preDias || 1, min: 1, max: 10, hint: "Va con la mitad de los logísticos del evento, hacia arriba." })}
                <BtnConfirmar pendiente={pendiente} onClick={() => enviar({ id: "pre", modo: modoActual, dias: Number(borrador.preDias ?? (datos.preDias || 1)) })} />
              </div>
            )}
          </div>
        );
      }
      case "cred":
        return (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ninguna", "Ninguna", !datos.manillas && !datos.escarapelas],
                ["manillas", "Manillas", datos.manillas && !datos.escarapelas],
                ["escarapelas", "Escarapelas físicas", !datos.manillas && datos.escarapelas],
                ["ambas", "Ambas", datos.manillas && datos.escarapelas],
              ] as const
            ).map(([v, l, on]) => (
              <button key={v} type="button" disabled={pendiente} className={chip(!sinResponder && on)} onClick={() => enviar({ id: "cred", valor: v })}>
                {l}
              </button>
            ))}
          </div>
        );
      case "extrasCred": {
        const b = borrador.branding !== undefined ? borrador.branding === "1" : !sinResponder && datos.branding;
        const l = borrador.labels !== undefined ? borrador.labels === "1" : !sinResponder && datos.labels;
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(b)} onClick={() => setBorrador((x) => ({ ...x, branding: b ? "0" : "1" }))}>
                Branding de aliados
              </button>
              <button type="button" className={chip(l)} onClick={() => setBorrador((x) => ({ ...x, labels: l ? "0" : "1" }))}>
                Labels de seguridad
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <BtnConfirmar pendiente={pendiente} onClick={() => enviar({ id: "extrasCred", branding: b, labels: l })} />
              <button type="button" disabled={pendiente} className={chip(false)} onClick={() => enviar({ id: "extrasCred", branding: false, labels: false }, true)}>
                Ninguno
              </button>
            </div>
          </div>
        );
      }
    }
  }

  const etiquetaEstado = (e: EstadoPregunta | "pendiente") =>
    e === "ok" ? "Confirmado" : e === "na" ? "No aplica" : e === "ia" ? "Claude · confirma" : "Pendiente";

  return (
    <section aria-label="Diagnóstico guiado" className="space-y-4">
      <div className="rounded-2xl bg-surface2 px-5 py-4">
        <p className="font-display text-lg font-extrabold text-ink">Armemos el diagnóstico de {datos.eventName}</p>
        <p className="mt-1 text-sm text-muted">
          Contesta en orden o salta a la que quieras. Cada respuesta se guarda al confirmarla y mueve el valor abajo. También puedes contárselo a Claude con el botón
          «Claude» (Ctrl+K) y él propone los cambios.
        </p>
        <p className="mt-2 text-xs font-semibold text-muted">
          {confirmadas} de {Q.length} preguntas respondidas
        </p>
      </div>

      {datos.modality !== "presencial" && datos.modality !== "hibrido" && (
        <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          Para esta modalidad, las preguntas de transmisión (salas, cámaras, personal audiovisual, stands) llegan en la siguiente fase. Mientras tanto,
          elige los servicios en el modo avanzado.
        </p>
      )}

      <ol className="space-y-3">
        {Q.map((q) => {
          const e = estadoDe(q.id);
          const abiertaEsta = activa === q.id;
          return (
            <li key={q.id} className={`rounded-2xl border px-5 py-4 ${abiertaEsta ? "border-accent bg-surface" : "border-border bg-surface"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{q.texto}</p>
                  {!abiertaEsta && e !== "pendiente" && <p className="mt-1 text-sm text-muted">{e === "na" ? "No aplica" : q.resumen}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${e === "pendiente" ? "bg-warn-bg text-warn-ink" : "bg-highlight text-highlight-ink"}`}>
                    {etiquetaEstado(e)}
                  </span>
                  {!abiertaEsta && (
                    <button type="button" className="text-xs font-semibold text-muted underline" onClick={() => setAbierta(q.id)}>
                      {e === "pendiente" ? "Responder" : "Cambiar"}
                    </button>
                  )}
                </div>
              </div>
              {abiertaEsta && <div className="mt-3">{controles(q)}</div>}
              {abiertaEsta && (
                <div className="mt-3">
                  <PedirCambioButton sobre={q.texto} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="rounded-2xl bg-ink px-5 py-4 text-surface">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Valor antes de IVA</p>
        <p className="font-display text-3xl font-extrabold">{formatCOP(datos.valorAntesIva)}</p>
      </div>
    </section>
  );
}
