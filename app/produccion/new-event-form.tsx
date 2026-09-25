"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOperationalEvent, type CreateOperationalEventState } from "./actions";

const initialState: CreateOperationalEventState = { error: null };
const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
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
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        + Agregar evento operativo
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="mb-1 text-sm font-semibold text-neutral-900">Agregar evento operativo</p>
      <p className="mb-3 text-xs text-neutral-500">
        Para eventos que ya operan y no pasaron por el flujo comercial (Tarifario/Propuesta/
        Contrato) — entra directo a Producción sin llenar el Tarifario.
      </p>
      <form action={formAction} className="grid grid-cols-2 gap-3">
        <input name="event_name" placeholder="Nombre del evento" required className={inputClass} />
        <input name="client_name" placeholder="Cliente" required className={inputClass} />
        <input name="client_company" placeholder="Empresa (opcional)" className={inputClass} />
        <input name="city" placeholder="Ciudad" className={inputClass} />
        <select name="modality" defaultValue="presencial" className={inputClass}>
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
            className="text-xs text-neutral-500 hover:text-neutral-800"
          >
            Cancelar
          </button>
        </div>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
