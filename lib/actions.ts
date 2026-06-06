"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, entryRounds, entryRoundPlayers, leagues, leagueMembers, rounds, players, coaches, pinTransactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEditableRound } from "@/lib/queries";
import { getPinBalance } from "@/lib/pins";
import { BUDGET, MAX_PER_COUNTRY, FREE_CHANGES_PER_ROUND } from "@/lib/game/config";
import { round1 } from "@/lib/pricing/map";

type BatchOp = Parameters<typeof db.batch>[0][number];

export type SaveLineupInput = {
  formation: string;
  captainPlayerId: number | null;
  coachId: number | null;
  players: { playerId: number; isStarter: boolean; slot: string }[];
};

export async function saveLineup(input: SaveLineupInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const editable = await getEditableRound();
  if (!editable) return { ok: false as const, error: "locked" as const };
  const round = editable.round;

  // Validación server-side: recalculamos costo y composición desde la DB,
  // no confiamos en lo que manda el cliente (budgetUsed, conteos).
  const playerIds = input.players.map((p) => p.playerId);
  const pr = playerIds.length
    ? await db
        .select({ id: players.id, price: players.price, countryId: players.countryId })
        .from(players)
        .where(inArray(players.id, playerIds))
    : [];
  if (pr.length !== new Set(playerIds).size) {
    return { ok: false as const, error: "invalid" as const };
  }
  let coachPrice = 0;
  if (input.coachId != null) {
    const c = (await db.select({ price: coaches.price }).from(coaches).where(eq(coaches.id, input.coachId)).limit(1))[0];
    if (!c) return { ok: false as const, error: "invalid" as const };
    coachPrice = c.price;
  }
  const budgetUsed = round1(pr.reduce((s, p) => s + p.price, 0) + coachPrice);
  if (budgetUsed > BUDGET + 0.05) {
    return { ok: false as const, error: "budget" as const, used: budgetUsed, budget: BUDGET };
  }
  // El tope por nacionalidad rige solo en fase de grupos; en playoffs quedan
  // pocas selecciones vivas y mantenerlo lo haría imposible.
  if (round.type === "group") {
    const perCountry = new Map<number, number>();
    for (const p of pr) perCountry.set(p.countryId, (perCountry.get(p.countryId) ?? 0) + 1);
    if ([...perCountry.values()].some((n) => n > MAX_PER_COUNTRY)) {
      return { ok: false as const, error: "country" as const, max: MAX_PER_COUNTRY };
    }
  }

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

  const er0 = (
    await db
      .select()
      .from(entryRounds)
      .where(and(eq(entryRounds.entryId, entry.id), eq(entryRounds.roundId, round.id)))
      .limit(1)
  )[0];

  // Contar cambios vs la alineación de la fecha anterior.
  const prevEr = (
    await db
      .select({ id: entryRounds.id })
      .from(entryRounds)
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(and(eq(entryRounds.entryId, entry.id), lt(rounds.order, round.order)))
      .orderBy(desc(rounds.order))
      .limit(1)
  )[0];

  let changes = 0;
  if (prevEr) {
    const prev = await db
      .select({ playerId: entryRoundPlayers.playerId })
      .from(entryRoundPlayers)
      .where(eq(entryRoundPlayers.entryRoundId, prevEr.id));
    const prevIds = new Set(prev.map((p) => p.playerId));
    changes = input.players.filter((p) => !prevIds.has(p.playerId)).length;
  }

  // 1er cambio gratis por fecha; los extra cuestan pines. Reconcilia re-ediciones.
  const pinsNeeded = Math.max(0, changes - FREE_CHANGES_PER_ROUND);
  const alreadySpent = er0?.pinsSpent ?? 0;
  const delta = pinsNeeded - alreadySpent;

  if (delta > 0) {
    const balance = await getPinBalance(user.id);
    if (balance < delta) {
      return { ok: false as const, error: "pins" as const, needed: delta, balance };
    }
  }

  const erValues = {
    formation: input.formation,
    captainPlayerId: input.captainPlayerId,
    coachId: input.coachId,
    budgetUsed,
    pinsSpent: pinsNeeded,
    changesMade: changes,
  };
  const playerRows = input.players.map((p) => ({
    playerId: p.playerId,
    isStarter: p.isStarter,
    slot: p.slot,
  }));
  // El movimiento de pines va en el mismo ledger; delta>0 descuenta, delta<0 reembolsa.
  const pinRow =
    delta !== 0
      ? { userId: user.id, delta: -delta, reason: "transfer" as const, roundId: round.id }
      : null;

  if (er0) {
    // Re-edición: reemplazo de la alineación. El delete + insert + ajuste de pines
    // deben ser atómicos — si no, un fallo entre medio deja el equipo sin jugadores.
    // neon-http no soporta transaction(), pero batch() corre todo en una sola
    // transacción del servidor.
    const ops: BatchOp[] = [
      db.update(entryRounds).set(erValues).where(eq(entryRounds.id, er0.id)),
      db.delete(entryRoundPlayers).where(eq(entryRoundPlayers.entryRoundId, er0.id)),
    ];
    if (playerRows.length) {
      ops.push(
        db
          .insert(entryRoundPlayers)
          .values(playerRows.map((p) => ({ ...p, entryRoundId: er0.id }))),
      );
    }
    if (pinRow) ops.push(db.insert(pinTransactions).values(pinRow));
    await db.batch(ops as [BatchOp, ...BatchOp[]]);
  } else {
    // Primera alineación de la fecha: necesitamos el id generado antes de insertar
    // los jugadores, así que el insert del entryRound va aparte. No hay delete acá,
    // por lo que un fallo parcial deja a lo sumo un entryRound sin jugadores
    // (recuperable re-guardando), no una alineación borrada.
    const er = (
      await db
        .insert(entryRounds)
        .values({ entryId: entry.id, roundId: round.id, ...erValues })
        .returning()
    )[0];
    if (!er) throw new Error("No se pudo crear la alineación");
    const ops: BatchOp[] = [];
    if (playerRows.length) {
      ops.push(
        db.insert(entryRoundPlayers).values(playerRows.map((p) => ({ ...p, entryRoundId: er.id }))),
      );
    }
    if (pinRow) ops.push(db.insert(pinTransactions).values(pinRow));
    if (ops.length) await db.batch(ops as [BatchOp, ...BatchOp[]]);
  }

  revalidatePath("/mi-equipo");
  return { ok: true as const, changes, pinsSpent: pinsNeeded };
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

/** Solo el dueño puede renombrar la liga. */
export async function renameLeague(leagueId: number, newName: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId !== user.id) return { ok: false as const, error: "forbidden" as const };
  const name = newName.trim();
  if (!name) return { ok: false as const, error: "empty" as const };
  await db.update(leagues).set({ name }).where(eq(leagues.id, leagueId));
  revalidatePath(`/ligas/${league.code}`);
  revalidatePath("/ligas");
  return { ok: true as const };
}

/** Solo el dueño puede expulsar miembros (no a sí mismo). */
export async function removeMember(leagueId: number, userIdToRemove: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId !== user.id) return { ok: false as const, error: "forbidden" as const };
  if (userIdToRemove === league.ownerId) return { ok: false as const, error: "owner" as const };
  await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userIdToRemove)));
  revalidatePath(`/ligas/${league.code}`);
  return { ok: true as const };
}
