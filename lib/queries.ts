import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  players,
  countries,
  coaches,
  rounds,
  entries,
  entryRounds,
  entryRoundPlayers,
  leagues,
  leagueMembers,
  users,
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
      photoUrl: players.photoUrl,
      club: players.club,
      countryId: players.countryId,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(players)
    .innerJoin(countries, eq(players.countryId, countries.id))
    .orderBy(desc(players.price));
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

export async function getCurrentRound() {
  const open = await db
    .select()
    .from(rounds)
    .where(eq(rounds.status, "open"))
    .orderBy(asc(rounds.order))
    .limit(1);
  if (open.length) return open[0];
  const any = await db.select().from(rounds).orderBy(asc(rounds.order)).limit(1);
  return any[0] ?? null;
}

export async function getAllRounds() {
  return db.select().from(rounds).orderBy(asc(rounds.order));
}

export async function getGlobalLeaderboard(limit = 100) {
  return db
    .select({
      entryId: entries.id,
      name: entries.name,
      totalPoints: entries.totalPoints,
      username: users.username,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .orderBy(desc(entries.totalPoints))
    .limit(limit);
}

export async function getMyTeam(userId: number) {
  const entry = (await db.select().from(entries).where(eq(entries.userId, userId)).limit(1))[0];
  if (!entry) return null;
  const roundRows = await db
    .select({
      id: entryRounds.id,
      points: entryRounds.points,
      formation: entryRounds.formation,
      roundName: rounds.name,
      order: rounds.order,
    })
    .from(entryRounds)
    .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
    .where(eq(entryRounds.entryId, entry.id))
    .orderBy(asc(rounds.order));
  return { entry, rounds: roundRows };
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
      isStarter: entryRoundPlayers.isStarter,
      slot: entryRoundPlayers.slot,
      countryName: countries.name,
    })
    .from(entryRoundPlayers)
    .innerJoin(players, eq(entryRoundPlayers.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(entryRoundPlayers.entryRoundId, entryRoundId));
}
