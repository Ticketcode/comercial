"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { key: "viaticos", n: "1", label: "Viáticos" },
  { key: "legalizacion", n: "2", label: "Legalización" },
  { key: "presupuesto", n: "3", label: "Presupuesto" },
  { key: "actividades", n: "4", label: "Actividades" },
  { key: "cuentas-cobro", n: "5", label: "Cuentas de cobro" },
  { key: "informe", n: "6", label: "Informe final" },
];

export function ProduccionStepsNav({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Pasos" className="mt-7 flex flex-nowrap gap-2 overflow-x-auto pb-1">
      {steps.map((step) => {
        const href = `/produccion/${id}/${step.key}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={step.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-pill py-2 pl-2 pr-5 text-sm font-semibold no-underline ${
              active ? "bg-accent text-accent-ink" : "bg-surface text-muted"
            }`}
          >
            <span
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-accent-ink text-accent" : "bg-surface2 text-ink"
              }`}
            >
              {step.n}
            </span>
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
