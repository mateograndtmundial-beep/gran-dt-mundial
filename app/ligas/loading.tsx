import { PageTitle, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageTitle title="Ligas" />
      <div role="status" aria-label="Cargando ligas…" className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </>
  );
}
