import { PageSkeleton } from "@/app/components/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageSkeleton />
    </div>
  );
}
