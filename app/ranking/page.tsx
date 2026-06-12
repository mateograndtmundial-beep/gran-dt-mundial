import type { Metadata } from "next";
import { PageTitle, EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { getGlobalLeaderboard, getMyTeam, getUserGlobalRank, isRankingsVisible } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

// Depende del usuario (fija su posición arriba), así que se renderiza por request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking — Los 11 de Sampa",
  description: "Mirá la tabla global del Mundial 2026: quién va primero y cuántos puntos lleva cada DT.",
  openGraph: {
    title: "Ranking del Mundial 2026 — Los 11 de Sampa",
    description: "La tabla global de Los 11 de Sampa: quién va primero y cuántos puntos lleva cada DT.",
  },
};

export default async function RankingPage() {
  let rows: Awaited<ReturnType<typeof getGlobalLeaderboard>> = [];
  let me: { entryName: string | null; username: string | null; totalPoints: number; rank: number } | null = null;
  let error = false;
  let visible = false;
  try {
    visible = await isRankingsVisible();
    if (visible) {
      const user = await getCurrentUser();
      const [top, team] = await Promise.all([
        getGlobalLeaderboard(100),
        user ? getMyTeam(user.id) : Promise.resolve(null),
      ]);
      rows = top;
      if (user && team) {
        const rank = await getUserGlobalRank(team.entry.id);
        if (rank != null) {
          me = {
            entryName: team.entry.name,
            username: user.username,
            totalPoints: team.entry.totalPoints,
            rank,
          };
        }
      }
    }
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
        <EmptyState title="No pudimos cargar el ranking." hint="Probá recargar la página en un rato." />
      ) : rows.length === 0 ? (
        <EmptyState title="Todavía no hay equipos en el ranking." />
      ) : (
        <div className="space-y-5">
          {me && (
            <div className="space-y-2">
              <Eyebrow>Tu posición</Eyebrow>
              <LeagueRanking
                startRank={me.rank}
                rows={[{ entryName: me.entryName, username: me.username, totalPoints: me.totalPoints }]}
              />
            </div>
          )}
          <LeagueRanking
            currentUserId={me?.username ?? null}
            rows={rows.map((r) => ({
              entryId: r.entryId,
              entryName: r.name,
              username: r.username,
              totalPoints: r.totalPoints,
            }))}
          />
        </div>
      )}
    </div>
  );
}
