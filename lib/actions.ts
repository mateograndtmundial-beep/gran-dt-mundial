"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, entryRounds, entryRoundPlayers, leagues, leagueMembers, rounds, players, coaches, lineupChangeLog } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEditableRound, isEnrolledInGoldenTicket } from "@/lib/queries";
import { getPinBalance, pinMovementOps, isInsufficientPinsError } from "@/lib/pins";
import { BUDGET, MAX_PER_COUNTRY, MAX_PER_COUNTRY_KNOCKOUT, getFreeChangesForRound, type Position } from "@/lib/game/config";
import { validateLineupShape } from "@/lib/game/lineup";
import { saveLineupSchema, type SaveLineupInput } from "@/lib/validation/lineup";
import { round1 } from "@/lib/pricing/map";
import { countPlayerChanges, computeRosterDiff, roundTally } from "@/lib/game/changes";

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
  // Tope por nacionalidad: 3 en fase de grupos, 5 desde los 16vos (playoffs). No
  // se libera del todo: 5 por país alcanza para equipos funcionales hasta la final
  // (4 selecciones vivas → 20 posibles sobre 15). Regla general, todos los usuarios.
  const countryCap = round.type === "group" ? MAX_PER_COUNTRY : MAX_PER_COUNTRY_KNOCKOUT;
  const perCountry = new Map<number, number>();
  for (const p of pr) perCountry.set(p.countryId, (perCountry.get(p.countryId) ?? 0) + 1);
  if ([...perCountry.values()].some((n) => n > countryCap)) {
    return { ok: false as const, error: "country" as const, max: countryCap };
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

  // ¿Hay fecha previa? Solo entonces los cambios cuentan (en la fecha 1 / primer
  // equipo el armado es libre). El baseline es el ÚLTIMO equipo CONFIRMADO: la
  // alineación ya guardada de ESTA fecha (er0) si existe, si no la de la fecha
  // anterior. Así, una vez confirmado un cambio queda fijado y los cambios nuevos
  // (incluso revertir uno confirmado) se cuentan aparte y consumen cupo/pines.
  const prevEr = (
    await db
      .select({ id: entryRounds.id })
      .from(entryRounds)
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(and(eq(entryRounds.entryId, entry.id), lt(rounds.order, round.order)))
      .orderBy(desc(rounds.order))
      .limit(1)
  )[0];

  let newChanges = 0;
  let baselineIds: number[] = []; // roster del baseline (para el diff del log de auditoría)
  const priorChanges = prevEr ? (er0?.changesMade ?? 0) : 0;
  if (prevEr) {
    const baseErId = er0?.id ?? prevEr.id;
    const base = await db
      .select({ playerId: entryRoundPlayers.playerId })
      .from(entryRoundPlayers)
      .where(eq(entryRoundPlayers.entryRoundId, baseErId));
    baselineIds = base.map((p) => p.playerId);
    newChanges = countPlayerChanges(
      input.players.map((p) => p.playerId),
      baselineIds,
    );
  }

  // Cupo gratis por fecha + pines por los extra, sobre el ACUMULADO de la fecha
  // (`priorChanges + newChanges`). El total es monótono creciente → `delta` nunca
  // es negativo y nunca se reembolsan pines. Fórmula en lib/game/changes.ts.
  const inCopa = await isEnrolledInGoldenTicket(user.id);
  const tally = roundTally({
    priorChanges,
    newChanges,
    freeChanges: getFreeChangesForRound(round.order, inCopa),
    isPremium: user.isPremium,
    alreadySpent: er0?.pinsSpent ?? 0,
  });
  const totalChanges = tally.totalChanges;
  const pinsNeeded = tally.pinsTotal;
  const delta = tally.pinsDue; // = max(0, pinsNeeded - alreadySpent); monótono ⇒ sin refunds

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
    changesMade: totalChanges,
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
  const runBatch = async (ops: [BatchOp, ...BatchOp[]]) => {
    try {
      await db.batch(ops);
      return { pins: false as const };
    } catch (e) {
      if (isInsufficientPinsError(e)) return { pins: true as const };
      throw e;
    }
  };

  // Aseguramos la fila del entryRound ANTES del batch porque neon-http necesita el
  // id generado para poder insertar los jugadores. CLAVE: cuando se crea, va con los
  // defaults de la tabla (pinsSpent=0, changesMade=0). Los valores REALES de pines y
  // cambios —que tienen que quedar atados al débito del ledger— se escriben SOLO
  // dentro del batch atómico de abajo. Si el débito falla, el rollback deja a lo sumo
  // un entryRound vacío y SIN cobro fantasma; nunca un "gasté 1 pin" con pinsSpent>0
  // pero sin débito en el ledger (el bug que dejaba huérfanos cuando el insert del
  // entryRound —con pinsSpent ya seteado— vivía fuera del batch).
  const erId =
    er0?.id ??
    (
      await db
        .insert(entryRounds)
        .values({
          entryId: entry.id,
          roundId: round.id,
          formation: input.formation,
          captainPlayerId: input.captainPlayerId,
          coachId: input.coachId,
          budgetUsed,
        })
        .returning({ id: entryRounds.id })
    )[0]?.id;
  if (erId == null) throw new Error("No se pudo crear la alineación");

  // Batch atómico (1 transacción del servidor): fija pinsSpent/changesMade, reemplaza
  // el roster completo y debita los pines, todo junto o nada. Si el saldo no alcanza,
  // el débito (guard 1/0) aborta el batch y se revierte también el seteo de pinsSpent
  // y el reemplazo del roster — sin estados intermedios persistidos.
  const ops: [BatchOp, ...BatchOp[]] = [
    db.update(entryRounds).set(erValues).where(eq(entryRounds.id, erId)),
    db.delete(entryRoundPlayers).where(eq(entryRoundPlayers.entryRoundId, erId)),
  ];
  if (playerRows.length) {
    ops.push(
      db.insert(entryRoundPlayers).values(playerRows.map((p) => ({ ...p, entryRoundId: erId }))),
    );
  }
  // Log de auditoría (append-only): una fila por save, DENTRO del batch atómico —
  // si el débito de pines aborta el batch, este insert también se revierte, así
  // el log nunca registra un guardado que no se concretó. El diff es vs el baseline
  // de este save (equipo confirmado de la fecha, o fecha anterior si es el 1er save).
  const rosterDiff = computeRosterDiff(
    input.players.map((p) => p.playerId),
    baselineIds,
  );
  ops.push(
    db.insert(lineupChangeLog).values({
      entryId: entry.id,
      roundId: round.id,
      entryRoundId: erId,
      playersIn: rosterDiff.in,
      playersOut: rosterDiff.out,
      formation: input.formation,
      captainPlayerId: input.captainPlayerId,
      coachId: input.coachId,
      pinsDelta: delta,
      changesInSave: newChanges,
    }),
  );
  ops.push(...pinOps);
  const r = await runBatch(ops);
  if (r.pins) {
    return { ok: false as const, error: "pins" as const, needed: delta, balance: await getPinBalance(user.id) };
  }

  revalidatePath("/mi-equipo");
  // El roster cambió → el ownership (% de equipos por jugador) puede haberse movido.
  revalidateTag("player-ownership", "max");
  return { ok: true as const, changes: newChanges, totalChanges, pinsSpent: pinsNeeded };
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
  // Las copas premium (GOLDEN TICKET) NO se unen con el código: la inscripción es paga y
  // la hace el webhook al confirmarse el pago (ver createEntryOrder / creditOrder). Sin
  // este guard, cualquiera con el código entraría gratis salteando la entrada.
  if (league.kind === "golden_ticket") return { ok: false as const, error: "premium" as const };
  await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id }).onConflictDoNothing();
  revalidatePath("/ligas");
  return { ok: true as const, code: league.code };
}

