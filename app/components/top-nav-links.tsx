"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNavLinks({ showProduccion }: { showProduccion: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/proposals", label: "Comercial", active: pathname?.startsWith("/proposals") || pathname?.startsWith("/catalog") },
    ...(showProduccion
      ? [{ href: "/produccion", label: "Producción", active: pathname?.startsWith("/produccion") }]
      : []),
  ];

  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab.active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
