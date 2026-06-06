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
import { calcularPuntosTecnico } from "@/lib/scoring/calcular-puntos";

/**
 * Publica una fecha: agrega los puntos por jugador, calcula el puntaje de cada
 * equipo (titulares + capitán + técnico), actualiza totales y rankings, marca
 * eliminados (en eliminatorias) y pasa la fecha a "published".
 * Se corre UNA sola vez por fecha, desde el admin.
 */
export async function publishRound(roundId: number) {
  const ms = await db.select().from(matches).where(eq(matches.roundId, roundId));
  const matchIds = ms.map((m) => m.id);

  const stats = matchIds.length
    ? await db.select().from(playerMatchStats).where(inArray(playerMatchStats.matchId, matchIds))
    : [];

  const pts = new Map<number, number>(); // playerId -> puntos de la fecha
  const base = new Map<number, number>(); // playerId -> suma de rating (>=20') para el capitán
  for (const s of stats) {
    pts.set(s.playerId, (pts.get(s.playerId) ?? 0) + s.fantasyPoints);
    if (s.minutes >= 20 && s.rating != null) {
      base.set(s.playerId, (base.get(s.playerId) ?? 0) + s.rating);
    }
  }

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

  for (const er of ers) {
    const lineup = await db
      .select()
      .from(entryRoundPlayers)
      .where(eq(entryRoundPlayers.entryRoundId, er.id));

    let total = 0;
    for (const lp of lineup) {
      if (lp.isStarter) total += pts.get(lp.playerId) ?? 0;
    }
    // Capitán: duplica el rating base (suma una vez más la calificación).
    if (er.captainPlayerId) total += base.get(er.captainPlayerId) ?? 0;
    // Técnico: +2 / -2 / 0 según el resultado de su selección.
    if (er.coachId) {
      const cc = coachCountry.get(er.coachId);
      const res = cc != null ? countryResult.get(cc) : undefined;
      if (res) total += calcularPuntosTecnico(res);
    }

    total = Math.round(total * 10) / 10;
    await db.update(entryRounds).set({ points: total }).where(eq(entryRounds.id, er.id));
    affectedEntryIds.add(er.entryId);
  }

  // Recalcular el total de cada equipo afectado.
  for (const entryId of affectedEntryIds) {
    const rows = await db
      .select({ points: entryRounds.points })
      .from(entryRounds)
      .where(eq(entryRounds.entryId, entryId));
    const total = rows.reduce((s, r) => s + r.points, 0);
    await db.update(entries).set({ totalPoints: Math.round(total * 10) / 10 }).where(eq(entries.id, entryId));
  }

  // Marcar eliminados (perdedores en eliminatorias).
  const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
  if (round && round.type === "knockout") {
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