// El nombre de la liga queda fijo desde su creación: no se puede renombrar
// (decisión de producto — ni el dueño ni un admin). Por eso no hay action de
// renombrar; el nombre sólo se setea en createLeague.

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

/**
 * El dueño elimina la liga. Solo permitido si es el único miembro: si hay más
 * gente, primero debe transferir la propiedad (transferOwnershipAndLeave).
 * Borra miembros y liga en un solo batch (atómico).
 */
export async function deleteLeague(leagueId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId !== user.id) return { ok: false as const, error: "forbidden" as const };
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));
  if (Number(count) > 1) return { ok: false as const, error: "not-empty" as const };
  await db.batch([
    db.delete(leagueMembers).where(eq(leagueMembers.leagueId, leagueId)),
    db.delete(leagues).where(eq(leagues.id, leagueId)),
  ]);
  revalidatePath("/ligas");
  return { ok: true as const };
}

/**
 * El dueño transfiere la propiedad a otro miembro y sale de la liga. Es la única
 * forma de que el dueño abandone una liga con gente (no puede quedar sin admin).
 */
export async function transferOwnershipAndLeave(leagueId: number, newOwnerId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId !== user.id) return { ok: false as const, error: "forbidden" as const };
  if (newOwnerId === user.id) return { ok: false as const, error: "invalid" as const };
  // El nuevo dueño tiene que ser un miembro actual de la liga.
  const member = (
    await db
      .select({ userId: leagueMembers.userId })
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, newOwnerId)))
      .limit(1)
  )[0];
  if (!member) return { ok: false as const, error: "not-member" as const };
  await db.batch([
    db.update(leagues).set({ ownerId: newOwnerId }).where(eq(leagues.id, leagueId)),
    db.delete(leagueMembers).where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, user.id))),
  ]);
  revalidatePath(`/ligas/${league.code}`);
  revalidatePath("/ligas");
  return { ok: true as const };
}

/** Cualquier miembro puede salir de una liga, salvo el dueño (debería eliminarla o transferirla en su lugar). */
export async function leaveLeague(leagueId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return { ok: false as const, error: "not-found" as const };
  if (league.ownerId === user.id) return { ok: false as const, error: "owner" as const };
  // Las copas premium (GOLDEN TICKET) son pagas: una vez adentro no se sale por cuenta
  // propia (no habría reembolso automático). Solo un admin saca gente (removeMember).
  if (league.kind === "golden_ticket") return { ok: false as const, error: "premium" as const };
  await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, user.id)));
  revalidatePath(`/ligas/${league.code}`);
  revalidatePath("/ligas");
  return { ok: true as const };
}

/** Nombre de DT (username) del usuario logueado, para mostrarlo en el header. null si no tiene. */
export async function getMyUsername(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.username ?? null;
}
