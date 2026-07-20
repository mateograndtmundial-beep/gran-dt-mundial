import { and, desc, eq, inArray, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
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
import { SCORING, FIRST_KNOCKOUT_MATCHES, FIRST_KNOCKOUT_QUALIFIERS } from "@/lib/game/config";

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
  //
  // `eliminatedRound` es una señal para la fecha SIGUIENTE: marca al jugador como
  // tachado/filtrado en el armador porque su selección ya no va a sumar. De ahí que
  // las DOS últimas fechas no eliminen a nadie:
  //
  //  - SEMIS: los perdedores juegan el partido por el 3er puesto, que va en la última
  //    fecha (junto con la Final; ver ROUNDS en lib/game/config.ts). Marcarlos ahí los
  //    tachaba para una fecha en la que sí juegan y suman.
  //  - ÚLTIMA FECHA: no hay fecha siguiente que avisar. Las 4 selecciones que llegaron
  //    a semis jugaron hasta el final, así que ninguna se muestra como eliminada —
  //    tacharlas después de haber jugado (y puntuado) la Final o el 3er puesto es
  //    directamente engañoso.
  if (round.type === "knockout") {
    const lastKoOrder = (
      await db
        .select({ order: rounds.order })
        .from(rounds)
        .where(eq(rounds.type, "knockout"))
        .orderBy(desc(rounds.order))
        .limit(1)
    )[0]?.order;
    const isLastTwo = lastKoOrder != null && round.order >= lastKoOrder - 1;

    if (!isLastTwo) {
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
  }

  // Eliminados de FASE DE GRUPOS: las selecciones que no clasificaron a la primera
  // ronda de eliminatorias (16vos) nunca juegan un mata-mata, así que el bloque de
  // arriba nunca las toca. Al cerrar la fase de grupos las marcamos derivándolas del
  // FIXTURE de 16vos: los países que aparecen ahí son, por definición, los que
  // clasificaron; el resto quedó afuera. Se dispara al publicar la última fecha de
  // grupos (y, como red de seguridad, en las eliminatorias) y es idempotente:
  // solo toca países que siguen "vivos" (eliminatedRound null) y que NO están en el
  // cuadro. Guarda: si el fixture de 16vos todavía no se seedeó (cruces sin equipos),
  // no elimina a nadie — se re-evalúa en la próxima publicación.
  const firstKo = (
    await db
      .select({ id: rounds.id, order: rounds.order })
      .from(rounds)
      .where(eq(rounds.type, "knockout"))
      .orderBy(rounds.order)
      .limit(1)
  )[0];
  if (firstKo && round.order >= firstKo.order - 1) {
    const koMatches = await db
      .select({ home: matches.homeCountryId, away: matches.awayCountryId })
      .from(matches)
      .where(eq(matches.roundId, firstKo.id));
    const qualified = new Set<number>();
    for (const m of koMatches) {
      if (m.home != null) qualified.add(m.home);
      if (m.away != null) qualified.add(m.away);
    }
    // Solo marcamos con el cuadro COMPLETO: los 16 cruces cargados (FIRST_KNOCKOUT_MATCHES)
    // y los 32 clasificados sin nulls (FIRST_KNOCKOUT_QUALIFIERS). Si la API todavía no
    // cargó todos los cruces (p.ej. faltan 2), NO eliminamos a nadie — si no, los equipos
    // de los cruces faltantes quedarían marcados como eliminados por error. Se re-evalúa
    // en la próxima publicación.
    const bracketComplete =
      koMatches.length === FIRST_KNOCKOUT_MATCHES && qualified.size === FIRST_KNOCKOUT_QUALIFIERS;
    if (bracketComplete) {
      await db
        .update(countries)
        .set({ eliminatedRound: firstKo.order - 1 })
        .where(and(notInArray(countries.id, [...qualified]), isNull(countries.eliminatedRound)));
    }
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
