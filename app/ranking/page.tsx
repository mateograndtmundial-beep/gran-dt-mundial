import type { Metadata } from "next";
import { PageTitle, EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { RoundFilterPills } from "@/components/domain/RoundFilterPills";
import {
  getGlobalLeaderboard,
  getGlobalLeaderboardByRound,
  getMyTeam,
  getUserGlobalRank,
  getUserGlobalRankByRound,
  getPublishedRounds,
  isRankingsVisible,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { roundWithArticle } from "@/lib/game/round-format";

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

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;

  let rows: Awaited<ReturnType<typeof getGlobalLeaderboard>> = [];
  let me: { entryName: string | null; username: string | null; totalPoints: number; rank: number } | null = null;
  let error = false;
  let visible = false;
  let publishedRounds: Awaited<ReturnType<typeof getPublishedRounds>> = [];
  // Fecha seleccionada (su `order`): solo válida si está entre las publicadas.
  let activeOrder: number | null = null;
  let activeRoundName: string | null = null;
  try {
    visible = await isRankingsVisible();
    if (visible) {
      publishedRounds = await getPublishedRounds();
      const wanted = Number(fecha);
      const sel = Number.isFinite(wanted) ? publishedRounds.find((r) => r.order === wanted) : undefined;
      activeOrder = sel?.order ?? null;
      activeRoundName = sel?.name ?? null;

      const user = await getCurrentUser();
      const [top, team] = await Promise.all([
        sel ? getGlobalLeaderboardByRound(sel.id, 100) : getGlobalLeaderboard(100),
        user ? getMyTeam(user.id) : Promise.resolve(null),
      ]);
      rows = top;
      if (user && team) {
        if (sel) {
          const r = await getUserGlobalRankByRound(team.entry.id, sel.id);
          if (r != null) {
            me = { entryName: team.entry.name, username: user.username, totalPoints: r.points, rank: r.rank };
          }
        } else {
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
    }
  } catch {
    error = true;
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Ranking global"
        subtitle={
          activeRoundName
            ? `Ranking de ${roundWithArticle(activeRoundName)}.`
            : "Los mejores DT del Mundial 2026."
        }
      />
      {!visible ? (
        <EmptyState
          title="El ranking todavía no está disponible."
          hint="Se habilita cuando se juegue y publique la Fecha 1 del Mundial — hasta entonces todos arrancan en 0 puntos."
        />
      ) : error ? (
        <EmptyState title="No pudimos cargar el ranking." hint="Probá recargar la página en un rato." />
      ) : (
        <div className="space-y-5">
          {publishedRounds.length > 0 && (
            <RoundFilterPills rounds={publishedRounds} active={activeOrder} basePath="/ranking" />
          )}
          {rows.length === 0 ? (
            <EmptyState title="Todavía no hay equipos en el ranking." />
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
