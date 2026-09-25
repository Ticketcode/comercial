"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CuentaCobro } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { uploadCuentasCobro, markFirmada, deleteAllCuentasCobro } from "./actions";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function copySignLink(id: string) {
    const url = `${window.location.origin}/firmar/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const totalValor = cuentas.reduce((s, c) => s + c.valor, 0);
  const firmadas = cuentas.filter((c) => c.estado === "firmada").length;

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setMessage(null);
    startTransition(async () => {
      const result = await uploadCuentasCobro(proposalId, formData);
      if (result.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Se cargaron ${result.count} cuentas de cobro.`);
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
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await deleteAllCuentasCobro(proposalId);
                    router.refresh();
                  })
                }
                className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
              >
                Borrar todas
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs text-neutral-500">
            {firmadas}/{cuentas.length} firmadas
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="py-2">Nombre</th>
                <th className="py-2">Cédula</th>
                <th className="py-2">Concepto</th>
                <th className="py-2 text-right">Valor</th>
                <th className="w-48 py-2">Firma</th>
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
                              await markFirmada(c.id, proposalId, true);
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
