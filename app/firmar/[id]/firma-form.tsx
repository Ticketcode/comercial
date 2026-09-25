"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { firmarCuentaCobro } from "./actions";
import { SignatureCanvas } from "./signature-canvas";

export function FirmaForm({ id, nombreSugerido }: { id: string; nombreSugerido: string }) {
  const [nombre, setNombre] = useState(nombreSugerido);
  const [firmaImagen, setFirmaImagen] = useState<string | null>(null);
  const [aceptado, setAceptado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await firmarCuentaCobro(id, nombre, firmaImagen);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 border-t border-neutral-200 pt-6">
      <p className="text-sm font-medium text-neutral-900">Firma</p>
      <p className="text-xs text-neutral-500">
        Escribe tu nombre completo, firma con el dedo o el mouse en el recuadro, y confirma para
        aceptar esta cuenta de cobro.
      </p>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tu nombre completo"
        required
        className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
      />
      <SignatureCanvas onChange={setFirmaImagen} />
      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={aceptado}
          onChange={(e) => setAceptado(e.target.checked)}
          className="h-4 w-4"
        />
        Confirmo que los datos de esta cuenta de cobro son correctos.
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !aceptado || !nombre.trim() || !firmaImagen}
        className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "Firmando..." : "Firmar"}
      </button>
    </form>
  );
}
