"use client";

import { useState, useTransition } from "react";
import type { Proposal, ProposalContractFields } from "@/lib/types";
import { MobileSaveBar, SaveStatus, useUnsavedChanges } from "@/app/components/ui-guard";
import { callSafe, problemsMessage, saveErrorMessage } from "@/lib/errors";
import { saveContractFields, type ContractFieldsInput } from "./actions";

const inputClass =
  "h-9 w-full rounded-field border border-border bg-input-bg px-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const labelClass = "text-xs font-medium text-muted";

function defaults(fields: ProposalContractFields | null): ContractFieldsInput {
  return {
    contratante_nombre: fields?.contratante_nombre ?? "",
    contratante_cedula: fields?.contratante_cedula ?? "",
    contratante_nit: fields?.contratante_nit ?? "",
    contratante_ciudad: fields?.contratante_ciudad ?? "",
    contratante_representante_legal: fields?.contratante_representante_legal ?? "",
    contrato_numero: fields?.contrato_numero ?? "",
    contrato_fecha: fields?.contrato_fecha ?? new Date().toISOString().slice(0, 10),
    objeto: fields?.objeto ?? "",
    valor_total: fields?.valor_total ?? null,
    contratante_cedula_ciudad: fields?.contratante_cedula_ciudad ?? "",
    contratante_direccion_ciudad: fields?.contratante_direccion_ciudad ?? "",
    contratante_direccion: fields?.contratante_direccion ?? "",
    ciudad_firma: fields?.ciudad_firma ?? "Bogotá D.C.",
    fecha_firma: fields?.fecha_firma ?? new Date().toISOString().slice(0, 10),
    plazo_inicio: fields?.plazo_inicio ?? "",
    plazo_fin: fields?.plazo_fin ?? "",
    tiempo_servicio_inicio: fields?.tiempo_servicio_inicio ?? "",
    tiempo_servicio_fin: fields?.tiempo_servicio_fin ?? "",
    objeto_particular: fields?.objeto_particular ?? "",
  };
}

