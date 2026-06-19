import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { revalidateTag, revalidatePath } from "next/cache";
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

  // Guarda: no publicar una fecha con partidos sin terminar/sincronizar.
  // publishRound corre una sola vez por fecha y es la fuente del ranking
  // oficial — si un partido quedó "scheduled"/"live" (p.ej. el sync falló a
  // mitad de camino), publicar ahora dejaría puntajes incompletos e
  // irreversibles. El admin debe re-sincronizar antes de publicar.
  const unfinished = ms.filter((m) => m.status !== "finished");
  if (unfinished.length) {
    throw new Error(
      `No se puede publicar: ${unfinished.length} partido(s) de la fecha ${roundId} ` +
        `no está(n) "finished" (estado actual: ${[...new Set(unfinished.map((m) => m.status))].join(", ")}). ` +
        `Sincronizá la fecha antes de publicar.`,
    );
  }

  // Guarda: una fecha sin partidos no se publica (publicaría un ranking vacío y,
  // con el carry-over, materializaría alineaciones para una fecha que no se jugó).
  if (!ms.length) {
    throw new Error(`No se puede publicar: la fecha ${roundId} no tiene partidos cargados.`);
  }

  // Guarda: publicar EN ORDEN. El carry-over copia de la fecha anterior, y los
  // rankings/eliminados asumen la secuencia — publicar la 2 con la 1 pendiente
  // dejaría todo inconsistente.
  const prevUnpublished = await db
    .select({ name: rounds.name })
    .from(rounds)
    .where(and(lt(rounds.order, round.order), ne(rounds.status, "published")));
  if (prevUnpublished.length) {
    throw new Error(
      `No se puede publicar: primero hay que publicar ${prevUnpublished.map((r) => `"${r.name}"`).join(", ")}.`,
    );
  }

  // Guarda: la fecha tiene que haber CERRADO en la realidad — todos los partidos
  // con kickoff pasado y el último ya terminado por reloj (kickoff + duración
  // máxima razonable). Es independiente del estado "finished": protege contra un
  // sync/edición manual que marque terminado un partido que todavía no se jugó.
  const MATCH_MAX_MS = 150 * 60 * 1000; // 90' + entretiempo/agregado (con margen para 120')
  const kickoffs = ms.map((m) => (m.kickoff ? new Date(m.kickoff).getTime() : null));
  if (kickoffs.some((k) => k == null)) {
    throw new Error(`No se puede publicar: hay partidos de la fecha ${roundId} sin horario (kickoff) definido.`);
  }
  const lastEnd = Math.max(...(kickoffs as number[])) + MATCH_MAX_MS;
  if (Date.now() < lastEnd) {
    throw new Error(
      `No se puede publicar: la fecha todavía no cerró (el último partido arranca/terminó ` +
        `recién el ${new Date(lastEnd).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} hora Argentina).`,
    );
  }

  // Guarda: TODOS los partidos deben tener stats de jugadores cargadas. Un partido
  // "finished" con 0 filas en player_match_stats (sync a medias, carga manual solo
  // del marcador) publicaría la fecha con jugadores en 0 de forma irreversible.
  const statRows = await db
    .select({ matchId: playerMatchStats.matchId, n: sql<number>`count(*)::int` })
    .from(playerMatchStats)
    .where(inArray(playerMatchStats.matchId, matchIds))
    .groupBy(playerMatchStats.matchId);
  const withStats = new Set(statRows.map((r) => r.matchId));
  const withoutStats = ms.filter((m) => !withStats.has(m.id));
  if (withoutStats.length) {
    throw new Error(
      `No se puede publicar: ${withoutStats.length} partido(s) sin datos de jugadores cargados. ` +
        `Sincronizá la fecha (o cargá las stats a mano) antes de publicar.`,
    );
  }

  // Carry-over: quien no guardó alineación para esta fecha sigue sumando con la
  // última que tenga de una fecha anterior ("si no hacés cambios, tu equipo se
  // mantiene"). Se materializa una copia (pins_spent=0, changes_made=0) antes de
  // computar, en dos INSERT...SELECT set-based e idempotentes (NOT EXISTS): si el
  // publish se reintenta, no duplica nada. Como las fechas se publican en orden,
  // los saltos múltiples se resuelven en cadena (la fecha N copia de la N-1).
  await db.execute(sql`
    insert into entry_rounds (entry_id, round_id, formation, captain_player_id, coach_id, budget_used, pins_spent, changes_made)
    select distinct on (er.entry_id)
      er.entry_id, ${roundId}, er.formation, er.captain_player_id, er.coach_id, er.budget_used, 0, 0
    from entry_rounds er
    join rounds r on r.id = er.round_id
    where r.sort_order < ${round.order}
      and not exists (
        select 1 from entry_rounds cur
        where cur.entry_id = er.entry_id and cur.round_id = ${roundId}
      )
    order by er.entry_id, r.sort_order desc
  `);
  await db.execute(sql`
    insert into entry_round_players (entry_round_id, player_id, is_starter, slot)
    select cur.id, erp.player_id, erp.is_starter, erp.slot
    from entry_rounds cur
    join lateral (
      select er.id
      from entry_rounds er
      join rounds r on r.id = er.round_id
      where er.entry_id = cur.entry_id and r.sort_order < ${round.order}
      order by r.sort_order desc
      limit 1
    ) src on true
    join entry_round_players erp on erp.entry_round_id = src.id
    where cur.round_id = ${roundId}
      and not exists (select 1 from entry_round_players x where x.entry_round_id = cur.id)
  `);

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
      // Redondeo defensivo: el rating ya se guarda entero desde la ingestión.
      base.set(s.playerId, (base.get(s.playerId) ?? 0) + Math.round(s.rating));
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

  // Los totales cambiaron → invalidamos el caché del rank global
  // (getUserGlobalRank) para que /mi-equipo refleje las nuevas posiciones.
  revalidateTag("global-rank", "max");
  // Y las stats acumuladas por jugador (getPlayerTournamentStats), que ahora
  // incluyen esta fecha recién publicada.
  revalidateTag("player-stats", "max");
  // El ownership pasa a contar la fecha siguiente (nueva editable) → invalidar.
  revalidateTag("player-ownership", "max");
  // La tabla global cacheada (getGlobalLeaderboard) usa los totales recién recalculados.
  revalidateTag("leaderboard", "max");
  // El plantel cacheado (getPlayersWithCountry) trae countries.eliminatedRound,
  // que se acaba de marcar en playoffs.
  revalidateTag("players", "max");
  // /jugadores es ISR (revalidate=60): revalidar el tag invalida la función
  // cacheada pero no el HTML prerenderizado, que tiene su propio reloj. Forzamos
  // el re-render para que las stats nuevas aparezcan al instante, no hasta 60s
  // después. (/equipo es force-dynamic → ya es fresco.)
  revalidatePath("/jugadores");

  return { entries: affectedEntryIds.size, players: pts.size };
}
