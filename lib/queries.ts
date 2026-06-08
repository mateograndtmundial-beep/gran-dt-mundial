import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  players,
  countries,
  coaches,
  rounds,
  matches,
  playerMatchStats,
  entries,
  entryRounds,
  entryRoundPlayers,
  leagues,
  leagueMembers,
  users,
  products,
} from "@/lib/db/schema";
import { buildRoundBreakdown, type RoundBreakdown } from "@/lib/scoring/desglose";
import type { Position } from "@/lib/game/config";

export type PlayerRow = Awaited<ReturnType<typeof getPlayersWithCountry>>[number];
export type CoachRow = Awaited<ReturnType<typeof getCoaches>>[number];

export async function getPlayersWithCountry() {
  return db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      price: players.price,
      priceManual: players.priceManual,
      photoUrl: players.photoUrl,
      club: players.club,
      birthYear: players.birthYear,
      countryId: players.countryId,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(players)
    .innerJoin(countries, eq(players.countryId, countries.id))
    .orderBy(desc(players.price));
}

// ---------- Info de Mundial para /jugadores ----------

export type FixtureInfo = {
  opponentName: string | null;
  opponentFlag: string | null;
  kickoff: string | null; // ISO
  venue: string | null;
  roundName: string | null;
  isHome: boolean;
  difficulty: "easy" | "medium" | "hard";
};

/**
 * Próximo partido + dificultad por selección, para el panel de /jugadores.
 * La dificultad es un proxy: la fuerza del rival = suma del valor de su plantel
 * (los precios que ya tenemos), rankeada en 3 tramos (top=alta, medio, bajo=baja).
 * Devuelve countryId -> lista de próximos partidos (no jugados), del más cercano al más lejano (máx 3).
 */
export const getCountryFixtures = unstable_cache(
  async (): Promise<Record<number, FixtureInfo[]>> => {
  const vals = await db
    .select({ countryId: players.countryId, value: sql<number>`sum(${players.price})` })
    .from(players)
    .groupBy(players.countryId);
  const sorted = vals
    .map((v) => ({ id: v.countryId, value: Number(v.value) }))
    .sort((a, b) => b.value - a.value);
  const n = sorted.length || 1;
  const strengthTier = new Map<number, "hard" | "medium" | "easy">();
  sorted.forEach((c, i) => {
    strengthTier.set(c.id, i < n / 3 ? "hard" : i < (2 * n) / 3 ? "medium" : "easy");
  });

  const home = alias(countries, "fx_home");
  const away = alias(countries, "fx_away");
  const ms = await db
    .select({
      homeCountryId: matches.homeCountryId,
      awayCountryId: matches.awayCountryId,
      homeName: home.name,
      homeFlag: home.flagUrl,
      awayName: away.name,
      awayFlag: away.flagUrl,
      kickoff: matches.kickoff,
      venue: matches.venue,
      roundName: rounds.name,
    })
    .from(matches)
    .leftJoin(home, eq(matches.homeCountryId, home.id))
    .leftJoin(away, eq(matches.awayCountryId, away.id))
    .leftJoin(rounds, eq(matches.roundId, rounds.id))
    .where(ne(matches.status, "finished"))
    .orderBy(asc(matches.kickoff));

  const MAX = 3; // próximos N partidos (la fase de grupos son 3)
  const out: Record<number, FixtureInfo[]> = {};
  // ms viene ordenado por kickoff asc → las listas quedan cronológicas.
  const add = (cid: number, info: FixtureInfo) => {
    const arr = (out[cid] ??= []);
    if (arr.length < MAX) arr.push(info);
  };
  for (const m of ms) {
    if (m.homeCountryId == null || m.awayCountryId == null) continue;
    const kickoff = m.kickoff ? new Date(m.kickoff).toISOString() : null;
    add(m.homeCountryId, {
      opponentName: m.awayName,
      opponentFlag: m.awayFlag,
      kickoff,
      venue: m.venue,
      roundName: m.roundName,
      isHome: true,
      difficulty: strengthTier.get(m.awayCountryId) ?? "medium",
    });
    add(m.awayCountryId, {
      opponentName: m.homeName,
      opponentFlag: m.homeFlag,
      kickoff,
      venue: m.venue,
      roundName: m.roundName,
      isHome: false,
      difficulty: strengthTier.get(m.homeCountryId) ?? "medium",
    });
  }
  return out;
  },
  ["country-fixtures"],
  // Los fixtures casi no cambian (solo al sincronizar partidos): TTL largo +
  // invalidación on-demand desde syncRound vía revalidateTag.
  { tags: ["country-fixtures"], revalidate: 3600 },
);

