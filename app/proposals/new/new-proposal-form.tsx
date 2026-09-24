"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProposal, type NewProposalState } from "./actions";

const initialState: NewProposalState = { error: null };

const inputClass =
  "h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
const labelClass = "text-sm font-medium text-neutral-700";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
    >
      {pending ? "Creando..." : "Crear propuesta y continuar al Tarifario"}
    </button>
  );
}

export function NewProposalForm() {
  const [state, formAction] = useFormState(createProposal, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">Cliente</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="client_name">
              Nombre del contacto
            </label>
            <input id="client_name" name="client_name" required className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="client_company">
              Empresa
            </label>
            <input id="client_company" name="client_company" className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">Evento</legend>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="event_name">
            Nombre del evento
          </label>
          <input id="event_name" name="event_name" required className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="modality">
              Modalidad
            </label>
            <select id="modality" name="modality" required className={inputClass} defaultValue="presencial">
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrido">Híbrido</option>
              <option value="mundo_virtual">Mundo virtual</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="city">
              Ciudad
            </label>
            <input id="city" name="city" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="aforo">
              Aforo
            </label>
            <input id="aforo" name="aforo" type="number" min={0} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="event_start_date">
              Fecha inicio
            </label>
            <input id="event_start_date" name="event_start_date" type="date" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="event_end_date">
              Fecha fin
            </label>
            <input id="event_end_date" name="event_end_date" type="date" className={inputClass} />
          </div>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
