import { PageTitle, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title="Liga" />
        <Skeleton className="h-16 w-32" />
      </div>
      <div role="status" aria-label="Cargando liga…" className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
