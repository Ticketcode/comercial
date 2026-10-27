"use client";

import { useRef, useState, useTransition } from "react";
import { useConfirm } from "@/app/components/ui-guard";
import { callSafe, friendlyError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import type { CuentaCobro } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import {
  uploadCuentasCobro,
  addCuentaCobro,
  markFirmada,
  deleteAllCuentasCobro,
  deleteCuentaCobro,
  regenerarEnlaceCuentaCobro,
  deshacerFirma,
  type AddCuentaCobroInput,
} from "./actions";

const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

const emptyForm: AddCuentaCobroInput = {
  nombre_completo: "",
  cedula: "",
  ciudad_expedicion_cedula: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  concepto: "",
  valor: 0,
  ciudad_evento: "",
};

async function downloadTemplate() {
  const xlsx = await import("xlsx");
  const headers = [
    "Nombre",
    "Cédula",
    "Ciudad de expedición",
    "Banco",
    "Tipo de cuenta",
    "Número de cuenta",
    "Concepto",
    "Valor",
    "Ciudad del evento",
  ];
  const ejemplo = [
    "Juan Pérez",
    "1234567890",
    "Bogotá",
    "Bancolombia",
    "Ahorros",
    "12345678901",
    "Apoyo logístico en evento",
    500000,
    "Medellín",
  ];
  const ws = xlsx.utils.aoa_to_sheet([headers, ejemplo]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Cuentas de cobro");
  xlsx.writeFile(wb, "plantilla-cuentas-de-cobro.xlsx");
}

export function CuentasCobroEditor({
  proposalId,
  cuentas,
}: {
  proposalId: string;
  cuentas: CuentaCobro[];
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // "all" o el id de la cuenta que está esperando confirmación de borrado
  const [confirming, setConfirming] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddCuentaCobroInput>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const confirm = useConfirm();

  function patchAddForm<K extends keyof AddCuentaCobroInput>(key: K, value: AddCuentaCobroInput[K]) {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddPersona(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await callSafe(() => addCuentaCobro(proposalId, addForm));
      if (result.error) {
        setMessage(`Error: ${friendlyError(result.error)}`);
      } else {
        setMessage(`Se agregó ${addForm.nombre_completo}.`);
        setAddForm(emptyForm);
        setAddOpen(false);
      }
      router.refresh();
    });
  }

  // Se antepone el nombre al enlace: si se copian y pegan varios enlaces juntos en un
  // mismo chat, cada persona necesita poder identificar cuál le corresponde.
  function copySignLink(c: CuentaCobro) {
    const url = `${window.location.origin}/firmar/${c.token ?? c.id}`;
    navigator.clipboard.writeText(`${c.nombre_completo}: ${url}`).then(() => {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  /** Copia el enlace nuevo (con el nombre) si el navegador lo permite; si no, avisa para que se copie a mano. */
  async function copyNewLink(token: string | null, nombre: string) {
    if (!token) return false;
    try {
      await navigator.clipboard.writeText(`${nombre}: ${window.location.origin}/firmar/${token}`);
      return true;
    } catch {
      return false;
    }
  }

  function copyAllPendingLinks() {
    const pendientes = cuentas.filter((c) => c.estado !== "firmada");
    const texto = pendientes
      .map((c) => `${c.nombre_completo}: ${window.location.origin}/firmar/${c.token ?? c.id}`)
      .join("\n");
    navigator.clipboard.writeText(texto).then(() => {
      setMessage(`Se copiaron ${pendientes.length} enlace(s) pendiente(s), uno por línea con el nombre de cada persona.`);
    });
  }

  async function regenerarEnlace(c: CuentaCobro) {
    const ok = await confirm({
      title: `¿Generar un enlace nuevo para ${c.nombre_completo}?`,
      message:
        "El enlace anterior dejará de funcionar (si ya se lo enviaste, no podrá abrirlo). Tendrás que enviarle el nuevo.",
      confirmLabel: "Generar enlace nuevo",
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await callSafe(() => regenerarEnlaceCuentaCobro(c.id, proposalId));
      if (r.error) {
        setMessage(`Error: ${friendlyError(r.error)}`);
      } else {
        const copied = await copyNewLink("token" in r ? r.token : null, c.nombre_completo);
        setMessage(
          copied
            ? "Enlace nuevo generado y copiado. El anterior ya no funciona."
            : "Enlace nuevo generado. Pulsa \"Copiar enlace\" para enviarlo; el anterior ya no funciona."
        );
      }
      router.refresh();
    });
  }

  async function deshacerFirmaDe(c: CuentaCobro) {
    const ok = await confirm({
      title: `¿Deshacer la firma de ${c.nombre_completo}?`,
      message:
        "Se borra la firma y la cuenta vuelve a quedar pendiente. Además se genera un enlace nuevo, así que el anterior ya no sirve. La persona tendrá que firmar de nuevo.",
      confirmLabel: "Deshacer firma",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await callSafe(() => deshacerFirma(c.id, proposalId));
      if (r.error) {
        setMessage(`Error: ${friendlyError(r.error)}`);
      } else {
        const copied = await copyNewLink("token" in r ? r.token : null, c.nombre_completo);
        setMessage(
          copied
            ? "Firma deshecha. El enlace nuevo quedó copiado para que la persona firme otra vez."
            : "Firma deshecha. Pulsa \"Copiar enlace\" para enviarle el enlace nuevo."
        );
      }
      router.refresh();
    });
  }

  function runDelete(target: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result =
          target === "all"
            ? await deleteAllCuentasCobro(proposalId)
            : await deleteCuentaCobro(target, proposalId);
        if (result.error) setMessage(`Error al borrar: ${friendlyError(result.error)}`);
        else
          setMessage(
            target === "all" ? "Se borraron todas las cuentas de cobro." : "Cuenta de cobro borrada."
          );
      } catch (err) {
        setMessage(`Error al borrar: ${friendlyError(err)}`);
      }
      setConfirming(null);
      router.refresh();
    });
  }

  function renderDelete(target: string, label: string, className: string) {
    if (confirming === target) {
      return (
        <span className="inline-flex items-center gap-1 text-xs">
          <span className="text-neutral-600">¿Seguro?</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runDelete(target)}
            className="btn btn-danger btn-sm"
          >
            Sí, borrar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="btn btn-secondary btn-sm"
          >
            No
          </button>
        </span>
      );
    }
    return (
      <button type="button" onClick={() => setConfirming(target)} className={className}>
        {label}
      </button>
    );
  }

  const totalValor = cuentas.reduce((s, c) => s + c.valor, 0);
  const firmadas = cuentas.filter((c) => c.estado === "firmada").length;

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    if (cuentas.length > 0) {
      const ok = await confirm({
        title: "¿Reemplazar las cuentas de cobro actuales?",
        message: `Este evento ya tiene ${cuentas.length} cuenta(s) de cobro cargadas (${firmadas} firmada(s)). Al subir este archivo se reemplazan todas, y las firmas ya registradas se pierden.`,
        confirmLabel: "Reemplazar",
        danger: true,
      });
      if (!ok) return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setMessage(null);
    startTransition(async () => {
      const result = await callSafe(() => uploadCuentasCobro(proposalId, formData));
      if (result.error) {
        setMessage(`Error: ${friendlyError(result.error)}`);
      } else {
        setMessage(`Se cargaron ${"count" in result ? result.count : 0} cuentas de cobro.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">
          Cargar cuentas de cobro desde Excel
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Columnas esperadas: Nombre, Cédula, Ciudad de expedición, Banco, Tipo de cuenta, Número
          de cuenta, Concepto, Valor, Ciudad del evento. Subir un archivo nuevo reemplaza las
          cuentas de cobro actuales de este evento.
        </p>
        <form onSubmit={handleUpload} className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
          >
            {isPending ? "Procesando..." : "Cargar archivo"}
          </button>
        </form>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
        >
          Descargar plantilla de Excel
        </button>
        {message && <p className="mt-2 text-xs text-neutral-600">{message}</p>}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn btn-secondary"
          >
            + Agregar colaborador
          </button>
        ) : (
          <>
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Agregar colaborador</h3>
            <form onSubmit={handleAddPersona} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                aria-label="Nombre completo"
                placeholder="Nombre completo"
                required
                value={addForm.nombre_completo}
                onChange={(e) => patchAddForm("nombre_completo", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Cédula"
                placeholder="Cédula"
                required
                value={addForm.cedula}
                onChange={(e) => patchAddForm("cedula", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Ciudad de expedición"
                placeholder="Ciudad de expedición"
                value={addForm.ciudad_expedicion_cedula ?? ""}
                onChange={(e) => patchAddForm("ciudad_expedicion_cedula", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Banco"
                placeholder="Banco"
                value={addForm.banco ?? ""}
                onChange={(e) => patchAddForm("banco", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Tipo de cuenta"
                placeholder="Tipo de cuenta"
                value={addForm.tipo_cuenta ?? ""}
                onChange={(e) => patchAddForm("tipo_cuenta", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Número de cuenta"
                placeholder="Número de cuenta"
                value={addForm.numero_cuenta ?? ""}
                onChange={(e) => patchAddForm("numero_cuenta", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Concepto"
                placeholder="Concepto"
                required
                value={addForm.concepto}
                onChange={(e) => patchAddForm("concepto", e.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Valor"
                type="number"
                min={0}
                placeholder="Valor"
                required
                value={addForm.valor || ""}
                onChange={(e) => patchAddForm("valor", Number(e.target.value) || 0)}
                className={inputClass}
              />
              <input
                aria-label="Ciudad del evento"
                placeholder="Ciudad del evento"
                value={addForm.ciudad_evento ?? ""}
                onChange={(e) => patchAddForm("ciudad_evento", e.target.value)}
                className={inputClass}
              />
              <div className="flex items-center gap-2 sm:col-span-3">
                <button type="submit" disabled={isPending} className="btn btn-primary">
                  {isPending ? "Agregando..." : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setAddForm(emptyForm);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {cuentas.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">
              Cuentas de cobro ({cuentas.length}) — Total {formatCOP(totalValor)}
            </h3>
            <div className="flex gap-2">
              {cuentas.some((c) => c.estado !== "firmada") && (
                <button
                  type="button"
                  onClick={copyAllPendingLinks}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  title="Copia todos los enlaces pendientes, uno por línea con el nombre de cada persona"
                >
                  Copiar enlaces pendientes
                </button>
              )}
              <a
                href={`/api/cuentas-cobro/${proposalId}`}
                className="btn btn-primary"
              >
                Descargar paquete .docx
              </a>
              {renderDelete(
                "all",
                "Borrar todas",
                "rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
              )}
            </div>
          </div>
          <p className="mb-3 text-xs text-neutral-500">
            {firmadas}/{cuentas.length} firmadas
          </p>
          {message?.startsWith("Error") && (
            <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-xs text-red-700">
              {message}
            </p>
          )}
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="py-2">Nombre</th>
                <th className="py-2">Cédula</th>
                <th className="py-2">Concepto</th>
                <th className="py-2 text-right">Valor</th>
                <th className="w-48 py-2">Firma</th>
                <th className="w-44 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="py-1.5">{c.nombre_completo}</td>
                  <td className="py-1.5 text-neutral-500">{c.cedula}</td>
                  <td className="py-1.5 text-neutral-500">{c.concepto}</td>
                  <td className="py-1.5 text-right">{formatCOP(c.valor)}</td>
                  <td className="py-1.5">
                    {c.estado === "firmada" ? (
                      <div className="flex items-center gap-2">
                        {c.firma_imagen && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.firma_imagen}
                            alt="Firma"
                            className="h-6 rounded border border-neutral-200 bg-white"
                          />
                        )}
                        <span className="text-xs font-medium text-emerald-700">
                          ✓{c.firma_nombre ? ` ${c.firma_nombre}` : " Firmada"}
                          {c.fecha_firma ? ` (${formatFechaCorta(c.fecha_firma)})` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => deshacerFirmaDe(c)}
                          disabled={isPending}
                          className="text-xs text-neutral-500 underline hover:text-red-600 disabled:opacity-50"
                          title="Borra la firma y vuelve la cuenta a pendiente"
                        >
                          deshacer
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copySignLink(c)}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                        >
                          {copiedId === c.id ? "¡Copiado!" : "Copiar enlace"}
                        </button>
                        <button
                          type="button"
                          onClick={() => regenerarEnlace(c)}
                          disabled={isPending}
                          className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-50"
                          title="Genera un enlace nuevo; el anterior deja de funcionar"
                        >
                          regenerar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              const r = await callSafe(() => markFirmada(c.id, proposalId, true));
                              if (r.error) setMessage(`Error al marcar como firmada: ${friendlyError(r.error)}`);
                              router.refresh();
                            })
                          }
                          className="text-xs text-neutral-400 hover:text-neutral-700"
                          title="Marcar firmada manualmente (ej. si firmó en papel)"
                        >
                          marcar manual
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 text-right">
                    {renderDelete(c.id, "Borrar", "text-xs text-red-500 hover:text-red-700")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}
