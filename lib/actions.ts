"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, entryRounds, entryRoundPlayers, leagues, leagueMembers, rounds, players, coaches } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEditableRound } from "@/lib/queries";
import { getPinBalance, pinMovementOps, isInsufficientPinsError } from "@/lib/pins";
import { BUDGET, MAX_PER_COUNTRY, FREE_CHANGES_PER_ROUND, type Position } from "@/lib/game/config";
import { validateLineupShape } from "@/lib/game/lineup";
import { saveLineupSchema, type SaveLineupInput } from "@/lib/validation/lineup";
import { round1 } from "@/lib/pricing/map";
import { countPlayerChanges, pinsForChanges } from "@/lib/game/changes";

type BatchOp = Parameters<typeof db.batch>[0][number];

// El tipo SaveLineupInput vive en @/lib/validation/lineup. No se re-exporta acá:
// este archivo es "use server" y solo puede exportar funciones async.

export async function saveLineup(rawInput: SaveLineupInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };

  // Validación de forma con zod: tipos, longitudes, formato de slot, sin duplicados.
  // No confiamos en el cliente: todo se revalida acá antes de tocar la DB.
  const parsed = saveLineupSchema.safeParse(rawInput);
  if (!parsed.success) {
    type FormError = "name" | "invalid_formation" | "invalid_slot" | "duplicate_player" | "duplicate_slot" | "invalid";
    const code = (parsed.error.issues[0]?.message ?? "invalid") as FormError;
    return { ok: false as const, error: code };
  }
  const input = parsed.data;

  const editable = await getEditableRound();
  if (!editable) return { ok: false as const, error: "locked" as const };
  const round = editable.round;

  const teamName = input.teamName;

  // Validación server-side: recalculamos costo y composición desde la DB,
  // no confiamos en lo que manda el cliente (budgetUsed, conteos, posiciones).
  const playerIds = input.players.map((p) => p.playerId);
  const pr = playerIds.length
    ? await db
        .select({ id: players.id, price: players.price, countryId: players.countryId, position: players.position })
        .from(players)
        .where(inArray(players.id, playerIds))
    : [];
  if (pr.length !== new Set(playerIds).size) {
    return { ok: false as const, error: "invalid" as const };
  }

  // Composición: la formación, el tamaño del plantel (11+4) y la posición real de
  // cada jugador deben calzar con los slots. La posición la trae la DB, no el cliente.
  const positionById = new Map<number, Position>(pr.map((p) => [p.id, p.position as Position]));
  const shapeError = validateLineupShape(input.formation, input.players, positionById);
  if (shapeError) return { ok: false as const, error: shapeError };

  // El capitán, si se eligió, debe ser uno de los titulares enviados.
  if (input.captainPlayerId != null) {
    const isStarter = input.players.some((p) => p.playerId === input.captainPlayerId && p.isStarter);
    if (!isStarter) return { ok: false as const, error: "invalid_captain" as const };
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
    entry = (await db.insert(entries).values({ userId: user.id, name: teamName }).returning())[0];
  } else if (!entry.name && entry.name !== teamName) {
    // El nombre se fija una sola vez (al crear el equipo): si ya tiene uno,
    // ignoramos cambios entrantes para que quede consistente con el ranking.
    await db.update(entries).set({ name: teamName }).where(eq(entries.id, entry.id));
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
    changes = countPlayerChanges(
      input.players.map((p) => p.playerId),
      prev.map((p) => p.playerId),
    );
  }

  // 1er cambio gratis por fecha; los extra cuestan pines. Reconcilia re-ediciones.
  // Los usuarios premium (compraron el pack "ilimitado") no pagan cambios extra.
  // Fórmula en lib/game/changes.ts (compartida con el contador del armador).
  const pinsNeeded = pinsForChanges(changes, { freeChanges: FREE_CHANGES_PER_ROUND, isPremium: user.isPremium });
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
  // El movimiento de pines va en el mismo batch (=misma transacción) que la
  // alineación. Para delta>0 son ops atómicas (lock + débito) que abortan el batch si
  // el saldo no alcanza (ver pinMovementOps), evitando guardar sin cobrar y negativos.
  const pinOps = delta !== 0 ? (pinMovementOps(user.id, delta, round.id) as BatchOp[]) : [];

  // Ejecuta el batch mapeando el guard de pines (1/0) a un error "pins" limpio.
  const runBatch = async (ops: BatchOp[]) => {
    if (!ops.length) return { pins: false as const };
    try {
      await db.batch(ops as [BatchOp, ...BatchOp[]]);
      return { pins: false as const };
    } catch (e) {
      if (isInsufficientPinsError(e)) return { pins: true as const };
      throw e;
    }
  };

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
    ops.push(...pinOps);
    const r = await runBatch(ops);
    if (r.pins) return { ok: false as const, error: "pins" as const, needed: delta, balance: await getPinBalance(user.id) };
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
    ops.push(...pinOps);
    const r = await runBatch(ops);
    if (r.pins) return { ok: false as const, error: "pins" as const, needed: delta, balance: await getPinBalance(user.id) };
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

const LEAGUE_NAME_MAX = 40;

export async function createLeague(name: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const code = genCode();
  const cleanName = (typeof name === "string" ? name : "").trim().slice(0, LEAGUE_NAME_MAX) || "Mi liga";
  // Por defecto la liga arranca a puntuar desde la próxima instancia jugable (la
  // fecha editable): quien se sume con el Mundial ya empezado parte de 0 en la liga.
  // Si no hay editable (torneo cerrado), null = cuenta todo desde Fecha 1.
  const editable = await getEditableRound();
  const league = (
    await db
      .insert(leagues)
      .values({ name: cleanName, code, ownerId: user.id, isPublic: false, scoringStartRoundId: editable?.round.id ?? null })
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
  // Los códigos son de 6 chars del alfabeto de genCode (sin O/0/I/1 ambiguos).
  const clean = (typeof code === "string" ? code : "").trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(clean)) return { ok: false as const, error: "not-found" as const };
  const league = (
    await db.select().from(leagues).where(eq(leagues.code, clean)).limit(1)
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
  const name = (typeof newName === "string" ? newName : "").trim().slice(0, LEAGUE_NAME_MAX);
  if (!name) return { ok: false as const, error: "empty" as const };
  await db.update(leagues).set({ name }).where(eq(leagues.id, leagueId));
  revalidatePath(`/ligas/${league.code}`);
  revalidatePath("/ligas");
  return { ok: true as const };
}

/**
 * Solo el dueño define desde qué instancia puntúa la liga. `roundId` null =
 * desde el inicio (Fecha 1, cuenta todo). Es reversible en cualquier momento.
 */
export async function setLeagueScoringStart(leagueId: number, roundId: number | null) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId !== user.id) return { ok: false as const, error: "forbidden" as const };
  if (roundId != null) {
    const r = (await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
    if (!r) return { ok: false as const, error: "not-found" as const };
  }
  await db.update(leagues).set({ scoringStartRoundId: roundId }).where(eq(leagues.id, leagueId));
  revalidatePath(`/ligas/${league.code}`);
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

/** Cualquier miembro puede salir de una liga, salvo el dueño (debería eliminarla en su lugar). */
export async function leaveLeague(leagueId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId === user.id) return { ok: false as const, error: "owner" as const };
  await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, user.id)));
  revalidatePath(`/ligas/${league.code}`);
  revalidatePath("/ligas");
  return { ok: true as const };
}
