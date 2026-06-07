import { PageTitle, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageTitle title="Mi equipo" />
      <Skeleton className="mb-3 h-[60vh] w-full" />
      <div role="status" aria-label="Cargando equipo…" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </>
  );
}
