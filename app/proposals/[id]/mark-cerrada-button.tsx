"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAsCerrada } from "./actions";

export function MarkCerradaButton({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAsCerrada(proposalId);
          router.refresh();
        })
      }
      className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    >
      {isPending ? "Marcando..." : "Marcar como ganada"}
    </button>
  );
}