/** ¿El usuario ya es miembro de la liga? (para mostrar/ocultar el CTA de unirse) */
export async function isLeagueMember(leagueId: number, userId: number): Promise<boolean> {
  const r = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .limit(1);
  return r.length > 0;
}

// ---------- Editor de scoring (admin) ----------

/** Una fecha con sus partidos (nombres/banderas + cuántos jugadores tienen stats). */
export async function getRoundWithMatches(roundId: number) {
  const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
  if (!round) return null;

  const home = alias(countries, "home_c");
  const away = alias(countries, "away_c");
  const ms = await db
    .select({
      id: matches.id,
      kickoff: matches.kickoff,
      venue: matches.venue,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homePenalties: matches.homePenalties,
      awayPenalties: matches.awayPenalties,
      motmPlayerId: matches.motmPlayerId,
      homeCountryId: matches.homeCountryId,
      awayCountryId: matches.awayCountryId,
      homeName: home.name,
      homeFlag: home.flagUrl,
      awayName: away.name,
      awayFlag: away.flagUrl,
    })
    .from(matches)
    .leftJoin(home, eq(matches.homeCountryId, home.id))
    .leftJoin(away, eq(matches.awayCountryId, away.id))
    .where(eq(matches.roundId, roundId))
    .orderBy(asc(matches.kickoff));

  const ids = ms.map((m) => m.id);
  const counts = ids.length
    ? await db
        .select({ matchId: playerMatchStats.matchId, n: sql<number>`count(*)::int` })
        .from(playerMatchStats)
        .where(inArray(playerMatchStats.matchId, ids))
        .groupBy(playerMatchStats.matchId)
    : [];
  const countByMatch = new Map(counts.map((c) => [c.matchId, Number(c.n)]));

  return {
    round,
    matches: ms.map((m) => ({ ...m, statsCount: countByMatch.get(m.id) ?? 0 })),
  };
}

/** Un partido + ambos planteles (con sus stats si ya existen) para editar a mano. */
export async function getMatchEditor(matchId: number) {
  const home = alias(countries, "home_c");
  const away = alias(countries, "away_c");
  const m = (
    await db
      .select({
        id: matches.id,
        roundId: matches.roundId,
        homeCountryId: matches.homeCountryId,
        awayCountryId: matches.awayCountryId,
        homeName: home.name,
        homeFlag: home.flagUrl,
        awayName: away.name,
        awayFlag: away.flagUrl,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homePenalties: matches.homePenalties,
        awayPenalties: matches.awayPenalties,
        status: matches.status,
        motmPlayerId: matches.motmPlayerId,
        roundName: rounds.name,
        roundType: rounds.type,
        roundStatus: rounds.status,
      })
      .from(matches)
      .leftJoin(home, eq(matches.homeCountryId, home.id))
      .leftJoin(away, eq(matches.awayCountryId, away.id))
      .leftJoin(rounds, eq(matches.roundId, rounds.id))
      .where(eq(matches.id, matchId))
      .limit(1)
  )[0];
  if (!m) return null;
  if (m.homeCountryId == null || m.awayCountryId == null) return { match: m, players: [] };

  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      position: players.position,
      countryId: players.countryId,
      jerseyNumber: players.jerseyNumber,
      minutes: playerMatchStats.minutes,
      rating: playerMatchStats.rating,
      goals: playerMatchStats.goals,
      penaltyGoals: playerMatchStats.penaltyGoals,
      assists: playerMatchStats.assists,
      yellow: playerMatchStats.yellow,
      red: playerMatchStats.red,
      ownGoals: playerMatchStats.ownGoals,
      penaltiesSaved: playerMatchStats.penaltiesSaved,
      penaltiesMissed: playerMatchStats.penaltiesMissed,
      cleanSheet: playerMatchStats.cleanSheet,
      isMotm: playerMatchStats.isMotm,
      fantasyPoints: playerMatchStats.fantasyPoints,
      manualEdit: playerMatchStats.manualEdit,
      hasStat: sql<boolean>`${playerMatchStats.id} is not null`,
    })
    .from(players)
    .leftJoin(
      playerMatchStats,
      and(eq(playerMatchStats.playerId, players.id), eq(playerMatchStats.matchId, matchId)),
    )
    .where(inArray(players.countryId, [m.homeCountryId, m.awayCountryId]))
    .orderBy(asc(players.countryId), asc(players.position), desc(playerMatchStats.minutes), asc(players.name));

  return { match: m, players: rows };
}

