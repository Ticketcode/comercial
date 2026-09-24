"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const inputClass =
  "h-11 w-full rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-md bg-neutral-900 text-base font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
    >
      {pending ? "Ingresando..." : "Ingresar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="tu@ticketcode.com"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
