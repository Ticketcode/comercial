import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCOP } from "@/lib/pricing/summary";
import { numeroALetras } from "@/lib/numero-a-letras";
import { formatFechaCorta } from "@/lib/fecha-local";
import { FirmaForm } from "./firma-form";

export default async function FirmarCuentaCobroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: cuenta } = await supabase.from("cuentas_cobro").select("*").eq("id", id).maybeSingle();
  if (!cuenta) notFound();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("event_name")
    .eq("id", cuenta.proposal_id)
    .maybeSingle();

  const firmada = cuenta.estado === "firmada";

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-neutral-50 px-6 py-10">
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-xs text-neutral-400">Ciudad: {cuenta.ciudad_evento ?? "—"}</p>
        <h1 className="mt-1 text-center text-lg font-bold text-neutral-900">CUENTA DE COBRO</h1>
        <p className="text-center text-sm font-semibold text-neutral-800">DEYRA S.A.S</p>
        <p className="text-center text-xs text-neutral-500">Nit: 901.860.557-8</p>

        <div className="mt-5 space-y-3 text-sm text-neutral-800">
          <div>
            <p className="font-semibold">DEBE A:</p>
            <p className="text-center">{cuenta.nombre_completo}</p>
          </div>
          <p>
            Identificado con C.C. {cuenta.cedula} de {cuenta.ciudad_expedicion_cedula ?? "____"}.
          </p>
          <div>
            <p className="font-semibold">LA SUMA DE:</p>
            <p className="text-center">
              {numeroALetras(cuenta.valor)} ({formatCOP(cuenta.valor)}).
            </p>
          </div>
          <p>
            Lo anterior por concepto de {cuenta.concepto} del evento{" "}
            {proposal?.event_name ?? ""}
            {cuenta.ciudad_evento ? ` - ${cuenta.ciudad_evento}` : ""}.
          </p>
          <p className="text-xs text-neutral-500">
            La suma mencionada por favor pagar por transferencia bancaria al portador.
          </p>

          <div className="rounded-md bg-neutral-50 p-3 text-xs">
            <p className="mb-1 font-semibold text-neutral-700">Datos de la cuenta bancaria</p>
            <p>Nombre del banco: {cuenta.banco ?? "____"}</p>
            <p>Tipo de cuenta: {cuenta.tipo_cuenta ?? "____"}</p>
            <p>Número de cuenta: {cuenta.numero_cuenta ?? "____"}</p>
            <p>Nombre del portador: {cuenta.nombre_completo}</p>
            <p>Número de cédula: {cuenta.cedula}</p>
          </div>
        </div>

        {firmada ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
            <p>
              ✓ Firmado por {cuenta.firma_nombre} el{" "}
              {formatFechaCorta(cuenta.fecha_firma)}.
            </p>
            {cuenta.firma_imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cuenta.firma_imagen}
                alt="Firma"
                className="mx-auto mt-3 h-24 rounded border border-emerald-200 bg-white"
              />
            )}
          </div>
        ) : (
          <FirmaForm id={id} nombreSugerido={cuenta.nombre_completo} />
        )}
      </div>
    </div>
  );
}
