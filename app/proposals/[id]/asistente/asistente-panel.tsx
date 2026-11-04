"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { formatCOP } from "@/lib/pricing/summary";
import { aplicarCambios, pedirCambios, type TarjetaCambio, type TurnoChat } from "./actions";

type Estado = "pendiente" | "aplicada" | "descartada";
interface TarjetaUI extends TarjetaCambio {
  estado: Estado;
}
interface Mensaje {
  id: string;
  rol: "usuario" | "claude";
  texto: string;
  sobre?: string;
  tarjetas?: TarjetaUI[];
  noAplica?: { etiqueta: string; motivo: string }[];
}

const PASOS: Record<string, string> = {
  diagnostico: "Diagnóstico",
  propuesta: "Propuesta",
  acuerdo: "Acuerdo comercial",
  contrato: "Envío y contrato",
  presentacion: "Presentación",
  versiones: "Versiones",
};

const SUGERENCIAS: Record<string, string[]> = {
  diagnostico: ["Es híbrido con 1.200 personas", "El productor no va", "Pre-acreditación de medio día"],
  propuesta: ["Quieren recordatorios por correo", "Quita el servicio de chat", "Sube el descuento al 15%"],
  acuerdo: ["Sube el descuento al 20%", "Propón un acuerdo con patrocinio"],
  presentacion: ["Oculta la lámina de casos de éxito", "Muestra la lámina de acuerdo comercial"],
  versiones: ["¿Qué cambió frente a la versión anterior?"],
  contrato: ["¿Qué cambia si el aforo sube a 2.000?"],
};

const uid = () => Math.random().toString(36).slice(2, 9);

