"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { key: "tarifario", n: "1", label: "Tarifario" },
  { key: "propuesta", n: "2", label: "Propuesta" },
  { key: "contrato", n: "3", label: "Contrato" },
  { key: "presentacion", n: "4", label: "Presentación" },
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
