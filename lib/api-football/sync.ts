import { and, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { matches, players, playerMatchStats } from "@/lib/db/schema";
import { apiFootball } from "@/lib/api-football/client";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import { chunkedBatch, type BatchOp } from "@/lib/db/batch";
import { SCORING } from "@/lib/game/config";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Partidos sincronizados en paralelo. Acotado para no saturar el rate limit de
// API-Football (el client igual reintenta con backoff ante 429).
const SYNC_CONCURRENCY = 3;

/** Corre `fn` sobre los items con un máximo de `limit` en paralelo. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

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

  const syncMatch = async (m: (typeof ms)[number]): Promise<boolean> => {
    if (!m.apiFootballFixtureId) return false;

    // Las tres llamadas del partido van en paralelo. Los eventos traen los autogoles
    // (no están en /fixtures/players).
    const [fx, data, events] = (await Promise.all([
      apiFootball.fixtureById(m.apiFootballFixtureId),
      apiFootball.fixturePlayers(m.apiFootballFixtureId),
      apiFootball.fixtureEvents(m.apiFootballFixtureId),
    ])) as [any[], any[], any[]];
    const f = fx?.[0];
    const homeScore: number | null = f?.goals?.home ?? null;
    const awayScore: number | null = f?.goals?.away ?? null;
    // Penales de la tanda (eliminatorias definidas por penales). Null si no hubo.
    const homePenalties: number | null = f?.score?.penalty?.home ?? null;
    const awayPenalties: number | null = f?.score?.penalty?.away ?? null;
    const statusShort: string | undefined = f?.fixture?.status?.short;
    const finished = ["FT", "AET", "PEN"].includes(statusShort ?? "");
    const homeTeamApi = f?.teams?.home?.id;

    // Autogoles por jugador (apiId). El `player` del evento es quien lo hizo en
    // contra. Se excluye la tanda de penales (ahí no hay autogoles, pero por las dudas).
    const ownGoalByApiId = new Map<number, number>();
    for (const e of events ?? []) {
      if (e?.type === "Goal" && e?.detail === "Own Goal" && e?.comments !== "Penalty Shootout") {
        const pid = e?.player?.id;
        if (pid != null) ownGoalByApiId.set(pid, (ownGoalByApiId.get(pid) ?? 0) + 1);
      }
    }

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
      penaltiesMissed: number;
      ownGoals: number;
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
          // penalty.missed ya excluye los penales de tanda (se confirmó contra la API).
          penaltiesMissed: st.penalty?.missed ?? 0,
          ownGoals: ownGoalByApiId.get(pl?.player?.id) ?? 0,
          isHome,
        });
      }
    }

    // Figura: mayor rating con >= minMinutes. (Empates: se queda el primero; el admin puede ajustar.)
    let motmPlayerId: number | null = null;
    let best = -1;
    for (const r of raws) {
      if (r.minutes >= SCORING.minMinutes && r.rating != null && r.rating > best) {
        best = r.rating;
        motmPlayerId = r.our.id;
      }
    }

    // Si el admin ya editó alguna fila de este partido, respetamos SU figura (no la
    // recalculamos): de lo contrario, tras un re-sync, la fila manual conservaría su
    // +4 (está protegida) y el algoritmo le daría otro +4 a otro → dos figuras.
    const manualRow = await db
      .select({ id: playerMatchStats.id })
      .from(playerMatchStats)
      .where(and(eq(playerMatchStats.matchId, m.id), eq(playerMatchStats.manualEdit, true)))
      .limit(1);
    const effectiveMotm = manualRow.length > 0 ? m.motmPlayerId : motmPlayerId;

    const ops: BatchOp[] = [];
    for (const r of raws) {
      const concededTeam = r.isHome ? awayScore ?? 0 : homeScore ?? 0;
      const cleanSheet = finished ? concededTeam === 0 : false;
      const isMotm = r.our.id === effectiveMotm;
      const bd = calcularPuntos({
        position: r.our.position,
        minutes: r.minutes,
        rating: r.rating,
        goals: r.goals,
        penaltyGoals: r.penaltyGoals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
        ownGoals: r.ownGoals,
        penaltiesSaved: r.saves,
        penaltiesMissed: r.penaltiesMissed,
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
        ownGoals: r.ownGoals,
        penaltiesSaved: r.saves,
        penaltiesMissed: r.penaltiesMissed,
        goalsConceded: r.our.position === "GK" ? concededTeam : 0,
        cleanSheet,
        rating: r.rating,
        isMotm,
        fantasyPoints: bd.total,
      };
      ops.push(
        db
          .insert(playerMatchStats)
          .values(values)
          .onConflictDoUpdate({
            target: [playerMatchStats.playerId, playerMatchStats.matchId],
            set: values,
            // No pisar filas editadas a mano por el admin (el cron respeta las correcciones).
            setWhere: ne(playerMatchStats.manualEdit, true),
          }),
      );
    }

    ops.push(
      db
        .update(matches)
        .set({
          homeScore,
          awayScore,
          homePenalties,
          awayPenalties,
          status: finished ? "finished" : "scheduled",
          motmPlayerId: effectiveMotm,
        })
        .where(eq(matches.id, m.id)),
    );
    await chunkedBatch(ops);
    return true;
  };

  const results = await mapLimit(ms, SYNC_CONCURRENCY, syncMatch);

  // Los partidos sincronizados pueden cambiar el próximo rival/dificultad de
  // cada selección (estado, kickoff reprogramado): invalidamos el caché de
  // getCountryFixtures (TTL de 1h) para que /jugadores refleje el cambio ya.
  revalidateTag("country-fixtures", "max");

  return { matches: results.filter(Boolean).length };
}
