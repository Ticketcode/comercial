"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedPresupuestoFromTemplate } from "./actions";

export function SeedPresupuestoButton({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
      <p className="text-sm text-neutral-600">
        Todavía no hay presupuesto para este evento. Carga la plantilla base (Proveedores,
        Honorarios, Alimentación y Hotel, Transporte, Varios) para empezar — ya trae prellenados
        los valores que se pueden calcular del Tarifario, y puedes agregar, quitar o editar
        líneas libremente después.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await seedPresupuestoFromTemplate(proposalId);
            if (result?.error) {
              setError(result.error);
            } else {
              router.refresh();
            }
          })
        }
        className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "Cargando..." : "Cargar plantilla base"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">Error: {error}</p>}
    </div>
  );
}
