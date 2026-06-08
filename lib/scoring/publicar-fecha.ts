import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  matches,
  coaches,
  playerMatchStats,
  playerRoundPoints,
  entries,
  entryRounds,
  entryRoundPlayers,
  rounds,
  countries,
} from "@/lib/db/schema";
import { computeEntryTotal, sumRoundPoints, type ScoringContext } from "@/lib/scoring/puntos-equipo";
import { resolveMatchOutcome } from "@/lib/scoring/resultado-partido";
import { chunkedBatch as runChunked, type BatchOp } from "@/lib/db/batch";
import { SCORING } from "@/lib/game/config";

/**
 * Publica una fecha: agrega los puntos por jugador, calcula el puntaje de cada
 * equipo (titulares + capitán + técnico), actualiza totales y rankings, marca
 * eliminados (en eliminatorias) y pasa la fecha a "published".
 * Se corre UNA sola vez por fecha, desde el admin.
 */
export async function publishRound(roundId: number) {
  // Guardas: la fecha debe existir y no estar ya publicada (idempotencia — evita
  // reprocesar si el admin reintenta). Se chequea ANTES de tocar nada.
  const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
  if (!round) throw new Error(`Fecha ${roundId} no existe`);
  if (round.status === "published") {
    return { entries: 0, players: 0, alreadyPublished: true as const };
  }

  const ms = await db.select().from(matches).where(eq(matches.roundId, roundId));
  const matchIds = ms.map((m) => m.id);

  const stats = matchIds.length
    ? await db.select().from(playerMatchStats).where(inArray(playerMatchStats.matchId, matchIds))
    : [];

  const pts = new Map<number, number>(); // playerId -> puntos de la fecha
  const base = new Map<number, number>(); // playerId -> suma de rating (>=20') para el capitán
  const minutesByPlayer = new Map<number, number>(); // playerId -> minutos jugados en la fecha
  for (const s of stats) {
    pts.set(s.playerId, (pts.get(s.playerId) ?? 0) + s.fantasyPoints);
    minutesByPlayer.set(s.playerId, (minutesByPlayer.get(s.playerId) ?? 0) + s.minutes);
    if (s.minutes >= SCORING.minMinutes && s.rating != null) {
      base.set(s.playerId, (base.get(s.playerId) ?? 0) + s.rating);
    }
  }
  const played = (pid: number) => (minutesByPlayer.get(pid) ?? 0) >= SCORING.minMinutes;

  // Upsert de puntos por jugador en lotes (en vez de N queries secuenciales).
  await runChunked(
    [...pts].map(([playerId, points]) =>
      db
        .insert(playerRoundPoints)
        .values({ playerId, roundId, points })
        .onConflictDoUpdate({
          target: [playerRoundPoints.playerId, playerRoundPoints.roundId],
          set: { points },
        }),
    ),
  );

  // Resultado de cada selección en la fecha (para el técnico).
  const countryResult = new Map<number, "win" | "loss" | "draw">();
  for (const m of ms) {
    const outcome = resolveMatchOutcome(m);
    if (outcome.decided) {
      // Incluye la definición por penales: el ganador de la tanda suma "win".
      countryResult.set(outcome.winnerId, "win");
      countryResult.set(outcome.loserId, "loss");
    } else if (
      m.homeScore != null &&
      m.awayScore != null &&
      m.homeCountryId != null &&
      m.awayCountryId != null &&
      m.homeScore === m.awayScore
    ) {
      // Empate real (grupos, sin tanda): ambos suman empate para el técnico.
      countryResult.set(m.homeCountryId, "draw");
      countryResult.set(m.awayCountryId, "draw");
    }
  }

  const ers = await db.select().from(entryRounds).where(eq(entryRounds.roundId, roundId));
  const affectedEntryIds = new Set<number>();

  // Solo los técnicos usados en esta fecha (no todos).
  const coachIds = [...new Set(ers.map((er) => er.coachId).filter((id): id is number => id != null))];
  const usedCoaches = coachIds.length
    ? await db.select({ id: coaches.id, countryId: coaches.countryId }).from(coaches).where(inArray(coaches.id, coachIds))
    : [];
  const coachCountry = new Map(usedCoaches.map((c) => [c.id, c.countryId]));

  // Batch-load de TODAS las alineaciones de la fecha (en vez de una query por entry).
  const erIds = ers.map((er) => er.id);
  const allLineup = erIds.length
    ? await db.select().from(entryRoundPlayers).where(inArray(entryRoundPlayers.entryRoundId, erIds))
    : [];
  const lineupByEr = new Map<number, typeof allLineup>();
  for (const l of allLineup) {
    const arr = lineupByEr.get(l.entryRoundId) ?? [];
    arr.push(l);
    lineupByEr.set(l.entryRoundId, arr);
  }

  // Contexto de scoring compartido (puro, testeable en puntos-equipo.ts).
  const ctx: ScoringContext = { pts, base, played, coachCountry, countryResult };

  const erUpdates: BatchOp[] = [];
  for (const er of ers) {
    const total = computeEntryTotal(
      { captainPlayerId: er.captainPlayerId, coachId: er.coachId, lineup: lineupByEr.get(er.id) ?? [] },
      ctx,
    );
    erUpdates.push(db.update(entryRounds).set({ points: total }).where(eq(entryRounds.id, er.id)));
    affectedEntryIds.add(er.entryId);
  }
  await runChunked(erUpdates);

  // Recalcular el total de cada equipo afectado: una sola query agrupada + updates en lote.
  const affected = [...affectedEntryIds];
  if (affected.length) {
    const totals = await db
      .select({ entryId: entryRounds.entryId, total: sql<number>`sum(${entryRounds.points})` })
      .from(entryRounds)
      .where(inArray(entryRounds.entryId, affected))
      .groupBy(entryRounds.entryId);
    await runChunked(
      totals.map((t) =>
        db
          .update(entries)
          .set({ totalPoints: sumRoundPoints([Number(t.total)]) })
          .where(eq(entries.id, t.entryId)),
      ),
    );
  }

  // Marcar eliminados (perdedores en eliminatorias).
  if (round.type === "knockout") {
    const eliminations: BatchOp[] = [];
    for (const m of ms) {
      // Marca eliminado al perdedor, incluida la definición por penales.
      const outcome = resolveMatchOutcome(m);
      if (outcome.decided) {
        eliminations.push(
          db.update(countries).set({ eliminatedRound: round.order }).where(eq(countries.id, outcome.loserId)),
        );
      }
    }
    await runChunked(eliminations);
  }

  await db.update(rounds).set({ status: "published" }).where(eq(rounds.id, roundId));
  return { entries: affectedEntryIds.size, players: pts.size };
}
