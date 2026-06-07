import { PageTitle, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageTitle title="Ranking" />
      <div role="status" aria-label="Cargando ranking…" className="flex flex-col gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </>
  );
}
