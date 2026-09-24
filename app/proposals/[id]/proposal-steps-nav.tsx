"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { key: "tarifario", label: "1. Tarifario" },
  { key: "propuesta", label: "2. Propuesta" },
  { key: "contrato", label: "3. Contrato" },
];

export function ProposalStepsNav({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex gap-2 border-b border-neutral-200">
      {steps.map((step) => {
        const href = `/proposals/${id}/${step.key}`;
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
