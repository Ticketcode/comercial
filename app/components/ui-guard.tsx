"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/**
 * Piezas compartidas de protección al usuario:
 *  - useUnsavedChanges(estado): detecta cambios sin guardar y avisa antes de salir
 *    (cerrar/recargar la pestaña o hacer clic en cualquier enlace interno).
 *  - useConfirm(): cuadro de confirmación dentro de la página (reemplaza a window.confirm,
 *    que algunos navegadores bloquean).
 */

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Ctx {
  setDirty: (id: string, dirty: boolean) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const GuardContext = createContext<Ctx | null>(null);

function useGuard(): Ctx {
  const ctx = useContext(GuardContext);
  if (!ctx) throw new Error("UiGuardProvider no está montado.");
  return ctx;
}

export function useConfirm() {
  return useGuard().confirm;
}

/** Devuelve si hay cambios sin guardar y cómo marcarlos como guardados. */
export function useUnsavedChanges(value: unknown) {
  const { setDirty } = useGuard();
  const id = useId();
  const serialized = JSON.stringify(value);
  const baseline = useRef<string | null>(null);
  if (baseline.current === null) baseline.current = serialized;
  const latest = useRef(serialized);
  latest.current = serialized;
  const [, force] = useState(0);
  const dirty = serialized !== baseline.current;

  useEffect(() => {
    setDirty(id, dirty);
  }, [dirty, id, setDirty]);
  useEffect(() => () => setDirty(id, false), [id, setDirty]);

  /** Foto del estado actual: tomarla al empezar a guardar y pasarla a markSaved. */
  const snapshot = useCallback(() => latest.current, []);
  const markSaved = useCallback((snap?: string) => {
    baseline.current = snap ?? latest.current;
    force((n) => n + 1);
  }, []);

  /** Adopta `next` (con la misma forma que el estado vigilado) como nuevo punto de partida. */
  const resetTo = useCallback((next: unknown) => {
    baseline.current = JSON.stringify(next);
    force((n) => n + 1);
  }, []);

  return { dirty, snapshot, markSaved, resetTo };
}

function Modal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {message && <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={danger ? { backgroundColor: "#dc2626", color: "#ffffff" } : undefined}
            className={`rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 ${
              danger ? "" : "bg-neutral-900 text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UiGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dirtyIds = useRef(new Set<string>());
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyIds.current.add(id);
    else dirtyIds.current.delete(id);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    []
  );

  function answerConfirm(ok: boolean) {
    confirmState?.resolve(ok);
    setConfirmState(null);
  }

  useEffect(() => {
    // Cerrar o recargar la pestaña con cambios sin guardar.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyIds.current.size === 0) return;
      e.preventDefault();
      e.returnValue = "";
    }

    // Clic en un enlace interno con cambios sin guardar. Va en la fase de captura para
    // adelantarse al <Link> de Next.js.
    function onClick(e: MouseEvent) {
      if (dirtyIds.current.size === 0) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveHref(url.pathname + url.search + url.hash);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <GuardContext.Provider value={{ setDirty, confirm }}>
      {children}
      {confirmState && (
        <Modal
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel ?? "Aceptar"}
          cancelLabel={confirmState.cancelLabel ?? "Cancelar"}
          danger={confirmState.danger}
          onConfirm={() => answerConfirm(true)}
          onCancel={() => answerConfirm(false)}
        />
      )}
      {leaveHref && (
        <Modal
          title="Tienes cambios sin guardar"
          message="Si sales ahora se perderán los cambios que no hayas guardado."
          confirmLabel="Salir sin guardar"
          cancelLabel="Seguir editando"
          danger
          onConfirm={() => {
            const href = leaveHref;
            dirtyIds.current.clear();
            setLeaveHref(null);
            router.push(href);
          }}
          onCancel={() => setLeaveHref(null)}
        />
      )}
    </GuardContext.Provider>
  );
}

/** Estado junto al botón Guardar: guardando / cambios sin guardar / guardado / error. */
export function SaveStatus({
  dirty,
  isPending,
  message,
  className = "",
}: {
  dirty: boolean;
  isPending: boolean;
  message: string | null;
  className?: string;
}) {
  let text: string | null = null;
  let tone = "text-neutral-500";
  if (isPending) {
    text = "Guardando…";
  } else if (message?.startsWith("Error")) {
    text = message;
    tone = "text-red-600";
  } else if (dirty) {
    text = "● Cambios sin guardar";
    tone = "text-amber-600";
  } else if (message) {
    text = `✓ ${message.replace(/^✓\s*/, "")}`;
    tone = "text-emerald-600";
  }

  return (
    <p role="status" aria-live="polite" className={`text-xs ${tone} ${className}`}>
      {text}
    </p>
  );
}
