import { ComercialShell } from "@/app/components/comercial-shell";
import { ComercialTopNav } from "@/app/components/comercial-top-nav";

export default function CatalogSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComercialShell>
      <ComercialTopNav />
      {children}
    </ComercialShell>
  );
}