/**
 * Fechas que conviene sincronizar ahora: no publicadas, ya empezadas (primer
 * partido <= now) y con algún partido dentro de la ventana reciente (para no
 * golpear la API por fechas viejas sin publicar). La usa el cron.
 */
export async function getRoundsToSync(now: Date = new Date(), windowHours = 72): Promise<number[]> {
  const rows = await db
    .select({
      id: rounds.id,
      firstKickoff: sql<string | null>`min(${matches.kickoff})`,
      lastKickoff: sql<string | null>`max(${matches.kickoff})`,
    })
    .from(rounds)
    .leftJoin(matches, eq(matches.roundId, rounds.id))
    .where(ne(rounds.status, "published"))
    .groupBy(rounds.id)
    .orderBy(asc(rounds.order));

  const nowMs = now.getTime();
  const cutoff = nowMs - windowHours * 3_600_000;
  return rows
    .filter((r) => r.firstKickoff != null && new Date(r.firstKickoff).getTime() <= nowMs)
    .filter((r) => r.lastKickoff != null && new Date(r.lastKickoff).getTime() >= cutoff)
    .map((r) => r.id);
}

export async function getCoaches() {
  return db
    .select({
      id: coaches.id,
      name: coaches.name,
      photoUrl: coaches.photoUrl,
      price: coaches.price,
      countryId: coaches.countryId,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
    })
    .from(coaches)
    .innerJoin(countries, eq(coaches.countryId, countries.id));
}

/**
 * Fecha editable = la primera no publicada cuyo primer partido todavía no arrancó.
 * Su "deadline" es el kickoff de ese primer partido. Cuando ese partido empieza,
 * la fecha queda bloqueada y la editable pasa a la siguiente. Devuelve null si no
 * hay ninguna editable (todo arrancó/publicado → equipo bloqueado).
 */
export async function getEditableRound(now: Date = new Date()) {
  // Una sola query: trae las rondas no publicadas con el kickoff de su primer
  // partido (min) vía leftJoin + groupBy, en vez de N+1 (una query por ronda).
  const candidates = await db
    .select({
      round: rounds,
      firstKickoff: sql<string | null>`min(${matches.kickoff})`,
    })
    .from(rounds)
    .leftJoin(matches, eq(matches.roundId, rounds.id))
    .where(ne(rounds.status, "published"))
    .groupBy(rounds.id)
    .orderBy(asc(rounds.order));
  for (const c of candidates) {
    const deadline = c.firstKickoff ? new Date(c.firstKickoff) : null;
    if (!deadline || deadline > now) return { round: c.round, deadline };
  }
  return null;
}

/** Fecha sobre la que se guarda la alineación (la editable). Null si está bloqueado. */
export async function getCurrentRound() {
  return (await getEditableRound())?.round ?? null;
}

export async function getAllRounds() {
  return db.select().from(rounds).orderBy(asc(rounds.order));
}

/**
 * Los rankings (global y posición del usuario) muestran a todos en 0 pts hasta
 * que se juegue y publique la Fecha 1 — hasta entonces no aportan nada y
 * confunden. Se habilitan recién cuando esa fecha (order = 1) queda `published`.
 */
export async function isRankingsVisible(): Promise<boolean> {
  const r = (
    await db.select({ status: rounds.status }).from(rounds).where(eq(rounds.order, 1)).limit(1)
  )[0];
  return r?.status === "published";
}

