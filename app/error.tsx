"use client";

import { useEffect } from "react";
import Link from "next/link";
import { friendlyError } from "@/lib/errors";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">Algo salió mal</h1>
      <p className="mt-2 text-sm text-neutral-600">
        No pudimos cargar esta pantalla. Tus datos guardados están a salvo; lo que no hayas guardado
        puede haberse perdido.
      </p>
      <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
        {friendlyError(error)}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Reintentar
        </button>
        <Link
          href="/proposals"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
