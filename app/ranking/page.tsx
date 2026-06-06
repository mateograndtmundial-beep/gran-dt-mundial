import { PageTitle, EmptyState } from "@/components/ui";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { getGlobalLeaderboard } from "@/lib/queries";

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
    <div className="space-y-5">
      <PageTitle title="Ranking global" subtitle="Los mejores DT del Mundial 2026." />
      {error ? (
        <EmptyState title="No se pudo cargar el ranking." hint="Revisá la base." />
      ) : rows.length === 0 ? (
        <EmptyState title="Todavía no hay equipos en el ranking." />
      ) : (
        <LeagueRanking
          rows={rows.map((r) => ({
            entryId: r.entryId,
            entryName: r.name,
            username: r.username,
            totalPoints: r.totalPoints,
          }))}
        />
      )}
    </div>
  );
}