export function ContratoEditor({
  proposal,
  fields,
}: {
  proposal: Proposal;
  fields: ProposalContractFields | null;
}) {
  const [form, setForm] = useState<ContractFieldsInput>(defaults(fields));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { dirty, snapshot, markSaved } = useUnsavedChanges(form);

  function patch<K extends keyof ContractFieldsInput>(key: K, value: ContractFieldsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validar(): string[] {
    const problems: string[] = [];
    if (form.tiempo_servicio_inicio && form.tiempo_servicio_fin && form.tiempo_servicio_fin < form.tiempo_servicio_inicio)
      problems.push("El fin del servicio es anterior a su inicio");
    if (form.plazo_inicio && form.plazo_fin && form.plazo_fin < form.plazo_inicio)
      problems.push("El fin del plazo de ejecución es anterior a su inicio");
    return problems;
  }

  function handleSave() {
    const problems = validar();
    if (problems.length > 0) {
      setMessage(problemsMessage(problems));
      return;
    }
    setMessage(null);
    const snap = snapshot();
    startTransition(async () => {
      const result = await callSafe(() => saveContractFields(proposal.id, form));
      if (!result.error) markSaved(snap);
      setMessage(result.error ? saveErrorMessage(result.error) : "Guardado.");
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Datos del CONTRATANTE y condiciones específicas del evento. Los datos de Ticketcode
        (DEYRA S.A.S., el CONTRATISTA) ya están fijos en la plantilla del contrato.
      </p>

      <section className="rounded-card bg-surface p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-ink">Datos del contrato</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Número de contrato">
            <input
              className={inputClass}
              value={form.contrato_numero ?? ""}
              onChange={(e) => patch("contrato_numero", e.target.value)}
              placeholder="Ej. 01-09-2026"
            />
          </Field>
          <Field label="Fecha del contrato">
            <input
              type="date"
              className={inputClass}
              value={form.contrato_fecha ?? ""}
              onChange={(e) => patch("contrato_fecha", e.target.value)}
            />
          </Field>
          <Field label="Ciudad de firma">
            <input
              className={inputClass}
              value={form.ciudad_firma}
              onChange={(e) => patch("ciudad_firma", e.target.value)}
            />
          </Field>
          <Field label="Fecha de firma">
            <input
              type="date"
              className={inputClass}
              value={form.fecha_firma ?? ""}
              onChange={(e) => patch("fecha_firma", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-card bg-surface p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-ink">EL CONTRATANTE</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Representante legal (nombre completo)">
            <input
              className={inputClass}
              value={form.contratante_representante_legal ?? ""}
              onChange={(e) => patch("contratante_representante_legal", e.target.value)}
            />
          </Field>
          <Field label="Cédula">
            <input
              className={inputClass}
              value={form.contratante_cedula ?? ""}
              onChange={(e) => patch("contratante_cedula", e.target.value)}
            />
          </Field>
          <Field label="Cédula expedida en">
            <input
              className={inputClass}
              value={form.contratante_cedula_ciudad ?? ""}
              onChange={(e) => patch("contratante_cedula_ciudad", e.target.value)}
            />
          </Field>
          <Field label="Ciudad de residencia del representante">
            <input
              className={inputClass}
              value={form.contratante_direccion_ciudad ?? ""}
              onChange={(e) => patch("contratante_direccion_ciudad", e.target.value)}
            />
          </Field>
          <Field label="Empresa / organización">
            <input
              className={inputClass}
              value={form.contratante_nombre ?? ""}
              onChange={(e) => patch("contratante_nombre", e.target.value)}
            />
          </Field>
          <Field label="NIT">
            <input
              className={inputClass}
              value={form.contratante_nit ?? ""}
              onChange={(e) => patch("contratante_nit", e.target.value)}
            />
          </Field>
          <Field label="Ciudad de domicilio de la empresa">
            <input
              className={inputClass}
              value={form.contratante_ciudad ?? ""}
              onChange={(e) => patch("contratante_ciudad", e.target.value)}
            />
          </Field>
          <Field label="Dirección de notificaciones">
            <input
              className={inputClass}
              value={form.contratante_direccion ?? ""}
              onChange={(e) => patch("contratante_direccion", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-card bg-surface p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-ink">Objeto y tiempos</h3>
        <div className="space-y-4">
          <Field label="Objeto particular (alcance específico del evento)">
            <textarea
              rows={4}
              className="w-full rounded-field border border-border bg-input-bg p-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              value={form.objeto_particular ?? ""}
              onChange={(e) => patch("objeto_particular", e.target.value)}
              placeholder="Se usa un texto por defecto si lo dejas vacío."
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Servicio — inicio">
              <input
                type="date"
                className={inputClass}
                value={form.tiempo_servicio_inicio ?? ""}
                onChange={(e) => patch("tiempo_servicio_inicio", e.target.value)}
              />
            </Field>
            <Field label="Servicio — fin">
              <input
                type="date"
                className={inputClass}
                value={form.tiempo_servicio_fin ?? ""}
                onChange={(e) => patch("tiempo_servicio_fin", e.target.value)}
              />
            </Field>
            <Field label="Plazo de ejecución — inicio">
              <input
                type="date"
                className={inputClass}
                value={form.plazo_inicio ?? ""}
                onChange={(e) => patch("plazo_inicio", e.target.value)}
              />
            </Field>
            <Field label="Plazo de ejecución — fin">
              <input
                type="date"
                className={inputClass}
                value={form.plazo_fin ?? ""}
                onChange={(e) => patch("plazo_fin", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      <MobileSaveBar dirty={dirty} isPending={isPending} message={message} onSave={handleSave} label="Guardar contrato" />
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex min-h-11 items-center rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar datos del contrato"}
        </button>
        <a
          href={`/api/contracts/${proposal.id}`}
          className="flex min-h-11 items-center rounded-pill bg-surface px-5 text-sm font-semibold text-ink"
        >
          Descargar contrato (.docx)
        </a>
        <SaveStatus dirty={dirty} isPending={isPending} message={message} className="text-sm" />
      </div>
      <p className="text-xs text-muted">
        Guarda primero los datos para que el contrato descargado los incluya — el valor y la forma de
        pago se toman automáticamente del Tarifario y la Propuesta.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
