"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/app/components/ui-guard";
import { callSafe, saveErrorMessage } from "@/lib/errors";
import { formatCOP } from "@/lib/pricing/summary";
import {
  deleteVersion,
  markVersionSent,
  recordAcceptance,
  saveVersion,
  setFinalVersion,
  undoAcceptance,
} from "./actions";

export interface VersionItem {
  id: string;
  number: number;
  note: string | null;
  isFinal: boolean;
  status: "borrador" | "enviada" | "aceptada";
  createdAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  acceptedByCargo: string | null;
  acceptanceNote: string | null;
  valorAntesIva: number;
  totalConIva: number;
  /** Cambio del valor antes de IVA frente a la versión anterior (null en la primera). */
  deltaAntesIva: number | null;
  /** Qué cambió frente a la versión anterior. */
  changes: string[];
}

const inputClass =
  "h-9 w-full rounded-field border border-border bg-input-bg px-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent";

const STATUS_LABEL: Record<VersionItem["status"], string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
};

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800"
        : "bg-surface2 text-muted";
  return <span className={`rounded-pill px-3 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function VersionesPanel({
  proposalId,
  versions,
  unsavedChanges,
}: {
  proposalId: string;
  versions: VersionItem[];
  /** Cambios de la propuesta de hoy frente a la última versión guardada (vacío si no hay versiones). */
  unsavedChanges: string[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acc, setAcc] = useState({ name: "", cargo: "", date: "", note: "" });

  const nextNumber = (versions[0]?.number ?? 0) + 1;

  function run(action: () => Promise<{ error: string | null }>, okMessage: string, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await callSafe(action);
      if (result.error) {
        setMessage(saveErrorMessage(result.error));
        return;
      }
      setMessage(okMessage);
      after?.();
      router.refresh();
    });
  }

  async function handleDelete(v: VersionItem) {
    const ok = await confirm({
      title: `¿Borrar la V${v.number}?`,
      message: "Se pierde esa foto de la propuesta. La propuesta en sí no cambia.",
      confirmLabel: "Borrar versión",
    });
    if (ok) run(() => deleteVersion(proposalId, v.id), `V${v.number} borrada.`);
  }

  async function handleUndoAcceptance(v: VersionItem) {
    const ok = await confirm({
      title: `¿Deshacer la aceptación de la V${v.number}?`,
      message: "La versión vuelve a quedar como enviada. Úsalo solo si se registró por error.",
      confirmLabel: "Deshacer aceptación",
    });
    if (ok) run(() => undoAcceptance(proposalId, v.id), "Aceptación deshecha.");
  }

  function handleAccept(v: VersionItem) {
    run(
      () => recordAcceptance(proposalId, v.id, acc),
      `Aceptación de la V${v.number} registrada.`,
      () => {
        setAccepting(null);
        setAcc({ name: "", cargo: "", date: "", note: "" });
      }
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Cada versión es una foto de la propuesta: precio, componentes, acuerdo comercial y presentación. La versión
        <strong> final</strong> es la que se envía al cliente para que la acepte; sobre esa se registra la aceptación y
        de ahí parte el contrato.
      </p>

      <section className="rounded-card bg-surface p-5">
        <h3 className="font-display text-sm font-bold text-ink">Guardar una versión nueva</h3>
        <p className="mt-1 text-xs text-muted">
          {versions.length === 0
            ? "Todavía no hay versiones. Guarda la primera cuando tengas lista la propuesta para presentar."
            : unsavedChanges.length === 0
              ? "La propuesta no ha cambiado desde la última versión guardada."
              : `La propuesta cambió ${unsavedChanges.length} cosa(s) desde la última versión:`}
        </p>
        {unsavedChanges.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink">
            {unsavedChanges.slice(0, 8).map((c) => (
              <li key={c}>{c}</li>
            ))}
            {unsavedChanges.length > 8 && <li>y {unsavedChanges.length - 8} más</li>}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            className={`${inputClass} max-w-md`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={versions.length === 0 ? "Ej.: propuesta para la reunión de socialización" : "Ej.: el cliente pidió 4 cuotas"}
            aria-label="Nota de la versión"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => saveVersion(proposalId, note), `V${nextNumber} guardada.`, () => setNote(""))}
            className="btn btn-primary btn-sm"
          >
            {isPending ? "Guardando..." : `Guardar como V${nextNumber}`}
          </button>
        </div>
        {message && (
          <p className={`mt-2 text-xs ${message.startsWith("Error") ? "text-red-600" : "text-muted"}`}>{message}</p>
        )}
      </section>

      {versions.map((v) => (
        <section
          key={v.id}
          className={`rounded-card bg-surface p-5 ${v.isFinal ? "ring-2 ring-accent" : ""}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold text-ink">V{v.number}</h3>
              {v.isFinal && <Tag tone="ok">Final</Tag>}
              {(v.status !== "borrador" || v.isFinal) && (
                <Tag tone={v.status === "aceptada" ? "ok" : "warn"}>{STATUS_LABEL[v.status]}</Tag>
              )}
            </div>
            <span className="text-xs text-muted">{new Date(v.createdAt).toLocaleString("es-CO")}</span>
          </div>
          {v.note && <p className="mt-1 text-sm text-muted">{v.note}</p>}

          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Valor antes de IVA</dt>
              <dd className="text-lg font-bold text-ink">{formatCOP(v.valorAntesIva)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total con IVA</dt>
              <dd className="text-lg font-bold text-ink">{formatCOP(v.totalConIva)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Frente a la versión anterior</dt>
              <dd
                className={`text-lg font-bold ${
                  v.deltaAntesIva === null || Math.round(v.deltaAntesIva) === 0
                    ? "text-muted"
                    : v.deltaAntesIva > 0
                      ? "text-red-700"
                      : "text-emerald-700"
                }`}
              >
                {v.deltaAntesIva === null
                  ? "—"
                  : Math.round(v.deltaAntesIva) === 0
                    ? "Sin cambio de precio"
                    : `${v.deltaAntesIva > 0 ? "+" : "−"} ${formatCOP(Math.abs(v.deltaAntesIva))}`}
              </dd>
            </div>
          </dl>

          {v.changes.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                Qué cambió frente a V{v.number - 1} ({v.changes.length})
              </summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink">
                {v.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}

          {v.status === "aceptada" && (
            <p className="mt-3 rounded-field bg-emerald-50 p-3 text-sm text-emerald-900">
              Aceptada el {v.acceptedAt ? new Date(v.acceptedAt).toLocaleDateString("es-CO") : "—"} por{" "}
              <strong>{v.acceptedByName}</strong>
              {v.acceptedByCargo ? ` (${v.acceptedByCargo})` : ""}.{v.acceptanceNote ? ` ${v.acceptanceNote}` : ""} El
              contrato parte de esta versión.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={`/proposals/${proposalId}/presentacion?v=${v.id}`}
              className="btn btn-secondary btn-sm no-underline"
            >
              Ver presentación
            </Link>
            {v.status !== "aceptada" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => setFinalVersion(proposalId, v.id, !v.isFinal),
                    v.isFinal ? `V${v.number} ya no es la final.` : `V${v.number} es ahora la versión final.`
                  )
                }
                className="btn btn-secondary btn-sm"
              >
                {v.isFinal ? "Quitar marca de final" : "Marcar como final"}
              </button>
            )}
            {v.isFinal && v.status === "borrador" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => markVersionSent(proposalId, v.id), `V${v.number} marcada como enviada.`)}
                className="btn btn-secondary btn-sm"
              >
                Marcar como enviada
              </button>
            )}
            {v.isFinal && v.status !== "aceptada" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setAccepting(accepting === v.id ? null : v.id);
                  setAcc({ name: "", cargo: "", date: "", note: "" });
                }}
                className="btn btn-primary btn-sm"
              >
                Registrar aceptación
              </button>
            )}
            {v.status === "aceptada" && (
              <>
                <Link href={`/proposals/${proposalId}/contrato`} className="btn btn-primary btn-sm no-underline">
                  Ir al contrato
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUndoAcceptance(v)}
                  className="btn btn-secondary btn-sm"
                >
                  Deshacer aceptación
                </button>
              </>
            )}
            {!v.isFinal && v.status === "borrador" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(v)}
                className="btn btn-secondary btn-sm"
              >
                Borrar
              </button>
            )}
          </div>

          {accepting === v.id && (
            <div className="mt-4 space-y-3 rounded-field border border-border p-4">
              <p className="text-xs text-muted">
                Registra que el cliente aceptó esta propuesta. No es la firma del contrato: el contrato viene después.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium text-muted">
                  Quién aceptó
                  <input className={inputClass} value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} />
                </label>
                <label className="text-xs font-medium text-muted">
                  Cargo
                  <input className={inputClass} value={acc.cargo} onChange={(e) => setAcc({ ...acc, cargo: e.target.value })} />
                </label>
                <label className="text-xs font-medium text-muted">
                  Fecha (vacío = hoy)
                  <input type="date" className={inputClass} value={acc.date} onChange={(e) => setAcc({ ...acc, date: e.target.value })} />
                </label>
              </div>
              <label className="block text-xs font-medium text-muted">
                Nota (cómo llegó la aceptación: correo, reunión, etc.)
                <input className={inputClass} value={acc.note} onChange={(e) => setAcc({ ...acc, note: e.target.value })} />
              </label>
              <div className="flex gap-2">
                <button type="button" disabled={isPending} onClick={() => handleAccept(v)} className="btn btn-primary btn-sm">
                  Guardar aceptación
                </button>
                <button type="button" onClick={() => setAccepting(null)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
