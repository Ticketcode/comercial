"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/app/components/ui-guard";
import { markAsCerrada } from "./actions";

export function MarkCerradaButton({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const confirm = useConfirm();

  async function handleClick() {
    setError(null);
    const ok = await confirm({
      title: "¿Marcar esta propuesta como ganada?",
      message:
        "Pasará al área de Producción (viáticos, legalización, presupuesto, actividades y cuentas de cobro). La aplicación no tiene una opción para revertirlo.",
      confirmLabel: "Marcar como ganada",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const result = await markAsCerrada(proposalId);
        if (result.error) {
          setError(`No se pudo marcar como ganada: ${result.error}`);
          return;
        }
        router.refresh();
      } catch {
        setError("No se pudo marcar como ganada. Revisa tu conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="flex min-h-11 items-center rounded-pill border-[1.5px] border-emerald-600 px-5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      >
        {isPending ? "Marcando..." : "Marcar como ganada"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
