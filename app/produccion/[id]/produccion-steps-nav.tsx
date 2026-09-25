"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { key: "viaticos", label: "Viáticos" },
  { key: "legalizacion", label: "Legalización" },
  { key: "presupuesto", label: "Presupuesto" },
  { key: "actividades", label: "Actividades" },
  { key: "cuentas-cobro", label: "Cuentas de cobro" },
];

export function ProduccionStepsNav({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex gap-2 border-b border-neutral-200">
      {steps.map((step) => {
        const href = `/produccion/${id}/${step.key}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={step.key}
            href={href}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              active
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
