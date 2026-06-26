import { eq, inArray, sql } from "drizzle-orm";
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
// Mínimo de SUPLENTES (flag `substitute` de la API) que tienen que aparecer. En la
// carga parcial temprana, API-Football suele devolver solo el XI inicial (todos
// substitute=false) y recién después suma el banco. Sin suplentes, el carrusel
// mostraría todos como titulares y la sección de suplentes vacía. Casi todo partido
// moderno tiene 4-10 cambios → pedir 2 es holgado y confirma que el banco ya cargó.
// OJO: NO filtramos por minutos acá — un suplente que jugó <20' igual tiene que
// aparecer (es la data que faltaba).
const MIN_SUBSTITUTES = 2;

/**
 * Predicado puro de "stats completas": al menos `MIN_FULL_MATCH_PLAYERS` jugadores
 * con 90'+, AMBAS selecciones representadas, y que ya esté cargada la data de
 * suplentes (`substitutes >= MIN_SUBSTITUTES`). Compartido por el chequeo contra la
 * DB (matchHasCompleteStats / matchesWithCompleteStats) y por el sync, que lo evalúa
 * en memoria sobre los datos recién bajados ANTES de decidir si marca el partido como
 * `finished` (ver lib/api-football/sync.ts). Tener una sola definición evita que el
 * umbral se desincronice entre "marcar finished" y "postear stories/carrusel".
 */
export function statsLookComplete(
  fullMatchPlayers: number,
  teamsRepresented: number,
  substitutes: number,
): boolean {
  return (
    fullMatchPlayers >= MIN_FULL_MATCH_PLAYERS &&
    teamsRepresented >= 2 &&
    substitutes >= MIN_SUBSTITUTES
  );
}

// count(*) FILTER (WHERE ...): columnas agregadas condicionales en una sola pasada
// (Postgres). Necesitamos contar "jugadores con 90'+" Y "suplentes" sin un WHERE que
// restrinja las filas (el banco juega <90' y, a veces, <20').
const full90 = sql<number>`count(*) filter (where ${playerMatchStats.minutes} >= 90)`;
const teams90 = sql<number>`count(distinct ${players.countryId}) filter (where ${playerMatchStats.minutes} >= 90)`;
const subsCount = sql<number>`count(*) filter (where ${playerMatchStats.substitute})`;

/**
 * true si las stats del partido lucen COMPLETAS (ver `statsLookComplete`): titulares
 * con 90'+, ambas selecciones y el banco ya cargado.
 */
export async function matchHasCompleteStats(matchId: number): Promise<boolean> {
  const [row] = await db
    .select({ full: full90, teams: teams90, subs: subsCount })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .where(eq(playerMatchStats.matchId, matchId));

  if (!row) return false;
  return statsLookComplete(Number(row.full), Number(row.teams), Number(row.subs));
}

/** Versión batch: devuelve el set de matchIds (de los dados) con stats completas. */
export async function matchesWithCompleteStats(matchIds: number[]): Promise<Set<number>> {
  if (matchIds.length === 0) return new Set();
  const rows = await db
    .select({ matchId: playerMatchStats.matchId, full: full90, teams: teams90, subs: subsCount })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .where(inArray(playerMatchStats.matchId, matchIds))
    .groupBy(playerMatchStats.matchId);

  const ok = new Set<number>();
  for (const r of rows) {
    if (statsLookComplete(Number(r.full), Number(r.teams), Number(r.subs))) ok.add(r.matchId);
  }
  return ok;
}
