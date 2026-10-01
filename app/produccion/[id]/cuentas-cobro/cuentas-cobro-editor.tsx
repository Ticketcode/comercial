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
  markFirmada,
  deleteAllCuentasCobro,
  deleteCuentaCobro,
} from "./actions";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const confirm = useConfirm();

  function copySignLink(id: string) {
    const url = `${window.location.origin}/firmar/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
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
            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
            className="rounded px-2 py-1 font-medium hover:opacity-90 disabled:opacity-50"
          >
            Sí, borrar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="rounded border border-neutral-300 px-2 py-1 text-neutral-600 hover:bg-neutral-50"
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
        <form onSubmit={handleUpload} className="mt-3 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
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

      {cuentas.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">
              Cuentas de cobro ({cuentas.length}) — Total {formatCOP(totalValor)}
            </h3>
            <div className="flex gap-2">
              <a
                href={`/api/cuentas-cobro/${proposalId}`}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
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
          <table className="w-full text-sm">
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
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copySignLink(c.id)}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                        >
                          {copiedId === c.id ? "¡Copiado!" : "Copiar enlace"}
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
        </section>
      )}
    </div>
  );
}
