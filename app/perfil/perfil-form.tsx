"use client";

import { useState, useTransition } from "react";
import type { Profile } from "@/lib/types";
import { LabeledField } from "@/app/components/labeled-field";
import { SaveStatus, useUnsavedChanges } from "@/app/components/ui-guard";
import { callSafe, saveErrorMessage } from "@/lib/errors";
import { savePerfil } from "./actions";

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

export function PerfilForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [cargo, setCargo] = useState(profile.cargo ?? "");
  const [correo, setCorreo] = useState(profile.correo ?? "");
  const [telefono, setTelefono] = useState(profile.telefono ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { dirty, resetTo } = useUnsavedChanges({ fullName, cargo, correo, telefono });

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const payload = { full_name: fullName, cargo, correo, telefono };
      const result = await callSafe(() => savePerfil(payload));
      if (result.error) {
        setMessage(saveErrorMessage(result.error));
        return;
      }
      setMessage("Guardado.");
      resetTo(payload);
    });
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <LabeledField label="Nombre completo">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
      </LabeledField>
      <LabeledField label="Cargo">
        <input
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="Ej. Asesor comercial"
          className={inputClass}
        />
      </LabeledField>
      <LabeledField label="Correo de contacto">
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="nombre@ticketcode.co"
          className={inputClass}
        />
      </LabeledField>
      <LabeledField label="Teléfono de contacto">
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
      </LabeledField>
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="btn btn-primary"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <SaveStatus dirty={dirty} isPending={isPending} message={message} />
      </div>
    </div>
  );
}
