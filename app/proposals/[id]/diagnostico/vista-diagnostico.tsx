"use client";

import { useState, type ReactNode } from "react";

/** Diagnóstico guiado por defecto; la tabla completa (modo avanzado) se abre a pedido. */
export function VistaDiagnostico({
  guiado,
  avanzado,
  etiquetaGuiado = "Guiado con NOVA",
  etiquetaAvanzado = "Modo avanzado (tabla completa)",
}: {
  guiado: ReactNode;
  avanzado: ReactNode;
  etiquetaGuiado?: string;
  etiquetaAvanzado?: string;
}) {
  const [verAvanzado, setVerAvanzado] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Modo del diagnóstico">
        <button
          type="button"
          role="tab"
          aria-selected={!verAvanzado}
          onClick={() => setVerAvanzado(false)}
          className={`min-h-10 rounded-pill px-5 text-sm font-semibold ${!verAvanzado ? "bg-accent text-accent-ink" : "bg-surface text-muted"}`}
        >
          {etiquetaGuiado}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={verAvanzado}
          onClick={() => setVerAvanzado(true)}
          className={`min-h-10 rounded-pill px-5 text-sm font-semibold ${verAvanzado ? "bg-accent text-accent-ink" : "bg-surface text-muted"}`}
        >
          {etiquetaAvanzado}
        </button>
      </div>
      {verAvanzado ? avanzado : guiado}
    </div>
  );
}
