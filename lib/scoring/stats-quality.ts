import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, playerMatchStats } from "@/lib/db/schema";

/*
 * Sanity-check de las stats de un partido. API-Football marca un fixture como
 * FT/AET/PEN antes de tener cargadas TODAS las estadísticas de jugadores: durante
 * unos minutos puede devolver el partido "terminado" con stats vacías o parciales.
 * Si en ese momento sincronizamos y posteamos, sale un carrusel/story con tablas
 * vacías (y, como es idempotente, queda así para siempre).
 *
 * Un partido REAL terminado tiene ~22 jugadores con minutos y la gran mayoría de
 * los titulares con 90'+ (o 120' con alargue). Exigimos una señal conservadora de
 * que la data ya está completa antes de dar el partido por "listo para postear".
 */

// Mínimo de jugadores con 90'+ para considerar las stats completas. Un partido
// normal tiene ~14-20; pedimos 8 (holgado incluso con muchos cambios/expulsiones).
const MIN_FULL_MATCH_PLAYERS = 8;

/**
 * true si las stats del partido lucen COMPLETAS: al menos `MIN_FULL_MATCH_PLAYERS`
 * jugadores con 90'+ y AMBAS selecciones representadas (no un solo equipo cargado).
 */
export async function matchHasCompleteStats(matchId: number): Promise<boolean> {
  const [row] = await db
    .select({
      full: sql<number>`count(*)`,
      teams: sql<number>`count(distinct ${players.countryId})`,
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .where(and(eq(playerMatchStats.matchId, matchId), gte(playerMatchStats.minutes, 90)));

  if (!row) return false;
  return Number(row.full) >= MIN_FULL_MATCH_PLAYERS && Number(row.teams) >= 2;
}

/** Versión batch: devuelve el set de matchIds (de los dados) con stats completas. */
export async function matchesWithCompleteStats(matchIds: number[]): Promise<Set<number>> {
  if (matchIds.length === 0) return new Set();
  const rows = await db
    .select({
      matchId: playerMatchStats.matchId,
      full: sql<number>`count(*)`,
      teams: sql<number>`count(distinct ${players.countryId})`,
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .where(and(inArray(playerMatchStats.matchId, matchIds), gte(playerMatchStats.minutes, 90)))
    .groupBy(playerMatchStats.matchId);

  const ok = new Set<number>();
  for (const r of rows) {
    if (Number(r.full) >= MIN_FULL_MATCH_PLAYERS && Number(r.teams) >= 2) ok.add(r.matchId);
  }
  return ok;
}
