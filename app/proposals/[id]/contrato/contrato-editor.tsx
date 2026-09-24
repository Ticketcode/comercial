"use client";

import { useState, useTransition } from "react";
import type { Proposal, ProposalContractFields } from "@/lib/types";
import { saveContractFields, type ContractFieldsInput } from "./actions";

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
const labelClass = "text-xs font-medium text-neutral-500";

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

  function patch<K extends keyof ContractFieldsInput>(key: K, value: ContractFieldsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveContractFields(proposal.id, form);
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        Datos del CONTRATANTE y condiciones específicas del evento. Los datos de Ticketcode
        (DEYRA S.A.S., el CONTRATISTA) ya están fijos en la plantilla del contrato.
      </p>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Datos del contrato</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">EL CONTRATANTE</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Objeto y tiempos</h3>
        <div className="space-y-4">
          <Field label="Objeto particular (alcance específico del evento)">
            <textarea
              rows={4}
              className="w-full rounded-md border border-neutral-300 p-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              value={form.objeto_particular ?? ""}
              onChange={(e) => patch("objeto_particular", e.target.value)}
              placeholder="Se usa un texto por defecto si lo dejas vacío."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="h-10 rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar datos del contrato"}
        </button>
        <a
          href={`/api/contracts/${proposal.id}`}
          className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center"
        >
          Descargar contrato (.docx)
        </a>
        {message && (
          <span className={`text-sm ${message.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
            {message}
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-400">
        Guarda primero los datos para que el contrato descargado los incluya — el valor y la forma de
        pago se toman automáticamente del Tarifario y la Propuesta.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}
