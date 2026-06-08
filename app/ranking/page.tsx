import { PageTitle, EmptyState } from "@/components/ui";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { getGlobalLeaderboard, isRankingsVisible } from "@/lib/queries";

// ISR: ranking global no dependiente del usuario. Se revalida cada 60s y on-demand
// (publishRound hace revalidatePath("/ranking")).
export const revalidate = 60;

export default async function RankingPage() {
  let rows: Awaited<ReturnType<typeof getGlobalLeaderboard>> = [];
  let error = false;
  let visible = false;
  try {
    visible = await isRankingsVisible();
    if (visible) rows = await getGlobalLeaderboard(100);
  } catch {
    error = true;
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Ranking global" subtitle="Los mejores DT del Mundial 2026." />
      {!visible ? (
        <EmptyState
          title="El ranking todavía no está disponible."
          hint="Se habilita cuando se juegue y publique la Fecha 1 del Mundial — hasta entonces todos arrancan en 0 puntos."
        />
      ) : error ? (
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
