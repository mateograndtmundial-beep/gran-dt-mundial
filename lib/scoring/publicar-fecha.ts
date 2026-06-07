import { eq, inArray } from "drizzle-orm";
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

  for (const [playerId, points] of pts) {
    await db
      .insert(playerRoundPoints)
      .values({ playerId, roundId, points })
      .onConflictDoUpdate({
        target: [playerRoundPoints.playerId, playerRoundPoints.roundId],
        set: { points },
      });
  }

  // Resultado de cada selección en la fecha (para el técnico).
  const countryResult = new Map<number, "win" | "loss" | "draw">();
  for (const m of ms) {
    if (m.homeScore == null || m.awayScore == null || m.homeCountryId == null || m.awayCountryId == null) continue;
    if (m.homeScore === m.awayScore) {
      countryResult.set(m.homeCountryId, "draw");
      countryResult.set(m.awayCountryId, "draw");
    } else if (m.homeScore > m.awayScore) {
      countryResult.set(m.homeCountryId, "win");
      countryResult.set(m.awayCountryId, "loss");
    } else {
      countryResult.set(m.homeCountryId, "loss");
      countryResult.set(m.awayCountryId, "win");
    }
  }

  const allCoaches = await db.select({ id: coaches.id, countryId: coaches.countryId }).from(coaches);
  const coachCountry = new Map(allCoaches.map((c) => [c.id, c.countryId]));

  const ers = await db.select().from(entryRounds).where(eq(entryRounds.roundId, roundId));
  const affectedEntryIds = new Set<number>();

  // Contexto de scoring compartido (puro, testeable en puntos-equipo.ts).
  const ctx: ScoringContext = { pts, base, played, coachCountry, countryResult };

  for (const er of ers) {
    const lineup = await db
      .select()
      .from(entryRoundPlayers)
      .where(eq(entryRoundPlayers.entryRoundId, er.id));

    const total = computeEntryTotal(
      { captainPlayerId: er.captainPlayerId, coachId: er.coachId, lineup },
      ctx,
    );
    await db.update(entryRounds).set({ points: total }).where(eq(entryRounds.id, er.id));
    affectedEntryIds.add(er.entryId);
  }

  // Recalcular el total de cada equipo afectado.
  for (const entryId of affectedEntryIds) {
    const rows = await db
      .select({ points: entryRounds.points })
      .from(entryRounds)
      .where(eq(entryRounds.entryId, entryId));
    const total = sumRoundPoints(rows.map((r) => r.points));
    await db.update(entries).set({ totalPoints: total }).where(eq(entries.id, entryId));
  }

  // Marcar eliminados (perdedores en eliminatorias).
  if (round.type === "knockout") {
    for (const m of ms) {
      if (m.homeScore == null || m.awayScore == null || m.homeCountryId == null || m.awayCountryId == null) continue;
      if (m.homeScore === m.awayScore) continue; // definición por penales no modelada acá
      const loserId = m.homeScore > m.awayScore ? m.awayCountryId : m.homeCountryId;
      await db.update(countries).set({ eliminatedRound: round.order }).where(eq(countries.id, loserId));
    }
  }

  await db.update(rounds).set({ status: "published" }).where(eq(rounds.id, roundId));
  return { entries: affectedEntryIds.size, players: pts.size };
}
