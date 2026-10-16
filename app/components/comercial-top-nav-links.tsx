"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ComercialTopNavLinks({ showProduccion }: { showProduccion: boolean }) {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/proposals",
      label: "Comercial",
      active: pathname?.startsWith("/proposals") || pathname?.startsWith("/catalog"),
    },
    ...(showProduccion
      ? [{ href: "/produccion", label: "Producción", active: pathname?.startsWith("/produccion") }]
      : []),
  ];

  return (
    <nav aria-label="Principal" className="flex gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
            tab.active ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface2"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
