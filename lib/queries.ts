import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  players,
  countries,
  coaches,
  rounds,
  entries,
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
