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

/** Posición global de un entry: 1 + cantidad de entries con más puntos. */
export async function getUserGlobalRank(entryId: number): Promise<number | null> {
  const me = (
    await db.select({ pts: entries.totalPoints }).from(entries).where(eq(entries.id, entryId)).limit(1)
  )[0];
  if (!me) return null;
  const r = (
    await db.select({ c: sql<number>`count(*)` }).from(entries).where(gt(entries.totalPoints, me.pts))
  )[0];
  return Number(r?.c ?? 0) + 1;
}

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

export async function getLeagueRanking(code: string) {
  const league = (
    await db.select().from(leagues).where(eq(leagues.code, code.toUpperCase())).limit(1)
  )[0];
  if (!league) return null;
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
    .orderBy(desc(entries.totalPoints));
  return { league, rows };
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

export async function getActiveProducts() {
  return db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.pins));
}