export function AsistentePanel({ proposalId }: { proposalId: string }) {
  const pathname = usePathname() ?? "";
  const paso = Object.keys(PASOS).find((k) => pathname.includes(`/${k}`)) ?? "diagnostico";

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [borrador, setBorrador] = useState("");
  const [sobre, setSobre] = useState<string | null>(null);
  const [directo, setDirecto] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deshacer, setDeshacer] = useState<TarjetaCambio["deshacer"][] | null>(null);
  const [pidiendo, startPedir] = useTransition();
  const [aplicando, startAplicar] = useTransition();
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K abre el panel; el botón "Pedir cambio" de cada sección lo abre con su contexto.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
      if (e.key === "Escape") setAbierto(false);
    }
    function pedir(e: Event) {
      const detalle = (e as CustomEvent<{ sobre?: string }>).detail;
      setSobre(detalle?.sobre ?? null);
      setAbierto(true);
    }
    window.addEventListener("keydown", tecla);
    window.addEventListener("asistente:abrir", pedir);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("asistente:abrir", pedir);
    };
  }, []);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  // En pantallas anchas el panel empuja el contenido en vez de taparlo; en pantallas chicas se superpone.
  useEffect(() => {
    const ancho = "28rem"; // = max-w-md del panel
    function ajustar() {
      document.body.style.paddingRight = abierto && window.innerWidth >= 1024 ? ancho : "";
    }
    document.body.style.transition = "padding-right 150ms ease";
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => {
      window.removeEventListener("resize", ajustar);
      document.body.style.paddingRight = "";
    };
  }, [abierto]);
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, pidiendo, abierto]);

  // Los editores (Diagnóstico, Propuesta) guardan lo que se ve en pantalla en su propio estado; tras aplicar
  // un cambio se recarga la página para que muestren lo nuevo, y la conversación se conserva en la sesión.
  const clave = `asistente:${proposalId}`;
  const recargar = useCallback(() => {
    try {
      sessionStorage.setItem(clave + ":abierto", "1");
    } catch {}
    // Deja que el efecto de abajo alcance a guardar la conversación antes de recargar.
    setTimeout(() => window.location.reload(), 200);
  }, [clave]);
  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem(clave);
      if (guardado) setMensajes(JSON.parse(guardado));
      if (sessionStorage.getItem(clave + ":abierto")) {
        sessionStorage.removeItem(clave + ":abierto");
        setAbierto(true);
      }
    } catch {}
  }, [clave]);
  useEffect(() => {
    try {
      sessionStorage.setItem(clave, JSON.stringify(mensajes.slice(-30)));
    } catch {}
  }, [clave, mensajes]);

  const pendientes = mensajes.flatMap((m) => m.tarjetas ?? []).filter((t) => t.estado === "pendiente").length;

  const marcar = useCallback((ids: string[], estado: Estado) => {
    setMensajes((prev) =>
      prev.map((m) => (m.tarjetas ? { ...m, tarjetas: m.tarjetas.map((t) => (ids.includes(t.id) ? { ...t, estado } : t)) } : m))
    );
  }, []);

  function aplicar(tarjetas: TarjetaUI[]) {
    if (tarjetas.length === 0) return;
    setError(null);
    startAplicar(async () => {
      const r = await aplicarCambios(proposalId, tarjetas.map((t) => t.atomo));
      if (r.error) {
        setError(r.error);
        return;
      }
      marcar(tarjetas.map((t) => t.id), "aplicada");
      setDeshacer(tarjetas.map((t) => t.deshacer).reverse());
      recargar();
    });
  }

  function deshacerUltimo() {
    if (!deshacer) return;
    setError(null);
    startAplicar(async () => {
      const r = await aplicarCambios(proposalId, deshacer);
      if (r.error) {
        setError(r.error);
        return;
      }
      setDeshacer(null);
      setMensajes((prev) => [...prev, { id: uid(), rol: "claude", texto: "Listo, deshice el último cambio." }]);
      recargar();
    });
  }

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || pidiendo) return;
    setError(null);
    setBorrador("");
    const historial: TurnoChat[] = mensajes.map((m) => ({ rol: m.rol, texto: m.texto }));
    const contextoSobre = sobre;
    setMensajes((prev) => [...prev, { id: uid(), rol: "usuario", texto: t, sobre: contextoSobre ?? undefined }]);
    startPedir(async () => {
      const r = await pedirCambios(proposalId, t, historial, { paso: PASOS[paso], sobre: contextoSobre });
      if (r.error) {
        setError(r.error);
        return;
      }
      const tarjetas: TarjetaUI[] = r.tarjetas.map((c) => ({ ...c, estado: "pendiente" }));
      const huboConfirmadas = (r.confirmadas?.length ?? 0) > 0;
      let recargado = false;
      setMensajes((prev) => [
        ...prev,
        {
          id: uid(),
          rol: "claude",
          texto: r.mensaje || (tarjetas.length ? "Esto es lo que propongo:" : "No encontré cambios para proponer."),
          tarjetas,
          noAplica: r.noAplica,
        },
      ]);
      // Lo que no cambia el precio se aplica solo si el asesor lo dejó activado.
      if (directo) {
        const libres = tarjetas.filter((c) => c.delta === 0);
        if (libres.length > 0) {
          const ra = await aplicarCambios(proposalId, libres.map((c) => c.atomo));
          if (ra.error) setError(ra.error);
          else {
            marcar(libres.map((c) => c.id), "aplicada");
            setDeshacer(libres.map((c) => c.deshacer).reverse());
            recargado = true;
            recargar();
          }
        }
      }
      // Preguntas que quedaron contestadas sin cambios: se recarga para que el Diagnóstico las muestre.
      if (huboConfirmadas && !recargado) recargar();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="no-print fixed bottom-5 right-5 z-40 flex min-h-11 items-center gap-2 rounded-pill bg-accent px-5 text-sm font-bold text-accent-ink shadow-lg"
        aria-label="Abrir el asistente de Claude (Ctrl+K)"
      >
        Claude
        {pendientes > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-ink px-1.5 text-xs text-accent">
            {pendientes}
          </span>
        )}
      </button>

      {abierto && (
        <aside
          role="dialog"
          aria-label="Asistente de Claude"
          className="no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-lg font-extrabold text-ink">Claude</p>
              <p className="text-xs text-muted">Paso: {PASOS[paso]} · propone, tú decides</p>
            </div>
            <button type="button" onClick={() => setAbierto(false)} className="min-h-11 rounded-pill px-4 text-sm font-semibold text-muted hover:bg-surface2">
              Cerrar
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensajes.length === 0 && (
              <p className="rounded-2xl bg-surface2 px-4 py-3 text-sm text-ink">
                Dime qué quieres ajustar. Te propongo los cambios con lo que mueven en el precio y tú decides cuáles aceptar.
              </p>
            )}
            {mensajes.map((m) =>
              m.rol === "usuario" ? (
                <div key={m.id} className="ml-8 rounded-2xl bg-accent px-4 py-2 text-sm text-accent-ink">
                  {m.sobre && <p className="mb-1 text-xs opacity-75">Sobre: {m.sobre}</p>}
                  {m.texto}
                </div>
              ) : (
                <div key={m.id} className="mr-4 space-y-2">
                  <p className="rounded-2xl bg-surface2 px-4 py-2 text-sm text-ink">{m.texto}</p>
                  {(m.tarjetas ?? []).map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-3 py-2">
                      <div className="min-w-0 flex-1 text-sm text-ink">
                        {t.etiqueta}
                        {t.delta !== 0 && (
                          <span className={`ml-2 whitespace-nowrap text-xs font-semibold ${t.delta > 0 ? "text-ink" : "text-muted"}`}>
                            {t.delta > 0 ? "+" : "−"} {formatCOP(Math.abs(t.delta))}
                          </span>
                        )}
                      </div>
                      {t.estado === "pendiente" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={aplicando}
                            onClick={() => aplicar([t])}
                            className="min-h-9 rounded-pill bg-accent px-4 text-xs font-bold text-accent-ink disabled:opacity-50"
                          >
                            Aceptar
                          </button>
                          <button
                            type="button"
                            onClick={() => marcar([t.id], "descartada")}
                            className="min-h-9 rounded-pill border border-border px-3 text-xs font-semibold text-muted"
                          >
                            Descartar
                          </button>
                        </div>
                      ) : (
                        <span className="rounded-pill bg-surface2 px-3 py-1 text-xs font-semibold text-muted">
                          {t.estado === "aplicada" ? "Aplicado" : "Descartado"}
                        </span>
                      )}
                    </div>
                  ))}
                  {(m.noAplica ?? []).map((n, i) => (
                    <p key={i} className="rounded-2xl bg-surface2 px-3 py-2 text-xs text-muted">
                      No apliqué «{n.etiqueta}»: {n.motivo}.
                    </p>
                  ))}
                  {(m.tarjetas ?? []).filter((t) => t.estado === "pendiente").length > 1 && (
                    <button
                      type="button"
                      disabled={aplicando}
                      onClick={() => aplicar((m.tarjetas ?? []).filter((t) => t.estado === "pendiente"))}
                      className="min-h-9 rounded-pill bg-accent px-4 text-xs font-bold text-accent-ink disabled:opacity-50"
                    >
                      Aceptar todo ({(m.tarjetas ?? []).filter((t) => t.estado === "pendiente").length})
                    </button>
                  )}
                </div>
              )
            )}
            {pidiendo && <p className="mr-4 w-fit rounded-2xl bg-surface2 px-4 py-2 text-sm text-muted">Pensando…</p>}
            <div ref={finRef} />
          </div>

          <footer className="space-y-2 border-t border-border px-4 py-3">
            {sobre && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded-pill bg-surface2 px-3 py-1 font-semibold">Sobre: {sobre}</span>
                <button type="button" className="underline" onClick={() => setSobre(null)}>
                  quitar
                </button>
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(SUGERENCIAS[paso] ?? []).map((s) => (
                <button key={s} type="button" onClick={() => enviar(s)} className="rounded-pill border border-border px-3 py-1.5 text-xs text-ink hover:bg-surface2">
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(borrador);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                maxLength={1500}
                placeholder="Escríbele a Claude…"
                aria-label="Mensaje para Claude"
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 rounded-pill border border-border bg-input-bg px-4 text-sm text-ink"
              />
              <button type="submit" disabled={pidiendo || !borrador.trim()} className="min-h-11 rounded-pill bg-accent px-5 text-sm font-bold text-accent-ink disabled:opacity-50">
                {pidiendo ? "…" : "Enviar"}
              </button>
            </form>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={directo} onChange={(e) => setDirecto(e.target.checked)} />
              Aplicar directo lo que no cambia el precio
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              {deshacer && (
                <button type="button" onClick={deshacerUltimo} disabled={aplicando} className="font-semibold underline">
                  Deshacer el último cambio
                </button>
              )}
              <span>Ctrl+K abre este panel</span>
            </div>
            {error && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {error}
              </p>
            )}
          </footer>
        </aside>
      )}
    </>
  );
}

/** Botón "Pedir cambio" para poner en cualquier sección: abre el panel con ese contexto. */
export function PedirCambioButton({ sobre, className }: { sobre: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("asistente:abrir", { detail: { sobre } }))}
      className={className ?? "no-print rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface2"}
    >
      Pedir cambio
    </button>
  );
}
