import { TopNav } from "@/app/components/top-nav";

export default function ProposalsSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