export async function getGlobalLeaderboard(limit = 100, offset = 0) {
  return db
    .select({
      entryId: entries.id,
      name: entries.name,
      totalPoints: entries.totalPoints,
      username: users.username,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .orderBy(desc(entries.totalPoints), asc(entries.id))
    .limit(Math.max(1, Math.min(limit, 200)))
    .offset(Math.max(0, offset));
}

/**
 * Posición global de un entry: 1 + cantidad de entries con más puntos.
 *
 * Cacheada con el Data Cache de Next (tag `global-rank`): los puntos solo
 * cambian cuando se publica una fecha (`publishRound` invalida el tag), así
 * que sin esto cada carga de /mi-equipo (force-dynamic) disparaba un
 * `COUNT(*)` contra Neon — con miles de usuarios refrescando tras publicar,
 * eran miles de scans concurrentes en el camino caliente.
 */
export const getUserGlobalRank = unstable_cache(
  async (entryId: number): Promise<number | null> => {
    const me = (
      await db.select({ pts: entries.totalPoints }).from(entries).where(eq(entries.id, entryId)).limit(1)
    )[0];
    if (!me) return null;
    const r = (
      await db.select({ c: sql<number>`count(*)` }).from(entries).where(gt(entries.totalPoints, me.pts))
    )[0];
    return Number(r?.c ?? 0) + 1;
  },
  ["user-global-rank"],
  { tags: ["global-rank"] },
);

export async function getMyTeam(userId: number) {
  const entry = (await db.select().from(entries).where(eq(entries.userId, userId)).limit(1))[0];
  if (!entry) return null;
  const roundRows = await db
    .select({
      id: entryRounds.id,
      points: entryRounds.points,
      formation: entryRounds.formation,
      captainPlayerId: entryRounds.captainPlayerId,
      roundName: rounds.name,
      order: rounds.order,
    })
    .from(entryRounds)
    .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
    .where(eq(entryRounds.entryId, entry.id))
    .orderBy(asc(rounds.order));
  return { entry, rounds: roundRows };
}

/** Última alineación guardada del usuario (para precargar el armador al editar). */
export async function getEditableLineup(userId: number) {
  const entry = (await db.select().from(entries).where(eq(entries.userId, userId)).limit(1))[0];
  if (!entry) return null;
  const er = (
    await db
      .select({
        id: entryRounds.id,
        formation: entryRounds.formation,
        captainPlayerId: entryRounds.captainPlayerId,
        coachId: entryRounds.coachId,
      })
      .from(entryRounds)
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(eq(entryRounds.entryId, entry.id))
      .orderBy(desc(rounds.order))
      .limit(1)
  )[0];
  if (!er) return null;
  const lp = await db
    .select({ slot: entryRoundPlayers.slot, playerId: entryRoundPlayers.playerId })
    .from(entryRoundPlayers)
    .where(eq(entryRoundPlayers.entryRoundId, er.id));
  const slots: Record<string, number> = {};
  for (const r of lp) if (r.slot) slots[r.slot] = r.playerId;
  return { teamName: entry.name, formation: er.formation, captainPlayerId: er.captainPlayerId, coachId: er.coachId, slots };
}

export async function getMyLeagues(userId: number) {
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      code: leagues.code,
      isPublic: leagues.isPublic,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId));
}

export const LEAGUE_RANKING_PAGE_SIZE = 50;

/**
 * Ranking de una liga, paginado: una liga viral grande puede tener cientos de
 * miembros y antes se traían y renderizaban todos de una. `page` es 1-based.
 */
