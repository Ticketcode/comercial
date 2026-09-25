"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedPresupuestoFromTemplate } from "./actions";

export function SeedPresupuestoButton({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
      <p className="text-sm text-neutral-600">
        Todavía no hay presupuesto para este evento. Carga la plantilla base (Proveedores,
        Honorarios, Alimentación y Hotel, Transporte, Varios) para empezar — puedes agregar o
        quitar líneas libremente después.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await seedPresupuestoFromTemplate(proposalId);
            router.refresh();
          })
        }
        className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "Cargando..." : "Cargar plantilla base"}
      </button>
    </div>
  );
}
