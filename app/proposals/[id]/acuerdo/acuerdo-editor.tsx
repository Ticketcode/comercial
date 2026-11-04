"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyCommercialDiscount, formatCOP } from "@/lib/pricing/summary";
import { PedirCambioButton } from "../asistente/asistente-panel";
import { balancearPesos, guardarAcuerdo, sugerirAcuerdo, type ConceptoAcuerdo } from "./actions";

type Concepto = ConceptoAcuerdo & { notas: string };

const card = "rounded-2xl border border-border bg-surface p-5";

export function AcuerdoEditor({
  proposalId,
  valorAntesIva,
  objecionInicial,
  descuentoInicial,
  conceptosIniciales,
}: {
  proposalId: string;
  valorAntesIva: number;
  objecionInicial: string;
  descuentoInicial: number;
  conceptosIniciales: Concepto[];
}) {
  const router = useRouter();
  const [objecion, setObjecion] = useState(objecionInicial);
  const [descuento, setDescuento] = useState(descuentoInicial);
  const [conceptos, setConceptos] = useState(conceptosIniciales);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error" | "info"; texto: string } | null>(null);
  const [pensando, startPensar] = useTransition();
  const [guardando, startGuardar] = useTransition();

  const incluidos = conceptos.filter((c) => c.included);
  const suma = incluidos.reduce((s, c) => s + Number(c.pct), 0);
  const d = applyCommercialDiscount(valorAntesIva, descuento);

  function cambiar(id: string, parche: Partial<Concepto>) {
    setConceptos((prev) => prev.map((c) => (c.id === id ? { ...c, ...parche } : c)));
  }

  async function alternar(id: string, incluir: boolean) {
    const sig = conceptos.map((c) => (c.id === id ? { ...c, included: incluir } : c));
    const balanceados = await balancearPesos(sig);
    setConceptos(sig.map((c) => ({ ...c, pct: balanceados.find((b) => b.id === c.id)?.pct ?? c.pct })));
  }

  function sugerir() {
    setMsg(null);
    startPensar(async () => {
      const r = await sugerirAcuerdo(proposalId, objecion, conceptos, conceptos.map((c) => ({ label: c.label, notes: c.notas })));
      if (r.error) {
        setMsg({ tipo: "error", texto: r.error });
        return;
      }
      setDescuento(r.descuentoPct);
      setConceptos(conceptos.map((c) => ({ ...c, ...(r.conceptos.find((x) => x.id === c.id) ?? {}) })));
      setMsg({ tipo: "info", texto: `Propuesta de NOVA: ${r.razon} Es una sugerencia: ajústala antes de guardar.` });
    });
  }

  function guardar() {
    setMsg(null);
    startGuardar(async () => {
      const r = await guardarAcuerdo(proposalId, { objecion, descuentoPct: descuento, conceptos });
      if (r.error) setMsg({ tipo: "error", texto: r.error });
      else {
        setMsg({ tipo: "ok", texto: "Acuerdo guardado." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="font-display text-xl font-extrabold text-ink">Objeción del cliente</h2>
        <p className="mt-1 text-sm text-muted">Cuenta qué dijo el cliente en la reunión de socialización y su estrategia de patrocinio.</p>
        <textarea
          value={objecion}
          onChange={(e) => setObjecion(e.target.value)}
          rows={4}
          maxLength={4000}
          spellCheck
          lang="es"
          aria-label="Objeción del cliente"
          placeholder="Ej. El presupuesto está alto; dentro de sus paquetes nos pueden dar visibilidad, hospitalidad y menciones."
          className="mt-3 w-full rounded-xl border border-border bg-input-bg p-3 text-sm text-ink"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={sugerir} disabled={pensando || !objecion.trim()} className="min-h-11 rounded-pill bg-accent px-5 text-sm font-bold text-accent-ink disabled:opacity-50">
            {pensando ? "Pensando…" : "Sugerir acuerdo con NOVA"}
          </button>
          <PedirCambioButton sobre="el acuerdo comercial" />
        </div>
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-extrabold text-ink">Conceptos del acuerdo</h2>
        <p className="mt-1 text-sm text-muted">El peso de cada concepto es parte del descuento total; entre los marcados deben sumar 100%.</p>
        <ul className="mt-3 divide-y divide-border">
          {conceptos.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={c.included} onChange={(e) => alternar(c.id, e.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{c.label}</span>
                  {c.notas && <span className="block text-xs text-muted">{c.notas}</span>}
                </span>
              </label>
              {c.included && (
                <span className="flex items-center gap-1 text-sm text-ink">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={c.pct}
                    onChange={(e) => cambiar(c.id, { pct: Number(e.target.value) || 0 })}
                    aria-label={`Peso de ${c.label}`}
                    className="min-h-10 w-20 rounded-field border border-border bg-input-bg px-2 text-right text-sm"
                  />
                  %
                </span>
              )}
            </li>
          ))}
        </ul>
        {incluidos.length > 0 && (
          <p className={`mt-3 text-sm font-semibold ${suma === 100 ? "text-highlight-ink" : "text-danger"}`}>
            Suma de pesos: {suma}% {suma !== 100 && "(debe ser 100%)"}
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-extrabold text-ink">Descuento por el acuerdo</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <input
            type="range"
            min={0}
            max={30}
            value={Math.min(descuento, 30)}
            onChange={(e) => setDescuento(Number(e.target.value))}
            aria-label="Descuento por acuerdo"
            className="min-w-56 flex-1"
          />
          <span className="font-display text-2xl font-extrabold text-ink">{descuento}%</span>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Valor sin descuento</dt>
            <dd className="font-semibold text-ink">{formatCOP(valorAntesIva)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Descuento ({descuento}%)</dt>
            <dd className="font-semibold text-ink">− {formatCOP(d.descuento)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Valor con descuento (antes de IVA)</dt>
            <dd className="font-semibold text-ink">{formatCOP(d.valorConDescuento)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Total con IVA</dt>
            <dd className="font-semibold text-ink">{formatCOP(d.valorConDescuento + d.ivaFinal)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={guardar} disabled={guardando} className="min-h-11 rounded-pill bg-accent px-6 text-sm font-bold text-accent-ink disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar acuerdo"}
        </button>
        {msg && (
          <p role={msg.tipo === "error" ? "alert" : "status"} className={`text-sm font-semibold ${msg.tipo === "error" ? "text-danger" : "text-ink"}`}>
            {msg.texto}
          </p>
        )}
      </div>
    </div>
  );
}
