import { NewProposalForm } from "./new-proposal-form";

export default function NewProposalPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Nueva propuesta</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Datos básicos del cliente y el evento. Los componentes y costos se arman en el
        siguiente paso.
      </p>
      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <NewProposalForm />
      </div>
    </div>
  );
}
