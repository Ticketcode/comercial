import Link from "next/link";
import { NewProposalForm } from "./new-proposal-form";

export default function NewProposalPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/proposals" className="text-sm text-neutral-500 hover:underline">
        ← Todas las propuestas
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Nueva propuesta</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Datos básicos del cliente y el evento. El diagnóstico (qué necesita el evento y cuánto
        cuesta) se arma en el siguiente paso, con ayuda de Claude.
      </p>
      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <NewProposalForm />
      </div>
    </div>
  );
}
export const metadata = { title: "Nueva propuesta" };
