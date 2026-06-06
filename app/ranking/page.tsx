import { PageTitle, EmptyState, Card } from "@/components/ui";
import { getGlobalLeaderboard } from "@/lib/queries";
import { formatPoints } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  let rows: Awaited<ReturnType<typeof getGlobalLeaderboard>> = [];
  let error = false;
  try {
    rows = await getGlobalLeaderboard(100);
  } catch {
    error = true;
  }

  return (
    <div>
      <PageTitle title="Ranking global" subtitle="Los mejores DT del Mundial." />
      {error ? (
        <EmptyState title="No se pudo cargar el ranking." hint="Revisá la base." />
      ) : rows.length === 0 ? (
        <EmptyState title="Todavía no hay equipos en el ranking." />
      ) : (
        <Card>
          <ol className="divide-y divide-white/10">
            {rows.map((r, i) => (
              <li key={r.entryId} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-6 text-center font-bold text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-white/40">{r.username ?? "DT"}</span>
                </span>
                <span className="font-bold text-gold">{formatPoints(r.totalPoints)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
