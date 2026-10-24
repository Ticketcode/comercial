"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOperationalEvent, type CreateOperationalEventState } from "./actions";

const initialState: CreateOperationalEventState = { error: null };
const inputClass =
  "h-9 w-full rounded-field border border-border bg-input-bg px-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 items-center rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink disabled:opacity-50"
    >
      {pending ? "Creando..." : "Crear evento"}
    </button>
  );
}

export function NewEventForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createOperationalEvent, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center rounded-pill bg-surface px-5 text-sm font-semibold text-ink"
      >
        + Agregar evento operativo
      </button>
    );
  }

  return (
    <div className="rounded-card bg-surface p-5">
      <p className="mb-1 text-sm font-bold text-ink">Agregar evento operativo</p>
      <p className="mb-3 text-xs text-muted">
        Para eventos que ya operan y no pasaron por el flujo comercial (Tarifario/Propuesta/
        Contrato) — entra directo a Producción sin llenar el Tarifario.
      </p>
      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="event_name" aria-label="Nombre del evento" placeholder="Nombre del evento" required className={inputClass} />
        <input name="client_name" aria-label="Cliente" placeholder="Cliente" required className={inputClass} />
        <input name="client_company" aria-label="Empresa (opcional)" placeholder="Empresa (opcional)" className={inputClass} />
        <input name="city" aria-label="Ciudad" placeholder="Ciudad" className={inputClass} />
        <select name="modality" aria-label="Modalidad" defaultValue="presencial" className={inputClass}>
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
          <option value="hibrido">Híbrido</option>
          <option value="mundo_virtual">Mundo virtual</option>
        </select>
        <div className="flex items-center gap-2">
          <SubmitButton />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
