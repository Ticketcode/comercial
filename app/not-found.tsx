import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-neutral-600">
        El enlace puede estar incompleto, haber cambiado o corresponder a algo que ya no existe.
      </p>
      <Link
        href="/proposals"
        className="btn btn-primary mt-6"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
