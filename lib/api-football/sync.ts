import { and, asc, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { matches, players, playerMatchStats, rounds } from "@/lib/db/schema";
import { apiFootball } from "@/lib/api-football/client";
import { parseMatchTiming, concededWhileOnPitch } from "@/lib/api-football/timing";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import { chunkedBatch, type BatchOp } from "@/lib/db/batch";
import { matchesWithCompleteStats, statsLookComplete } from "@/lib/scoring/stats-quality";
import { SCORING } from "@/lib/game/config";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Partidos sincronizados en paralelo. Acotado para no saturar el rate limit de
// API-Football (el client igual reintenta con backoff ante 429).
const SYNC_CONCURRENCY = 3;

/** Corre `fn` sobre los items con un máximo de `limit` en paralelo. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type MatchRow = typeof matches.$inferSelect;
type PlayerByApi = Map<number, { id: number; apiId: number | null; position: "GK" | "DEF" | "MID" | "FWD"; countryId: number }>;

/** Construye el índice apiFootballId → jugador nuestro (se reusa entre partidos). */
async function buildPlayerIndex(): Promise<PlayerByApi> {
  const allPlayers = await db
    .select({
      id: players.id,
      apiId: players.apiFootballId,
      position: players.position,
      countryId: players.countryId,
    })
    .from(players);
  return new Map(allPlayers.filter((p) => p.apiId != null).map((p) => [p.apiId as number, p]));
}

/**
 * Sincroniza UN partido desde API-Football: baja stats, calcula los puntos por
 * jugador (sin capitán), guarda player_match_stats y actualiza marcador, estado
 * y figura (MOTM). Devuelve true si tenía fixture y se procesó.
 */
async function syncOneMatch(m: MatchRow, byApi: PlayerByApi): Promise<boolean> {
    if (!m.apiFootballFixtureId) return false;

    // Las tres llamadas del partido van en paralelo. Los eventos traen los autogoles
    // (no están en /fixtures/players).
    const [fx, data, events] = (await Promise.all([
      apiFootball.fixtureById(m.apiFootballFixtureId),
      apiFootball.fixturePlayers(m.apiFootballFixtureId),
      apiFootball.fixtureEvents(m.apiFootballFixtureId),
    ])) as [any[], any[], any[]];
    const f = fx?.[0];
    const homeScore: number | null = f?.goals?.home ?? null;
    const awayScore: number | null = f?.goals?.away ?? null;
    // Penales de la tanda (eliminatorias definidas por penales). Null si no hubo.
    const homePenalties: number | null = f?.score?.penalty?.home ?? null;
    const awayPenalties: number | null = f?.score?.penalty?.away ?? null;
    const statusShort: string | undefined = f?.fixture?.status?.short;
    const finished = ["FT", "AET", "PEN"].includes(statusShort ?? "");
    const homeTeamApi = f?.teams?.home?.id;

    // Autogoles por jugador (apiId). El `player` del evento es quien lo hizo en
    // contra. Se excluye la tanda de penales (ahí no hay autogoles, pero por las dudas).
    const ownGoalByApiId = new Map<number, number>();
    for (const e of events ?? []) {
      if (e?.type === "Goal" && e?.detail === "Own Goal" && e?.comments !== "Penalty Shootout") {
        const pid = e?.player?.id;
        if (pid != null) ownGoalByApiId.set(pid, (ownGoalByApiId.get(pid) ?? 0) + 1);
      }
    }

    type Raw = {
      our: NonNullable<ReturnType<typeof byApi.get>>;
      minutes: number;
      rating: number | null;
      // Rating decimal crudo de API-Football: solo para elegir la figura (menos
      // empates que con el entero). El puntaje usa `rating` ya redondeado.
      ratingRaw: number | null;
      goals: number;
      penaltyGoals: number;
      assists: number;
      yellow: number;
      red: number;
      saves: number;
      penaltiesMissed: number;
      ownGoals: number;
      isHome: boolean;
      substitute: boolean;
    };
    const raws: Raw[] = [];

    for (const teamBlock of data ?? []) {
      const isHome = teamBlock?.team?.id === homeTeamApi;
      for (const pl of teamBlock?.players ?? []) {
        const st = pl?.statistics?.[0];
        const our = byApi.get(pl?.player?.id);
        if (!our || !st) continue;
        const ratingRaw = st.games?.rating ? parseFloat(st.games.rating) : null;
        raws.push({
          our,
          minutes: st.games?.minutes ?? 0,
          // El rating se procesa como ENTERO en todo el juego (se redondea al entrar).
          rating: ratingRaw != null ? Math.round(ratingRaw) : null,
          ratingRaw,
          goals: st.goals?.total ?? 0,
          penaltyGoals: st.penalty?.scored ?? 0,
          assists: st.goals?.assists ?? 0,
          yellow: st.cards?.yellow ?? 0,
          red: st.cards?.red ?? 0,
          saves: st.penalty?.saved ?? 0,
          // penalty.missed ya excluye los penales de tanda (se confirmó contra la API).
          penaltiesMissed: st.penalty?.missed ?? 0,
          ownGoals: ownGoalByApiId.get(pl?.player?.id) ?? 0,
          isHome,
          substitute: st.games?.substitute ?? false,
        });
      }
    }

    // ¿Las stats lucen COMPLETAS? API-Football marca el fixture FT/AET/PEN ANTES de
    // terminar de cargar las estadísticas de jugadores: por unos minutos devuelve el
    // partido "terminado" con minutos/suplentes a medio cargar. Si en esa ventana lo
    // diéramos por `finished`, el scoring vería titulares en 0' (los trataría como "no
    // jugó") y ni ellos ni sus suplentes sumarían, y las stories/carrusel se postearían
    // (idempotentes) sobre datos parciales. Por eso evaluamos la completitud acá, en
    // memoria, y SOLO marcamos `finished` cuando los datos ya están completos; mientras
    // tanto queda `live` y el cron lo vuelve a sincronizar hasta que cierren bien.
    const fullMatchPlayers = raws.filter((r) => r.minutes >= 90).length;
    const teamsRepresented = new Set(raws.filter((r) => r.minutes >= 90).map((r) => r.our.countryId)).size;
    // Suplentes (flag de la API), SIN filtrar por minutos: un suplente que entró y
    // jugó <20' igual cuenta como "el banco ya cargó" (era la data que faltaba).
    const substitutes = raws.filter((r) => r.substitute).length;
    const statsComplete = statsLookComplete(fullMatchPlayers, teamsRepresented, substitutes);
    const finishedComplete = finished && statsComplete;

    // Figura: mayor rating con >= minMinutes, comparando el decimal crudo (el
    // entero redondeado empataría seguido). (Empates: se queda el primero; el
    // admin puede ajustar.)
    let motmPlayerId: number | null = null;
    let best = -1;
    for (const r of raws) {
      if (r.minutes >= SCORING.minMinutes && r.ratingRaw != null && r.ratingRaw > best) {
        best = r.ratingRaw;
        motmPlayerId = r.our.id;
      }
    }

    // Si el admin ya editó alguna fila de este partido, respetamos SU figura (no la
    // recalculamos): de lo contrario, tras un re-sync, la fila manual conservaría su
    // +4 (está protegida) y el algoritmo le daría otro +4 a otro → dos figuras.
    const manualRow = await db
      .select({ id: playerMatchStats.id })
      .from(playerMatchStats)
      .where(and(eq(playerMatchStats.matchId, m.id), eq(playerMatchStats.manualEdit, true)))
      .limit(1);
    const effectiveMotm = manualRow.length > 0 ? m.motmPlayerId : motmPlayerId;

    // Valla invicta y goles recibidos A NIVEL JUGADOR: reconstruimos los minutos
    // de cada gol recibido y la ventana en cancha de cada jugador, y contamos solo
    // los goles que entraron MIENTRAS estaba jugando. Así un suplente que entra con
    // el partido 0-3 y no recibe goles suma valla, y un titular que sale antes del
    // gol no la pierde (y el arquero solo descuenta por los goles que recibió él).
    const timing = parseMatchTiming(events ?? [], homeTeamApi);
    // Reconciliación: si los goles parseados de un equipo no coinciden con el
    // marcador final (eventos incompletos/ausentes, p.ej. carga manual), caemos
    // al cálculo a nivel equipo para ese equipo (no inventamos vallas de más).
    const concededFinal = { home: awayScore ?? 0, away: homeScore ?? 0 };
    const timingOk = {
      home: finished && timing.concededMinutes.home.length === concededFinal.home,
      away: finished && timing.concededMinutes.away.length === concededFinal.away,
    };

    const concededForPlayer = (r: Raw): number => {
      const side = r.isHome ? "home" : "away";
      if (!finished) return concededFinal[side]; // partido en vivo: total del equipo
      if (!timingOk[side]) return concededFinal[side]; // fallback seguro a nivel equipo
      const iv = (r.our.apiId != null ? timing.intervals.get(r.our.apiId) : undefined) ?? { enter: 0, exit: Infinity };
      return concededWhileOnPitch(iv, timing.concededMinutes[side]);
    };

    const ops: BatchOp[] = [];
    for (const r of raws) {
      const conceded = concededForPlayer(r); // goles recibidos con el jugador en cancha
      const cleanSheet = finished ? conceded === 0 : false;
      const isMotm = r.our.id === effectiveMotm;
      const bd = calcularPuntos({
        position: r.our.position,
        minutes: r.minutes,
        rating: r.rating,
        goals: r.goals,
        penaltyGoals: r.penaltyGoals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
        ownGoals: r.ownGoals,
        penaltiesSaved: r.saves,
        penaltiesMissed: r.penaltiesMissed,
        goalsConceded: conceded,
        cleanSheet,
        isMotm,
        isCaptain: false,
      });

      const values = {
        playerId: r.our.id,
        matchId: m.id,
        minutes: r.minutes,
        goals: r.goals,
        penaltyGoals: r.penaltyGoals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
        ownGoals: r.ownGoals,
        penaltiesSaved: r.saves,
        penaltiesMissed: r.penaltiesMissed,
        goalsConceded: r.our.position === "GK" ? conceded : 0,
        cleanSheet,
        rating: r.rating,
        isMotm,
        fantasyPoints: bd.total,
        substitute: r.substitute,
      };
      ops.push(
        db
          .insert(playerMatchStats)
          .values(values)
          .onConflictDoUpdate({
            target: [playerMatchStats.playerId, playerMatchStats.matchId],
            set: values,
            // No pisar filas editadas a mano por el admin (el cron respeta las correcciones).
            setWhere: ne(playerMatchStats.manualEdit, true),
          }),
      );
      // `substitute` (titular/suplente) es metadata de la API, NO una corrección de
      // puntaje: se refresca SIEMPRE, también en filas manualEdit, para poder separar
      // titulares/suplentes en el carrusel aunque el partido se haya cargado a mano.
      ops.push(
        db
          .update(playerMatchStats)
          .set({ substitute: r.substitute })
          .where(and(eq(playerMatchStats.playerId, r.our.id), eq(playerMatchStats.matchId, m.id))),
      );
    }

    ops.push(
      db
        .update(matches)
        .set({
          homeScore,
          awayScore,
          homePenalties,
          awayPenalties,
          // Solo `finished` con stats completas (ver arriba). FT-pero-incompleto queda
          // `live` para que el cron lo siga sincronizando y no se publique/postee a medias.
          status: finishedComplete ? "finished" : finished ? "live" : "scheduled",
          motmPlayerId: effectiveMotm,
        })
        .where(eq(matches.id, m.id)),
    );
    await chunkedBatch(ops);
    return true;
}

/**
 * Trae las estadísticas de todos los partidos de una fecha desde API-Football,
 * calcula los puntos por jugador (sin capitán) y los guarda en player_match_stats.
 * También actualiza el marcador, el estado y la figura (MOTM) de cada partido.
 */
export async function syncRound(roundId: number) {
  const ms = await db.select().from(matches).where(eq(matches.roundId, roundId));
  const byApi = await buildPlayerIndex();

  const results = await mapLimit(ms, SYNC_CONCURRENCY, (m) => syncOneMatch(m, byApi));

  // Los partidos sincronizados pueden cambiar el próximo rival/dificultad de
  // cada selección (estado, kickoff reprogramado): invalidamos el caché de
  // getCountryFixtures (TTL de 1h) para que /jugadores refleje el cambio ya.
  // Solo aplica dentro de un request de Next (cron/admin); desde un script CLI
  // no hay store de revalidación → ignorar el error para no tumbar el sync.
  try {
    revalidateTag("country-fixtures", "max");
  } catch {
    /* fuera de un request de Next (CLI): no hay caché que invalidar */
  }

  return { matches: results.filter(Boolean).length };
}

// Minutos estimados desde el kickoff hasta que el partido TERMINÓ + el delay con el
// que queremos postear (≈30' después del final). Grupos: 90' + entretiempo +
// descuento ≈ 120'. Eliminatorias: puede ir a alargue + penales ≈ 150'. Sumamos
// ~30' de colchón para postear "un rato después" del pitazo final.
const POST_MATCH_DELAY_MIN = 30;
const SETTLE_MIN = { group: 120 + POST_MATCH_DELAY_MIN, knockout: 150 + POST_MATCH_DELAY_MIN } as const;

/**
 * Sincronización INCREMENTAL y barata en llamadas a API-Football, pensada para un
 * cron frecuente. Solo toca los partidos que LO NECESITAN:
 *   - de fechas no publicadas,
 *   - que en NUESTRA DB todavía no están `finished` (los terminados ya no se vuelven
 *     a pedir → 0 llamadas de más),
 *   - cuyo kickoff + duración estimada + ~30' ya pasó (recién ahí pedimos las stats
 *     finales). Ese umbral nos da, de yapa, el delay de ~30' para postear la story.
 * Cada partido cuesta 3 llamadas (fixture+players+events) y se paga UNA sola vez.
 */
// Ventana de "estabilización": aunque un partido ya esté finished CON stats
// completas, lo re-sincronizamos un par de veces más dentro de esta ventana para
// capturar correcciones tardías de API-Football (ratings revisados, tarjetas /
// expulsiones cargadas después del pitazo, figura del partido). Con el cron horario
// son ~2-3 pasadas extra por partido. Pasada la ventana, se da por estable.
const STABILIZE_WINDOW_MS = 5 * 3_600_000;

// Tope duro: si pasadas 24h del kickoff API-Football no terminó de cargar bien las
// stats (o el partido quedó postergado/sin marcar `finished`), dejamos de reintentar
// (lo resuelve el admin a mano) para no drenar la API con un partido "colgado".
const SYNC_GIVEUP_WINDOW_MS = 24 * 3_600_000;

export async function syncDueMatches(now: Date = new Date()) {
  // Todos los partidos de fechas no publicadas (cualquier estado): así podemos
  // RE-sincronizar los que figuran `finished` pero todavía no tienen stats completas.
  const rows = await db
    .select({
      match: matches,
      roundType: rounds.type,
    })
    .from(matches)
    .innerJoin(rounds, eq(matches.roundId, rounds.id))
    .where(ne(rounds.status, "published"))
    .orderBy(asc(matches.kickoff));

  const nowMs = now.getTime();

  // Pasó el umbral "terminó hace ~30'".
  const pastSettle = rows.filter((r) => {
    if (!r.match.kickoff) return false;
    const settleMin = r.roundType === "knockout" ? SETTLE_MIN.knockout : SETTLE_MIN.group;
    return new Date(r.match.kickoff).getTime() + settleMin * 60_000 <= nowMs;
  });

  // ¿Cuáles de los que figuran finished ya tienen stats completas? Esos no se tocan.
  const finishedIds = pastSettle.filter((r) => r.match.status === "finished").map((r) => r.match.id);
  const complete = await matchesWithCompleteStats(finishedIds);

  const due = pastSettle.filter((r) => {
    const kickoffMs = r.match.kickoff ? new Date(r.match.kickoff).getTime() : 0;
    const age = nowMs - kickoffMs;
    if (r.match.status === "finished" && complete.has(r.match.id)) {
      // Listo: re-sincronizar solo dentro de la ventana de estabilización (capturar
      // correcciones tardías); después se considera estable y no se vuelve a pedir.
      return age <= STABILIZE_WINDOW_MS;
    }
    // No terminado o con stats incompletas: pedir hasta el tope duro de 24h.
    return age <= SYNC_GIVEUP_WINDOW_MS;
  });

  if (due.length === 0) return { matches: 0, due: 0, byRound: [] as { roundId: number; matches: number }[] };

  const byApi = await buildPlayerIndex();
  const results = await mapLimit(due, SYNC_CONCURRENCY, (r) => syncOneMatch(r.match, byApi));

  // Cuántos partidos se sincronizaron por fecha (para avisar a Slack "hay stats
  // nuevas para revisar/publicar").
  const counts = new Map<number, number>();
  results.forEach((ok, i) => {
    if (ok) counts.set(due[i]!.match.roundId, (counts.get(due[i]!.match.roundId) ?? 0) + 1);
  });
  const byRound = [...counts.entries()].map(([roundId, matches]) => ({ roundId, matches }));

  try {
    revalidateTag("country-fixtures", "max");
  } catch {
    /* fuera de un request de Next (CLI): no hay caché que invalidar */
  }
  return { matches: results.filter(Boolean).length, due: due.length, byRound };
}

/**
 * Sincroniza UN solo partido (mismo efecto que syncRound pero acotado a un match).
 * Útil para refrescar un partido puntual sin gastar el rate limit en toda la fecha.
 */
export async function syncMatch(matchId: number) {
  const m = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!m) return { ok: false as const, error: "partido no existe" };
  if (!m.apiFootballFixtureId) return { ok: false as const, error: "el partido no tiene fixture de API-Football" };

  const byApi = await buildPlayerIndex();
  await syncOneMatch(m, byApi);
  revalidateTag("country-fixtures", "max");
  return { ok: true as const };
}
