"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, entryRounds, entryRoundPlayers, leagues, leagueMembers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRound } from "@/lib/queries";

export type SaveLineupInput = {
  formation: string;
  captainPlayerId: number | null;
  coachId: number | null;
  players: { playerId: number; isStarter: boolean; slot: string }[];
  budgetUsed: number;
};

export async function saveLineup(input: SaveLineupInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const round = await getCurrentRound();
  if (!round) return { ok: false as const, error: "no-round" as const };

  let entry = (await db.select().from(entries).where(eq(entries.userId, user.id)).limit(1))[0];
  if (!entry) {
    entry = (
      await db
        .insert(entries)
        .values({ userId: user.id, name: user.username ?? "Mi equipo" })
        .returning()
    )[0];
  }
  if (!entry) throw new Error("No se pudo crear el equipo");

  let er = (
    await db
      .select()
      .from(entryRounds)
      .where(and(eq(entryRounds.entryId, entry.id), eq(entryRounds.roundId, round.id)))
      .limit(1)
  )[0];

  if (er) {
    await db
      .update(entryRounds)
      .set({
        formation: input.formation,
        captainPlayerId: input.captainPlayerId,
        coachId: input.coachId,
        budgetUsed: input.budgetUsed,
      })
      .where(eq(entryRounds.id, er.id));
    await db.delete(entryRoundPlayers).where(eq(entryRoundPlayers.entryRoundId, er.id));
  } else {
    er = (
      await db
        .insert(entryRounds)
        .values({
          entryId: entry.id,
          roundId: round.id,
          formation: input.formation,
          captainPlayerId: input.captainPlayerId,
          coachId: input.coachId,
          budgetUsed: input.budgetUsed,
        })
        .returning()
    )[0];
  }
  if (!er) throw new Error("No se pudo crear la alineación");

  if (input.players.length) {
    await db.insert(entryRoundPlayers).values(
      input.players.map((p) => ({
        entryRoundId: er.id,
        playerId: p.playerId,
        isStarter: p.isStarter,
        slot: p.slot,
      })),
    );
  }

  revalidatePath("/mi-equipo");
  return { ok: true as const };
}

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createLeague(name: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const code = genCode();
  const league = (
    await db
      .insert(leagues)
      .values({ name: name.trim() || "Mi liga", code, ownerId: user.id, isPublic: false })
      .returning()
  )[0];
  if (!league) throw new Error("No se pudo crear la liga");
  await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id }).onConflictDoNothing();
  revalidatePath("/ligas");
  return { ok: true as const, code: league.code };
}

export async function joinLeague(code: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (
    await db.select().from(leagues).where(eq(leagues.code, code.trim().toUpperCase())).limit(1)
  )[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id }).onConflictDoNothing();
  revalidatePath("/ligas");
  return { ok: true as const, code: league.code };
}