export async function getLeagueRanking(code: string, page = 1) {
  const league = (
    await db.select().from(leagues).where(eq(leagues.code, code.toUpperCase())).limit(1)
  )[0];
  if (!league) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.id));
  const total = Number(count);

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * LEAGUE_RANKING_PAGE_SIZE;

  const rows = await db
    .select({
      userId: leagueMembers.userId,
      username: users.username,
      entryName: entries.name,
      totalPoints: entries.totalPoints,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .leftJoin(entries, eq(entries.userId, users.id))
    .where(eq(leagueMembers.leagueId, league.id))
    .orderBy(desc(entries.totalPoints))
    .limit(LEAGUE_RANKING_PAGE_SIZE)
    .offset(offset);

  return { league, rows, total, page: safePage, pageSize: LEAGUE_RANKING_PAGE_SIZE };
}

/**
 * Lista completa de miembros de una liga (sin paginar): la usa LeagueManagement
 * para que el dueño pueda expulsar a cualquiera, no solo a los de la página
 * visible del ranking. Es owner-only y on-demand, no el camino caliente.
 */
export async function getLeagueMembersForManagement(leagueId: number) {
  return db
    .select({ userId: leagueMembers.userId, username: users.username, entryName: entries.name })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .leftJoin(entries, eq(entries.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId));
}

export async function getLineupPlayers(entryRoundId: number) {
  return db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      price: players.price,
      isStarter: entryRoundPlayers.isStarter,
      slot: entryRoundPlayers.slot,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(entryRoundPlayers)
    .innerJoin(players, eq(entryRoundPlayers.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(entryRoundPlayers.entryRoundId, entryRoundId));
}

/**
 * Desglose por jugador de la fecha de un equipo, para "Puntos por fecha".
 * Solo devuelve detalle si la fecha está `published`. Verifica que el entryRound
 * sea del usuario. El cómputo (reusando la lógica real de scoring) vive en
 * lib/scoring/desglose.ts; acá solo se traen los datos.
 */
export async function getRoundBreakdown(
  entryRoundId: number,
  userId: number,
): Promise<RoundBreakdown | null> {
  const er = (
    await db
      .select({
        roundId: entryRounds.roundId,
        captainPlayerId: entryRounds.captainPlayerId,
        coachId: entryRounds.coachId,
        ownerId: entries.userId,
        roundStatus: rounds.status,
      })
      .from(entryRounds)
      .innerJoin(entries, eq(entryRounds.entryId, entries.id))
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(eq(entryRounds.id, entryRoundId))
      .limit(1)
  )[0];
  if (!er || er.ownerId !== userId) return null;
  if (er.roundStatus !== "published") return { published: false };

  const lineup = await db
    .select({
      playerId: entryRoundPlayers.playerId,
      isStarter: entryRoundPlayers.isStarter,
      slot: entryRoundPlayers.slot,
      name: players.name,
      position: players.position,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(entryRoundPlayers)
    .innerJoin(players, eq(entryRoundPlayers.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(entryRoundPlayers.entryRoundId, entryRoundId));

  const ms = await db
    .select({
      id: matches.id,
      homeCountryId: matches.homeCountryId,
      awayCountryId: matches.awayCountryId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homePenalties: matches.homePenalties,
      awayPenalties: matches.awayPenalties,
    })
    .from(matches)
    .where(eq(matches.roundId, er.roundId));

  const playerIds = lineup.map((l) => l.playerId);
  const matchIds = ms.map((m) => m.id);
  const stats =
    playerIds.length && matchIds.length
      ? await db
          .select({
            playerId: playerMatchStats.playerId,
            minutes: playerMatchStats.minutes,
            rating: playerMatchStats.rating,
            goals: playerMatchStats.goals,
            penaltyGoals: playerMatchStats.penaltyGoals,
            assists: playerMatchStats.assists,
            yellow: playerMatchStats.yellow,
            red: playerMatchStats.red,
            ownGoals: playerMatchStats.ownGoals,
            penaltiesSaved: playerMatchStats.penaltiesSaved,
            penaltiesMissed: playerMatchStats.penaltiesMissed,
            goalsConceded: playerMatchStats.goalsConceded,
            cleanSheet: playerMatchStats.cleanSheet,
            isMotm: playerMatchStats.isMotm,
          })
          .from(playerMatchStats)
          .where(
            and(
              inArray(playerMatchStats.playerId, playerIds),
              inArray(playerMatchStats.matchId, matchIds),
            ),
          )
      : [];

  const coach =
    er.coachId != null
      ? (
          await db
            .select({
              name: coaches.name,
              countryId: coaches.countryId,
              countryName: countries.name,
              flagUrl: countries.flagUrl,
            })
            .from(coaches)
            .innerJoin(countries, eq(coaches.countryId, countries.id))
            .where(eq(coaches.id, er.coachId))
            .limit(1)
        )[0] ?? null
      : null;

  return buildRoundBreakdown({
    captainPlayerId: er.captainPlayerId,
    lineup: lineup.map((l) => ({ ...l, position: l.position as Position })),
    stats,
    matches: ms,
    coach,
  });
}

export async function getActiveProducts() {
  return db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.pins));
}
