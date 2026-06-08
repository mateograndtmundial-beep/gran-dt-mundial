import { PageTitle, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-5">
      <PageTitle title="Pines" subtitle="Comprá pines para hacer cambios extra en tu equipo cada fecha." />
      <Skeleton className="h-12 w-48" />
      <div role="status" aria-label="Cargando pines…" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
