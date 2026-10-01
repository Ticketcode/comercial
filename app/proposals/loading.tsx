import { PageSkeleton } from "@/app/components/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageSkeleton />
    </div>
  );
}
