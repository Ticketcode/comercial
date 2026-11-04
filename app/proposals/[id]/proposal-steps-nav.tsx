"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { key: "diagnostico", n: "1", label: "Diagnóstico" },
  { key: "propuesta", n: "2", label: "Propuesta" },
  { key: "acuerdo", n: "3", label: "Acuerdo comercial" },
  { key: "presentacion", n: "4", label: "Presentación" },
  { key: "versiones", n: "5", label: "Versiones" },
  { key: "contrato", n: "6", label: "Envío y contrato" },
];

export function ProposalStepsNav({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Pasos" className="mt-7 flex flex-wrap gap-2">
      {steps.map((step) => {
        const href = `/proposals/${id}/${step.key}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={step.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-pill py-2 pl-2 pr-5 text-sm font-semibold no-underline ${
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
