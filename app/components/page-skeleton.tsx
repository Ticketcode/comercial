export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Cargando">
      <div className="h-6 w-1/3 rounded bg-neutral-200" />
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-neutral-100" style={{ width: `${90 - (i % 3) * 15}%` }} />
        ))}
      </div>
      <p className="text-xs text-neutral-400">Cargando…</p>
    </div>
  );
}
