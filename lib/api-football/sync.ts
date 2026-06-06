import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, players, playerMatchStats } from "@/lib/db/schema";
import { apiFootball } from "@/lib/api-football/client";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Trae las estadísticas de todos los partidos de una fecha desde API-Football,
 * calcula los puntos por jugador (sin capitán) y los guarda en player_match_stats.
 * También actualiza el marcador, el estado y la figura (MOTM) de cada partido.
 */
export async function syncRound(roundId: number) {
  const ms = await db.select().from(matches).where(eq(matches.roundId, roundId));

  const allPlayers = await db
    .select({
      id: players.id,
      apiId: players.apiFootballId,
      position: players.position,
      countryId: players.countryId,
    })
    .from(players);
  const byApi = new Map(allPlayers.filter((p) => p.apiId != null).map((p) => [p.apiId as number, p]));

  let updated = 0;
  for (const m of ms) {
    if (!m.apiFootballFixtureId) continue;

    const fx = (await apiFootball.fixtureById(m.apiFootballFixtureId)) as any[];
    const f = fx?.[0];
    const homeScore: number | null = f?.goals?.home ?? null;
    const awayScore: number | null = f?.goals?.away ?? null;
    const statusShort: string | undefined = f?.fixture?.status?.short;
    const finished = ["FT", "AET", "PEN"].includes(statusShort ?? "");
    const homeTeamApi = f?.teams?.home?.id;

    const data = (await apiFootball.fixturePlayers(m.apiFootballFixtureId)) as any[];

    type Raw = {
      our: NonNullable<ReturnType<typeof byApi.get>>;
      minutes: number;
      rating: number | null;
      goals: number;
      penaltyGoals: number;
      assists: number;
      yellow: number;
      red: number;
      saves: number;
      isHome: boolean;
    };
    const raws: Raw[] = [];

    for (const teamBlock of data ?? []) {
      const isHome = teamBlock?.team?.id === homeTeamApi;
      for (const pl of teamBlock?.players ?? []) {
        const st = pl?.statistics?.[0];
        const our = byApi.get(pl?.player?.id);
        if (!our || !st) continue;
        raws.push({
          our,
          minutes: st.games?.minutes ?? 0,
          rating: st.games?.rating ? parseFloat(st.games.rating) : null,
          goals: st.goals?.total ?? 0,
          penaltyGoals: st.penalty?.scored ?? 0,
          assists: st.goals?.assists ?? 0,
          yellow: st.cards?.yellow ?? 0,
          red: st.cards?.red ?? 0,
          saves: st.penalty?.saved ?? 0,
          isHome,
        });
      }
    }

    // Figura: mayor rating con >= 20'. (Empates: se queda el primero; el admin puede ajustar.)
    let motmPlayerId: number | null = null;
    let best = -1;
    for (const r of raws) {
      if (r.minutes >= 20 && r.rating != null && r.rating > best) {
        best = r.rating;
        motmPlayerId = r.our.id;
      }
    }

    for (const r of raws) {
      const concededTeam = r.isHome ? awayScore ?? 0 : homeScore ?? 0;
      const cleanSheet = finished ? concededTeam === 0 : false;
      const isMotm = r.our.id === motmPlayerId;
      const bd = calcularPuntos({
        position: r.our.position,
        minutes: r.minutes,
        rating: r.rating,
        goals: r.goals,
        penaltyGoals: r.penaltyGoals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
        ownGoals: 0,
        penaltiesSaved: r.saves,
        penaltiesMissed: 0,
        goalsConceded: concededTeam,
        cleanSheet,
        isMotm,
        isCaptain: false,
      });

      const values = {
        playerId: r.our.id,
        matchId: m.id,
        minutes: r.minutes,
        goals: r.goals,
        penaltyGoals: r.penaltyGoals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
        ownGoals: 0,
        penaltiesSaved: r.saves,
        penaltiesMissed: 0,
        goalsConceded: r.our.position === "GK" ? concededTeam : 0,
        cleanSheet,
        rating: r.rating,
        isMotm,
        fantasyPoints: bd.total,
      };
      await db
        .insert(playerMatchStats)
        .values(values)
        .onConflictDoUpdate({
          target: [playerMatchStats.playerId, playerMatchStats.matchId],
          set: values,
        });
    }

    await db
      .update(matches)
      .set({
        homeScore,
        awayScore,
        status: finished ? "finished" : "scheduled",
        motmPlayerId,
      })
      .where(eq(matches.id, m.id));
    updated++;
  }

  return { matches: updated };
}
