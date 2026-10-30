"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Modality } from "@/lib/types";
import { callSafe, saveErrorMessage } from "@/lib/errors";
import { saveProposalBasics } from "./basics-actions";

const inputClass =
  "h-9 w-full rounded-field border border-border bg-input-bg px-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const labelClass = "text-xs font-semibold text-muted";

interface Props {
  proposalId: string;
  clientId: string | null;
  eventName: string;
  modality: Modality;
  city: string;
  lugar: string;
  aforo: number | null;
  aforoVirtual: number;
  dias: number;
  eventStartDate: string | null;
  eventEndDate: string | null;
  clientName: string;
  clientCompany: string;
  clientCargo: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function EditBasicsPanel(initial: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function patch<K extends keyof Props>(key: K, value: Props[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await callSafe(() =>
        saveProposalBasics({
          proposalId: form.proposalId,
          clientId: form.clientId,
          eventName: form.eventName,
          modality: form.modality,
          city: form.city,
          lugar: form.lugar,
          aforo: form.aforo,
          aforoVirtual: form.aforoVirtual,
          dias: form.dias,
          eventStartDate: form.eventStartDate,
          eventEndDate: form.eventEndDate,
          clientName: form.clientName,
          clientCompany: form.clientCompany,
          clientCargo: form.clientCargo,
        })
      );
      setMessage(result.error ? saveErrorMessage(result.error) : "Guardado.");
      if (!result.error) router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print text-xs font-semibold text-muted underline hover:text-ink"
      >
        Editar datos del cliente y el evento
      </button>
    );
  }

  return (
    <section className="no-print rounded-card bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">Datos del cliente y el evento</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Cerrar
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Nombre del contacto">
          <input
            value={form.clientName}
            onChange={(e) => patch("clientName", e.target.value)}
            spellCheck
            lang="es"
            className={inputClass}
          />
        </Field>
        <Field label="Empresa">
          <input
            value={form.clientCompany}
            onChange={(e) => patch("clientCompany", e.target.value)}
            spellCheck
            lang="es"
            className={inputClass}
          />
        </Field>
        <Field label="Cargo del contacto">
          <input
            value={form.clientCargo}
            onChange={(e) => patch("clientCargo", e.target.value)}
            spellCheck
            lang="es"
            className={inputClass}
          />
        </Field>
        <Field label="Nombre del evento">
          <input
            value={form.eventName}
            onChange={(e) => patch("eventName", e.target.value)}
            spellCheck
            lang="es"
            className={inputClass}
          />
        </Field>
        <Field label="Modalidad">
          <select
            value={form.modality}
            onChange={(e) => patch("modality", e.target.value as Modality)}
            className={inputClass}
          >
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="hibrido">Híbrido</option>
            <option value="mundo_virtual">Mundo virtual</option>
          </select>
        </Field>
        <Field label="Ciudad">
          <input
            value={form.city}
            onChange={(e) => patch("city", e.target.value)}
            spellCheck
            lang="es"
            className={inputClass}
          />
        </Field>
        <Field label="Lugar">
          <input
            value={form.lugar}
            onChange={(e) => patch("lugar", e.target.value)}
            spellCheck
            lang="es"
            className={inputClass}
          />
        </Field>
        <Field label="Días de operación">
          <input
            type="number"
            min={0}
            step="0.5"
            value={form.dias}
            onChange={(e) => patch("dias", Number(e.target.value) || 0)}
            className={inputClass}
          />
        </Field>
        <Field label="Aforo presencial">
          <input
            type="number"
            min={0}
            value={form.aforo ?? ""}
            onChange={(e) => patch("aforo", e.target.value === "" ? null : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Aforo virtual">
          <input
            type="number"
            min={0}
            value={form.aforoVirtual}
            onChange={(e) => patch("aforoVirtual", Number(e.target.value) || 0)}
            className={inputClass}
          />
        </Field>
        <Field label="Fecha inicio">
          <input
            type="date"
            value={form.eventStartDate ?? ""}
            onChange={(e) => patch("eventStartDate", e.target.value || null)}
            className={inputClass}
          />
        </Field>
        <Field label="Fecha fin">
          <input
            type="date"
            value={form.eventEndDate ?? ""}
            onChange={(e) => patch("eventEndDate", e.target.value || null)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex min-h-10 items-center rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        {message && <span className="text-xs text-muted">{message}</span>}
      </div>
    </section>
  );
}
