import { TopNav } from "@/app/components/top-nav";

export default function CatalogSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
