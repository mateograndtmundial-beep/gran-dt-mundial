import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  players,
  countries,
  coaches,
  rounds,
  matches,
  playerMatchStats,
  entries,
  entryRounds,
  entryRoundPlayers,
  leagues,
  leagueMembers,
  users,
  products,
  orders,
} from "@/lib/db/schema";
import { buildRoundBreakdown, type RoundBreakdown } from "@/lib/scoring/desglose";
import type { Position } from "@/lib/game/config";
import { getFreeChangesForRound, PLAYOFFS_FREE_CHANGES_FROM_ORDER, SCORING } from "@/lib/game/config";
import { round1 } from "@/lib/pricing/map";
import { shortRoundName } from "@/lib/game/round-format";
import { freeChangesLeft } from "@/lib/game/changes";
import { getPinBalance } from "@/lib/pins";
import { countryEs } from "@/lib/i18n/countries";

export type PlayerRow = Awaited<ReturnType<typeof getPlayersWithCountry>>[number];
export type CoachRow = Awaited<ReturnType<typeof getCoaches>>[number];

/**
 * Variante SIN traducir: countryName en inglés tal como está en la DB.
 * La usa el pipeline de precios (scripts/price-players.ts), cuyo matching
 * contra Transfermarkt depende de los nombres en inglés. La UI usa
 * getPlayersWithCountry (en español).
 */
function selectPlayersWithCountry() {
  return db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      price: players.price,
      priceManual: players.priceManual,
      photoUrl: players.photoUrl,
      club: players.club,
      birthYear: players.birthYear,
      countryId: players.countryId,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      code: countries.code,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(players)
    .innerJoin(countries, eq(players.countryId, countries.id))
    .orderBy(desc(players.price));
}

/**
 * Variante SIN cachear: la usan los scripts de pricing (necesitan datos frescos
 * de la DB). La UI usa getPlayersWithCountry (cacheada).
 */
export async function getPlayersWithCountryRaw() {
  return selectPlayersWithCountry();
}

/**
 * Plantel completo (1248 jugadores) leído en /jugadores y /equipo (las páginas
 * más calientes). Cacheado con el Data Cache (tag `players`): solo cambia al
 * editar un precio (`updatePlayerPrice`) o al publicar una fecha (marca
 * `countries.eliminatedRound`); ambos invalidan el tag. TTL como red de
 * seguridad. countryEs() queda fuera del caché (JS puro, no toca la DB).
 */
const getPlayersCached = unstable_cache(
  () => selectPlayersWithCountry(),
  ["players-with-country"],
  { tags: ["players"], revalidate: 3600 },
);

export async function getPlayersWithCountry() {
  const rows = await getPlayersCached();
  return rows.map((p) => ({ ...p, countryName: countryEs(p.countryName) }));
}

// ---------- Stats acumuladas por jugador (torneo) ----------

/** Rendimiento acumulado de un jugador en el torneo (solo fechas publicadas). */
export type PlayerStats = {
  pj: number; // partidos jugados (>= SCORING.minMinutes)
  goals: number;
  penaltyGoals: number; // goles de penal convertidos (subconjunto de goals)
  penaltyMissed: number; // penales errados (para mostrar convertidos/pateados)
  assists: number;
  yellow: number;
  red: number;
  cleanSheets: number; // valla invicta (solo relevante GK/DEF)
  motm: number; // veces figura del partido
  avgRating: number | null;
  ppp: number; // puntos por partido (Σ fantasyPoints / PJ), 1 decimal
};

/**
 * Stats acumuladas por jugador a lo largo del torneo, agregando
 * `playerMatchStats` SOLO de fechas `published` (los usuarios nunca ven datos en
 * vivo; eso es admin-only vía getRoundLivePoints). Devuelve un mapa
 * playerId -> PlayerStats; los jugadores con 0 PJ (no llegaron a los 20') se
 * omiten, así `Object.keys(map).length > 0` indica "ya hay datos que mostrar".
 *
 * Cacheada con el Data Cache (tag `player-stats`): los valores solo cambian al
 * publicar una fecha (`publishRound` invalida el tag), no en el camino caliente.
 */
export const getPlayerTournamentStats = unstable_cache(
  async (): Promise<Record<number, PlayerStats>> => {
    const rows = await db
      .select({
        playerId: playerMatchStats.playerId,
        pj: sql<number>`count(*) filter (where ${playerMatchStats.minutes} >= ${SCORING.minMinutes})::int`,
        goals: sql<number>`sum(${playerMatchStats.goals})::int`,
        penaltyGoals: sql<number>`sum(${playerMatchStats.penaltyGoals})::int`,
        penaltyMissed: sql<number>`sum(${playerMatchStats.penaltiesMissed})::int`,
        assists: sql<number>`sum(${playerMatchStats.assists})::int`,
        yellow: sql<number>`sum(${playerMatchStats.yellow})::int`,
        red: sql<number>`sum(${playerMatchStats.red})::int`,
        cleanSheets: sql<number>`count(*) filter (where ${playerMatchStats.cleanSheet} and ${playerMatchStats.minutes} >= ${SCORING.minMinutes})::int`,
        motm: sql<number>`count(*) filter (where ${playerMatchStats.isMotm})::int`,
        avgRating: sql<number | null>`avg(${playerMatchStats.rating}) filter (where ${playerMatchStats.minutes} >= ${SCORING.minMinutes})`,
        totalPoints: sql<number>`sum(${playerMatchStats.fantasyPoints})`,
      })
      .from(playerMatchStats)
      .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
      .innerJoin(rounds, eq(matches.roundId, rounds.id))
      .where(eq(rounds.status, "published"))
      .groupBy(playerMatchStats.playerId);

    const out: Record<number, PlayerStats> = {};
    for (const r of rows) {
      const pj = Number(r.pj) || 0;
      if (pj === 0) continue; // "sin jugar": no entra al mapa
      const totalPoints = Number(r.totalPoints) || 0;
      out[r.playerId] = {
        pj,
        goals: Number(r.goals) || 0,
        penaltyGoals: Number(r.penaltyGoals) || 0,
        penaltyMissed: Number(r.penaltyMissed) || 0,
        assists: Number(r.assists) || 0,
        yellow: Number(r.yellow) || 0,
        red: Number(r.red) || 0,
        cleanSheets: Number(r.cleanSheets) || 0,
        motm: Number(r.motm) || 0,
        avgRating: r.avgRating != null ? round1(Number(r.avgRating)) : null,
        ppp: round1(totalPoints / pj),
      };
    }
    return out;
  },
  ["player-tournament-stats"],
  // Red de seguridad: además de la invalidación on-demand por tag (publishRound,
  // saveMatchStats, unpublishRound), un TTL para que cualquier corrección de
  // stats que olvide bustear el tag igual se refleje dentro de la hora.
  { tags: ["player-stats"], revalidate: 3600 },
);

// ---------- Ownership (% de equipos que eligió a cada jugador) ----------

// Mínimo de equipos para mostrar ownership. Por debajo, un "100%" con 1 de 1
// equipo es ruido/engañoso (típico pre-lanzamiento) → no se muestra.
export const MIN_OWNERSHIP_SAMPLE = 30;

/**
 * % de equipos que rostean a cada jugador, sobre la TOTALIDAD de equipos del
 * juego (no una fecha puntual). Como hay 1 equipo por usuario y las alineaciones
 * se arrastran, para cada equipo se usa su alineación MÁS RECIENTE: si no editó
 * la fecha nueva, vale la de la fecha anterior (último `entryRound` por
 * `rounds.order`). Denominador = todos los equipos con al menos una alineación.
 * Devuelve playerId -> % (1 decimal). Mapa vacío si el universo es menor a
 * MIN_OWNERSHIP_SAMPLE (anti-ruido). Cacheado con tag "player-ownership" (cambia
 * al editar equipos, no solo al publicar) + TTL corto.
 */
export const getPlayerOwnership = unstable_cache(
  async (): Promise<Record<number, number>> => {
    // Denominador: equipos con cualquier alineación cargada (1 por usuario).
    const totalRows = await db
      .select({ total: sql<number>`count(distinct ${entryRounds.entryId})::int` })
      .from(entryRounds);
    const total = Number(totalRows[0]?.total) || 0;
    if (total < MIN_OWNERSHIP_SAMPLE) return {};

    // Última alineación de cada equipo (mayor `rounds.order`) = su equipo efectivo.
    const latest = db
      .selectDistinctOn([entryRounds.entryId], { erId: entryRounds.id })
      .from(entryRounds)
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .orderBy(entryRounds.entryId, desc(rounds.order))
      .as("latest");

    const rows = await db
      .select({
        playerId: entryRoundPlayers.playerId,
        owners: sql<number>`count(*)::int`,
      })
      .from(latest)
      .innerJoin(entryRoundPlayers, eq(entryRoundPlayers.entryRoundId, latest.erId))
      .groupBy(entryRoundPlayers.playerId);

    const out: Record<number, number> = {};
    for (const r of rows) {
      const owners = Number(r.owners) || 0;
      // % crudo (1 decimal): el front decide "<1%" vs "N%". Los jugadores que no
      // aparecen acá (0 dueños) no entran al mapa → el front los muestra "<1%"
      // mientras haya datos (el universo superó MIN_OWNERSHIP_SAMPLE).
      out[r.playerId] = Math.round((owners / total) * 1000) / 10;
    }
    return out;
  },
  ["player-ownership"],
  { tags: ["player-ownership"], revalidate: 300 },
);

// ---------- Info de Mundial para /jugadores ----------

export type FixtureInfo = {
  opponentName: string | null;
  opponentFlag: string | null;
  kickoff: string | null; // ISO
  venue: string | null;
  roundName: string | null;
  isHome: boolean;
  difficulty: "easy" | "medium" | "hard";
};

/**
 * Próximo partido + dificultad por selección, para el panel de /jugadores.
 * La dificultad es un proxy: la fuerza del rival = suma del valor de su plantel
 * (los precios que ya tenemos), rankeada en 3 tramos (top=alta, medio, bajo=baja).
 * Devuelve countryId -> lista de próximos partidos (no jugados), del más cercano al más lejano (máx 3).
 */
export const getCountryFixtures = unstable_cache(
  async (): Promise<Record<number, FixtureInfo[]>> => {
  const vals = await db
    .select({ countryId: players.countryId, value: sql<number>`sum(${players.price})` })
    .from(players)
    .groupBy(players.countryId);
  const sorted = vals
    .map((v) => ({ id: v.countryId, value: Number(v.value) }))
    .sort((a, b) => b.value - a.value);
  const n = sorted.length || 1;
  const strengthTier = new Map<number, "hard" | "medium" | "easy">();
  sorted.forEach((c, i) => {
    strengthTier.set(c.id, i < n / 3 ? "hard" : i < (2 * n) / 3 ? "medium" : "easy");
  });

  const home = alias(countries, "fx_home");
  const away = alias(countries, "fx_away");
  const ms = await db
    .select({
      homeCountryId: matches.homeCountryId,
      awayCountryId: matches.awayCountryId,
      homeName: home.name,
      homeFlag: home.flagUrl,
      awayName: away.name,
      awayFlag: away.flagUrl,
      kickoff: matches.kickoff,
      venue: matches.venue,
      roundName: rounds.name,
    })
    .from(matches)
    .leftJoin(home, eq(matches.homeCountryId, home.id))
    .leftJoin(away, eq(matches.awayCountryId, away.id))
    .leftJoin(rounds, eq(matches.roundId, rounds.id))
    .where(ne(matches.status, "finished"))
    .orderBy(asc(matches.kickoff));

  const MAX = 3; // próximos N partidos (la fase de grupos son 3)
  const out: Record<number, FixtureInfo[]> = {};
  // ms viene ordenado por kickoff asc → las listas quedan cronológicas.
  const add = (cid: number, info: FixtureInfo) => {
    const arr = (out[cid] ??= []);
    if (arr.length < MAX) arr.push(info);
  };
  for (const m of ms) {
    if (m.homeCountryId == null || m.awayCountryId == null) continue;
    const kickoff = m.kickoff ? new Date(m.kickoff).toISOString() : null;
    add(m.homeCountryId, {
      opponentName: countryEs(m.awayName),
      opponentFlag: m.awayFlag,
      kickoff,
      venue: m.venue,
      roundName: m.roundName,
      isHome: true,
      difficulty: strengthTier.get(m.awayCountryId) ?? "medium",
    });
    add(m.awayCountryId, {
      opponentName: countryEs(m.homeName),
      opponentFlag: m.homeFlag,
      kickoff,
      venue: m.venue,
      roundName: m.roundName,
      isHome: false,
      difficulty: strengthTier.get(m.homeCountryId) ?? "medium",
    });
  }
  return out;
  },
  ["country-fixtures"],
  // Los fixtures casi no cambian (solo al sincronizar partidos): TTL largo +
  // invalidación on-demand desde syncRound vía revalidateTag.
  { tags: ["country-fixtures"], revalidate: 3600 },
);

/** ¿El usuario ya es miembro de la liga? (para mostrar/ocultar el CTA de unirse) */
export async function isLeagueMember(leagueId: number, userId: number): Promise<boolean> {
  const r = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .limit(1);
  return r.length > 0;
}

// ---------- Editor de scoring (admin) ----------

/** Una fecha con sus partidos (nombres/banderas + cuántos jugadores tienen stats). */
export async function getRoundWithMatches(roundId: number) {
  const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
  if (!round) return null;

  const home = alias(countries, "home_c");
  const away = alias(countries, "away_c");
  const ms = await db
    .select({
      id: matches.id,
      kickoff: matches.kickoff,
      venue: matches.venue,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homePenalties: matches.homePenalties,
      awayPenalties: matches.awayPenalties,
      motmPlayerId: matches.motmPlayerId,
      homeCountryId: matches.homeCountryId,
      awayCountryId: matches.awayCountryId,
      homeName: home.name,
      homeFlag: home.flagUrl,
      awayName: away.name,
      awayFlag: away.flagUrl,
    })
    .from(matches)
    .leftJoin(home, eq(matches.homeCountryId, home.id))
    .leftJoin(away, eq(matches.awayCountryId, away.id))
    .where(eq(matches.roundId, roundId))
    .orderBy(asc(matches.kickoff));

  const ids = ms.map((m) => m.id);
  const counts = ids.length
    ? await db
        .select({ matchId: playerMatchStats.matchId, n: sql<number>`count(*)::int` })
        .from(playerMatchStats)
        .where(inArray(playerMatchStats.matchId, ids))
        .groupBy(playerMatchStats.matchId)
    : [];
  const countByMatch = new Map(counts.map((c) => [c.matchId, Number(c.n)]));

  return {
    round,
    matches: ms.map((m) => ({
      ...m,
      homeName: countryEs(m.homeName),
      awayName: countryEs(m.awayName),
      statsCount: countByMatch.get(m.id) ?? 0,
    })),
  };
}

/**
 * Puntos fantasy acumulados por jugador en una fecha, leyendo player_match_stats
 * directo (sin esperar publishRound). Es la vista "en vivo" del ADMIN: los
 * usuarios recién ven puntajes cuando la fecha se publica (getRoundBreakdown
 * exige status published) — esta query solo debe usarse detrás del guard isAdmin.
 */
export async function getRoundLivePoints(roundId: number) {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      position: players.position,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      minutes: sql<number>`sum(${playerMatchStats.minutes})::int`,
      rating: sql<number | null>`max(${playerMatchStats.rating})`,
      isMotm: sql<boolean>`bool_or(${playerMatchStats.isMotm})`,
      points: sql<number>`sum(${playerMatchStats.fantasyPoints})`,
    })
    .from(playerMatchStats)
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(matches.roundId, roundId))
    .groupBy(players.id, players.name, players.position, countries.name, countries.flagUrl)
    .orderBy(sql`sum(${playerMatchStats.fantasyPoints}) desc`, asc(players.name));
  return rows.map((r) => ({ ...r, countryName: countryEs(r.countryName) }));
}

/** Un partido + ambos planteles (con sus stats si ya existen) para editar a mano. */
export async function getMatchEditor(matchId: number) {
  const home = alias(countries, "home_c");
  const away = alias(countries, "away_c");
  const m = (
    await db
      .select({
        id: matches.id,
        roundId: matches.roundId,
        homeCountryId: matches.homeCountryId,
        awayCountryId: matches.awayCountryId,
        homeName: home.name,
        homeFlag: home.flagUrl,
        awayName: away.name,
        awayFlag: away.flagUrl,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homePenalties: matches.homePenalties,
        awayPenalties: matches.awayPenalties,
        status: matches.status,
        motmPlayerId: matches.motmPlayerId,
        roundName: rounds.name,
        roundType: rounds.type,
        roundStatus: rounds.status,
      })
      .from(matches)
      .leftJoin(home, eq(matches.homeCountryId, home.id))
      .leftJoin(away, eq(matches.awayCountryId, away.id))
      .leftJoin(rounds, eq(matches.roundId, rounds.id))
      .where(eq(matches.id, matchId))
      .limit(1)
  )[0];
  if (!m) return null;
  m.homeName = countryEs(m.homeName);
  m.awayName = countryEs(m.awayName);
  if (m.homeCountryId == null || m.awayCountryId == null) return { match: m, players: [] };

  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      position: players.position,
      countryId: players.countryId,
      jerseyNumber: players.jerseyNumber,
      minutes: playerMatchStats.minutes,
      rating: playerMatchStats.rating,
      goals: playerMatchStats.goals,
      penaltyGoals: playerMatchStats.penaltyGoals,
      assists: playerMatchStats.assists,
      yellow: playerMatchStats.yellow,
      red: playerMatchStats.red,
      ownGoals: playerMatchStats.ownGoals,
      penaltiesSaved: playerMatchStats.penaltiesSaved,
      penaltiesMissed: playerMatchStats.penaltiesMissed,
      cleanSheet: playerMatchStats.cleanSheet,
      isMotm: playerMatchStats.isMotm,
      fantasyPoints: playerMatchStats.fantasyPoints,
      manualEdit: playerMatchStats.manualEdit,
      hasStat: sql<boolean>`${playerMatchStats.id} is not null`,
    })
    .from(players)
    .leftJoin(
      playerMatchStats,
      and(eq(playerMatchStats.playerId, players.id), eq(playerMatchStats.matchId, matchId)),
    )
    .where(inArray(players.countryId, [m.homeCountryId, m.awayCountryId]))
    .orderBy(asc(players.countryId), asc(players.position), desc(playerMatchStats.minutes), asc(players.name));

  return { match: m, players: rows };
}

/**
 * Fechas que conviene sincronizar ahora: no publicadas, ya empezadas (primer
 * partido <= now) y con algún partido dentro de la ventana reciente (para no
 * golpear la API por fechas viejas sin publicar). La usa el cron.
 */
export async function getRoundsToSync(now: Date = new Date(), windowHours = 72): Promise<number[]> {
  const rows = await db
    .select({
      id: rounds.id,
      firstKickoff: sql<string | null>`min(${matches.kickoff})`,
      lastKickoff: sql<string | null>`max(${matches.kickoff})`,
    })
    .from(rounds)
    .leftJoin(matches, eq(matches.roundId, rounds.id))
    .where(ne(rounds.status, "published"))
    .groupBy(rounds.id)
    .orderBy(asc(rounds.order));

  const nowMs = now.getTime();
  const cutoff = nowMs - windowHours * 3_600_000;
  return rows
    .filter((r) => r.firstKickoff != null && new Date(r.firstKickoff).getTime() <= nowMs)
    .filter((r) => r.lastKickoff != null && new Date(r.lastKickoff).getTime() >= cutoff)
    .map((r) => r.id);
}

/**
 * Técnicos (48) leídos en /equipo. Cacheado: solo cambia con el seed → el TTL
 * alcanza (sin invalidación on-demand). countryEs() queda fuera del caché.
 */
const getCoachesCached = unstable_cache(
  () =>
    db
      .select({
        id: coaches.id,
        name: coaches.name,
        photoUrl: coaches.photoUrl,
        price: coaches.price,
        countryId: coaches.countryId,
        countryName: countries.name,
        flagUrl: countries.flagUrl,
        code: countries.code,
      })
      .from(coaches)
      .innerJoin(countries, eq(coaches.countryId, countries.id)),
  ["coaches"],
  { tags: ["coaches"], revalidate: 3600 },
);

export async function getCoaches() {
  const rows = await getCoachesCached();
  return rows.map((c) => ({ ...c, countryName: countryEs(c.countryName) }));
}

/** Técnico (DT) elegido en una alineación, con su selección. null si no tiene. */
export async function getLineupCoach(entryRoundId: number) {
  const row = (
    await db
      .select({
        id: coaches.id,
        name: coaches.name,
        countryName: countries.name,
        flagUrl: countries.flagUrl,
        code: countries.code,
      })
      .from(entryRounds)
      .innerJoin(coaches, eq(entryRounds.coachId, coaches.id))
      .innerJoin(countries, eq(coaches.countryId, countries.id))
      .where(eq(entryRounds.id, entryRoundId))
      .limit(1)
  )[0];
  if (!row) return null;
  return { ...row, countryName: countryEs(row.countryName) };
}

/**
 * Fecha editable = la primera no publicada que todavía no se cerró. Su "deadline"
 * es el kickoff de su primer partido; cuando ese partido empieza, la fecha queda
 * bloqueada y la editable pasa a la siguiente.
 *
 * Caso especial de los playoffs: entre la última fecha de grupos (ya en juego) y
 * el alta de los fixtures de los 16vos, la próxima fecha NO tiene partidos cargados
 * todavía (API-Football publica el cuadro recién cuando terminan los grupos). Esa
 * fecha igual es editable —es la próxima a jugarse y todas las anteriores ya
 * arrancaron o se publicaron— con el cierre dado por `rounds.deadline` si está
 * cargado a mano, o "a definir" (`deadline: null`, sin countdown) hasta que se
 * seedeen los fixtures. Antes acá devolvía null y dejaba el equipo BLOQUEADO + el
 * countdown del home en 00:00:00 durante todo ese hueco.
 *
 * Devuelve null solo si NO queda ninguna fecha por jugar (todo publicado → torneo
 * terminado). El `deadline` puede ser null (fecha editable sin fixtures todavía),
 * así que los consumidores que lo usan para un countdown deben contemplarlo.
 */
export async function getEditableRound(now: Date = new Date()) {
  // Una sola query: trae las rondas no publicadas con el kickoff de su primer
  // partido (min) vía leftJoin + groupBy, en vez de N+1 (una query por ronda).
  const candidates = await db
    .select({
      round: rounds,
      firstKickoff: sql<string | null>`min(${matches.kickoff})`,
    })
    .from(rounds)
    .leftJoin(matches, eq(matches.roundId, rounds.id))
    .where(ne(rounds.status, "published"))
    .groupBy(rounds.id)
    .orderBy(asc(rounds.order));
  for (const c of candidates) {
    if (c.firstKickoff) {
      // Fecha CON fixtures: editable hasta que arranque su primer partido. Si ya
      // arrancó (en juego o cerrada sin publicar), la salteamos y probamos la próxima.
      const deadline = new Date(c.firstKickoff);
      if (deadline > now) return { round: c.round, deadline: deadline as Date | null };
      continue;
    }
    // Fecha SIN fixtures todavía (playoffs antes de que se publique el cuadro): es
    // la próxima a jugarse → editable. Si hay un deadline cargado a mano en la fecha
    // (rounds.deadline) y todavía no pasó, lo usamos como cierre/countdown; si no
    // (sin deadline, o ya pasó pero los fixtures aún no se seedearon), queda "a
    // definir" (null, sin countdown). NUNCA la salteamos: sin partidos no hay nada
    // en juego, así que siempre es la próxima fecha editable, no la siguiente — un
    // deadline manual vencido no debe "adelantar" a la fecha que sigue.
    const manualDeadline = c.round.deadline ? new Date(c.round.deadline) : null;
    return { round: c.round, deadline: manualDeadline && manualDeadline > now ? manualDeadline : null };
  }
  return null;
}

/** Fecha sobre la que se guarda la alineación (la editable). Null si está bloqueado. */
export async function getCurrentRound() {
  return (await getEditableRound())?.round ?? null;
}

export async function getAllRounds() {
  return db.select().from(rounds).orderBy(asc(rounds.order));
}

/**
 * Los rankings (global y posición del usuario) muestran a todos en 0 pts hasta
 * que se juegue y publique la Fecha 1 — hasta entonces no aportan nada y
 * confunden. Se habilitan recién cuando esa fecha (order = 1) queda `published`.
 */
export async function isRankingsVisible(): Promise<boolean> {
  const r = (
    await db.select({ status: rounds.status }).from(rounds).where(eq(rounds.order, 1)).limit(1)
  )[0];
  return r?.status === "published";
}

/**
 * ¿Terminó el torneo? = no queda NINGUNA fecha sin publicar (y hay fechas cargadas).
 *
 * OJO: NO alcanza con `getEditableRound() === null`. Esa función también devuelve
 * null mientras la última fecha se está jugando y todavía no se publicó (la saltea
 * porque su kickoff ya pasó) — es justo el estado que produce el "Equipo bloqueado".
 * Usarla acá prendería el modo "terminó" durante los 90 minutos de la Final.
 *
 * Publicar fuera de orden es imposible (`publishRound` exige las anteriores ya
 * publicadas), así que "no queda ninguna pendiente" ⟺ "se publicó la última".
 *
 * Cacheada con el tag `leaderboard`: `publishRound` lo invalida con "max" al
 * publicar, así que el flip a "torneo terminado" es inmediato y sin deploy. El
 * revalidate de 60s es red de seguridad (p. ej. si se toca `rounds.status` a mano).
 */
export const isTournamentFinished = unstable_cache(
  async (): Promise<boolean> => {
    const [row] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${rounds.status} <> 'published')`,
      })
      .from(rounds);
    return Number(row?.total ?? 0) > 0 && Number(row?.pending ?? 0) === 0;
  },
  ["tournament-finished"],
  { tags: ["leaderboard"], revalidate: 60 },
);

export type PodiumRow = {
  entryId: number;
  name: string | null;
  username: string | null;
  totalPoints: number;
};

/**
 * Top 3 del ranking general: los campeones del juego. Reusa `getGlobalLeaderboard`,
 * que ya está cacheado y ya se llama con limit=3 desde el round-recap → sin queries
 * ni entradas de caché extra.
 */
export async function getFinalPodium(): Promise<PodiumRow[]> {
  return getGlobalLeaderboard(3);
}

/**
 * Combo para el home: estado del torneo + podio en un solo await. Sin
 * `unstable_cache` propio (compone dos funciones ya cacheadas; anidarlas
 * complicaría la invalidación).
 */
export async function getTournamentResults(): Promise<{ finished: boolean; podium: PodiumRow[] }> {
  const finished = await isTournamentFinished();
  return { finished, podium: finished ? await getFinalPodium() : [] };
}

/**
 * Tabla global (top N) leída en /ranking. Cacheada con el Data Cache (tag
 * `leaderboard`): los `entries.totalPoints` solo cambian al publicar una fecha
 * (`publishRound` invalida el tag). Los args (limit/offset) entran en la key del
 * caché, así que el uso con limit=3 (round-recap) se cachea por separado. TTL
 * corto como red de seguridad.
 */
export const getGlobalLeaderboard = unstable_cache(
  async (limit = 100, offset = 0) => {
    return db
      .select({
        entryId: entries.id,
        name: entries.name,
        totalPoints: entries.totalPoints,
        username: users.username,
      })
      .from(entries)
      .innerJoin(users, eq(entries.userId, users.id))
      .orderBy(desc(entries.totalPoints), asc(entries.id))
      .limit(Math.max(1, Math.min(limit, 200)))
      .offset(Math.max(0, offset));
  },
  ["global-leaderboard"],
  { tags: ["leaderboard"], revalidate: 300 },
);

/**
 * Posición global de un entry: 1 + cantidad de entries con más puntos.
 *
 * Cacheada con el Data Cache de Next (tag `global-rank`): los puntos solo
 * cambian cuando se publica una fecha (`publishRound` invalida el tag), así
 * que sin esto cada carga de /mi-equipo (force-dynamic) disparaba un
 * `COUNT(*)` contra Neon — con miles de usuarios refrescando tras publicar,
 * eran miles de scans concurrentes en el camino caliente.
 */
export const getUserGlobalRank = unstable_cache(
  async (entryId: number): Promise<number | null> => {
    const me = (
      await db.select({ pts: entries.totalPoints }).from(entries).where(eq(entries.id, entryId)).limit(1)
    )[0];
    if (!me) return null;
    const r = (
      await db.select({ c: sql<number>`count(*)` }).from(entries).where(gt(entries.totalPoints, me.pts))
    )[0];
    return Number(r?.c ?? 0) + 1;
  },
  ["user-global-rank"],
  { tags: ["global-rank"] },
);

/**
 * Fechas ya publicadas (las únicas con puntajes visibles), para el selector
 * "General / por fecha" del ranking global y de las ligas. Ordenadas por `order`.
 * Cacheada con el tag `leaderboard` (cambia solo al publicar/despublicar fechas).
 */
export const getPublishedRounds = unstable_cache(
  async (): Promise<{ id: number; order: number; name: string }[]> => {
    return db
      .select({ id: rounds.id, order: rounds.order, name: rounds.name })
      .from(rounds)
      .where(eq(rounds.status, "published"))
      .orderBy(asc(rounds.order));
  },
  ["published-rounds"],
  { tags: ["leaderboard"], revalidate: 300 },
);

/**
 * Ranking global de UNA fecha: reordena por los puntos que cada equipo hizo en
 * esa fecha (no el acumulado). Solo aparecen los equipos que jugaron la fecha
 * (tienen `entryRound` para ella — el carry-over de `publishRound` ya materializa
 * uno por cada equipo activo). Misma key de caché que el leaderboard general.
 */
export const getGlobalLeaderboardByRound = unstable_cache(
  async (roundId: number, limit = 100, offset = 0) => {
    return db
      .select({
        entryId: entries.id,
        name: entries.name,
        totalPoints: entryRounds.points,
        username: users.username,
      })
      .from(entryRounds)
      .innerJoin(entries, eq(entryRounds.entryId, entries.id))
      .innerJoin(users, eq(entries.userId, users.id))
      .where(eq(entryRounds.roundId, roundId))
      .orderBy(desc(entryRounds.points), asc(entries.id))
      .limit(Math.max(1, Math.min(limit, 200)))
      .offset(Math.max(0, offset));
  },
  ["global-leaderboard-round"],
  { tags: ["leaderboard"], revalidate: 300 },
);

/**
 * Posición de un equipo en el ranking de UNA fecha: 1 + cuántos equipos hicieron
 * más puntos que él en esa fecha. Devuelve null si el equipo no jugó la fecha.
 */
export const getUserGlobalRankByRound = unstable_cache(
  async (entryId: number, roundId: number): Promise<{ rank: number; points: number } | null> => {
    const me = (
      await db
        .select({ pts: entryRounds.points })
        .from(entryRounds)
        .where(and(eq(entryRounds.entryId, entryId), eq(entryRounds.roundId, roundId)))
        .limit(1)
    )[0];
    if (!me) return null;
    const r = (
      await db
        .select({ c: sql<number>`count(*)` })
        .from(entryRounds)
        .where(and(eq(entryRounds.roundId, roundId), gt(entryRounds.points, me.pts)))
    )[0];
    return { rank: Number(r?.c ?? 0) + 1, points: me.pts };
  },
  ["user-global-rank-round"],
  { tags: ["leaderboard"], revalidate: 300 },
);

export async function getMyTeam(userId: number) {
  const entry = (await db.select().from(entries).where(eq(entries.userId, userId)).limit(1))[0];
  if (!entry) return null;
  const roundRows = await db
    .select({
      id: entryRounds.id,
      points: entryRounds.points,
      formation: entryRounds.formation,
      captainPlayerId: entryRounds.captainPlayerId,
      roundName: rounds.name,
      order: rounds.order,
      status: rounds.status,
    })
    .from(entryRounds)
    .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
    .where(eq(entryRounds.entryId, entry.id))
    .orderBy(asc(rounds.order));
  return { entry, rounds: roundRows };
}

/** Última alineación guardada del usuario (para precargar el armador al editar). */
export async function getEditableLineup(userId: number) {
  const entry = (await db.select().from(entries).where(eq(entries.userId, userId)).limit(1))[0];
  if (!entry) return null;
  const er = (
    await db
      .select({
        id: entryRounds.id,
        formation: entryRounds.formation,
        captainPlayerId: entryRounds.captainPlayerId,
        coachId: entryRounds.coachId,
      })
      .from(entryRounds)
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(eq(entryRounds.entryId, entry.id))
      .orderBy(desc(rounds.order))
      .limit(1)
  )[0];
  if (!er) return null;
  const lp = await db
    .select({ slot: entryRoundPlayers.slot, playerId: entryRoundPlayers.playerId })
    .from(entryRoundPlayers)
    .where(eq(entryRoundPlayers.entryRoundId, er.id));
  const slots: Record<string, number> = {};
  for (const r of lp) if (r.slot) slots[r.slot] = r.playerId;
  return { teamName: entry.name, formation: er.formation, captainPlayerId: er.captainPlayerId, coachId: er.coachId, slots };
}

/**
 * Contexto para el contador de cambios y el cartel de confirmación del armador.
 * El baseline es el ÚLTIMO equipo CONFIRMADO: una vez que guardás una alineación
 * para la fecha editable, ESE equipo pasa a ser el baseline y los cambios nuevos
 * se cuentan contra él (no contra la fecha anterior). Así, repetir/revertir un
 * cambio ya confirmado cuenta como cambio nuevo y no "devuelve" el cupo gratis.
 *
 * - `baselinePlayerIds`: los 15 del equipo confirmado contra los que se cuentan
 *   los cambios NUEVOS. Es la alineación de la fecha editable si ya guardaste una;
 *   si no, la de la fecha anterior. `null` = no hay fecha previa (primer equipo /
 *   fecha 1) → armado libre, sin costo.
 * - `priorChanges`: cambios ya aplicados (acumulados) en la fecha editable
 *   (`entryRounds.changesMade`) — el cupo gratis ya pudo haberse consumido.
 * - `alreadySpentThisRound`: pines ya gastados en la fecha editable (reconcilia
 *   re-ediciones para no re-cobrar).
 * - `savedThisRound`: si ya hay alineación guardada para la fecha editable.
 */
export async function getEditContext(userId: number, editableRoundId: number, editableRoundOrder: number) {
  const entry = (await db.select({ id: entries.id }).from(entries).where(eq(entries.userId, userId)).limit(1))[0];
  if (!entry)
    return {
      baselinePlayerIds: null as number[] | null,
      priorChanges: 0,
      alreadySpentThisRound: 0,
      savedThisRound: false,
    };

  // ¿Hay fecha previa? Define si la edición es "limitada" (cuenta cambios) o libre.
  const prevEr = (
    await db
      .select({ id: entryRounds.id })
      .from(entryRounds)
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(and(eq(entryRounds.entryId, entry.id), lt(rounds.order, editableRoundOrder)))
      .orderBy(desc(rounds.order))
      .limit(1)
  )[0];

  // Alineación ya guardada para la fecha editable (el equipo confirmado actual).
  const curEr = (
    await db
      .select({ id: entryRounds.id, pinsSpent: entryRounds.pinsSpent, changesMade: entryRounds.changesMade })
      .from(entryRounds)
      .where(and(eq(entryRounds.entryId, entry.id), eq(entryRounds.roundId, editableRoundId)))
      .limit(1)
  )[0];

  let baselinePlayerIds: number[] | null = null;
  let priorChanges = 0;
  if (prevEr) {
    // Baseline = equipo confirmado de la fecha editable si existe, si no el de la
    // fecha anterior. Idéntico criterio al de `saveLineup`.
    const baseErId = curEr?.id ?? prevEr.id;
    const rows = await db
      .select({ playerId: entryRoundPlayers.playerId })
      .from(entryRoundPlayers)
      .where(eq(entryRoundPlayers.entryRoundId, baseErId));
    baselinePlayerIds = rows.map((r) => r.playerId);
    priorChanges = curEr?.changesMade ?? 0;
  }

  return {
    baselinePlayerIds,
    priorChanges,
    alreadySpentThisRound: curEr?.pinsSpent ?? 0,
    savedThisRound: !!curEr,
  };
}

export type ChangesStatus =
  | { state: "ended" }
  | { state: "waiting"; nextRoundName: string | null }
  // deadline null = fecha editable sin fixtures todavía (playoffs antes del cuadro):
  // la ventana está abierta pero el cierre es "a definir" → la UI omite el countdown.
  | { state: "premium"; roundName: string; deadline: string | null }
  | { state: "unlimited"; roundName: string; deadline: string | null }
  | { state: "limited"; roundName: string; deadline: string | null; freeLeft: number; pinBalance: number };

/**
 * Estado de "cambios disponibles" para mostrar en /mi-equipo, con el mismo
 * cálculo que el contador del armador (`getEditContext` + `lib/game/changes.ts`)
 * para no desincronizarse del costo real que cobra `saveLineup`.
 * - `ended`: no quedan fechas pendientes (el torneo terminó / todo publicado).
 * - `waiting`: hay fechas pendientes pero ninguna editable ahora (la fecha está
 *   en juego, o la próxima todavía no tiene fixtures). `nextRoundName` = la
 *   primera no publicada, para anticipar "vas a poder cambiar para X".
 * - `premium`: pack de cambios ilimitados.
 * - `unlimited`: sin fecha previa (primer equipo / fecha 1) → edición libre,
 *   gratis hasta que arranque la fecha editable.
 * - `limited`: cuenta los cambios gratis que quedan (0 o más) y el saldo de pines.
 *
 * Los estados abiertos llevan `deadline` (ISO) = kickoff del primer partido de
 * la fecha editable, para el countdown / aviso de cierre.
 */
export async function getChangesStatus(userId: number, isPremium: boolean): Promise<ChangesStatus> {
  const editable = await getEditableRound();
  if (!editable) {
    // Sin fecha editable: distinguir "torneo terminado" de "fecha en juego /
    // próxima sin fixtures todavía" para no quedar en silencio en /mi-equipo.
    const pending = (
      await db
        .select({ name: rounds.name })
        .from(rounds)
        .where(ne(rounds.status, "published"))
        .orderBy(asc(rounds.order))
        .limit(1)
    )[0];
    if (!pending) return { state: "ended" };
    return { state: "waiting", nextRoundName: shortRoundName(pending.name) };
  }
  const roundName = shortRoundName(editable.round.name);
  // null = fecha editable sin fixtures todavía (cierre a definir): la UI no muestra countdown.
  const deadline = editable.deadline?.toISOString() ?? null;
  if (isPremium) return { state: "premium", roundName, deadline };

  const editContext = await getEditContext(userId, editable.round.id, editable.round.order);
  if (editContext.baselinePlayerIds == null) return { state: "unlimited", roundName, deadline };

  // El cupo gratis restante sale de los cambios YA acumulados en la fecha
  // (`priorChanges`), no de un diff recalculado: el baseline es el equipo
  // confirmado, así que un diff daría siempre 0.
  const inCopa = await isEnrolledInGoldenTicket(userId);
  const freeLeft = freeChangesLeft(
    editContext.priorChanges,
    getFreeChangesForRound(editable.round.order, inCopa),
  );
  const pinBalance = await getPinBalance(userId);
  return { state: "limited", roundName, deadline, freeLeft, pinBalance };
}

/** ¿El usuario ya armó equipo (tiene `entry`)? Chequeo liviano para gates de UI. */
export async function userHasEntry(userId: number): Promise<boolean> {
  const row = (
    await db.select({ id: entries.id }).from(entries).where(eq(entries.userId, userId)).limit(1)
  )[0];
  return !!row;
}

/**
 * ¿Corresponde mostrar el aviso "ahora 2 cambios gratis por fecha"? El beneficio
 * queda vigente todos los playoffs (order ≥ PLAYOFFS_FREE_CHANGES_FROM_ORDER), pero
 * el aviso es una NOVEDAD del estreno: se muestra SOLO en la fecha del debut (8vos,
 * order exactamente PLAYOFFS_FREE_CHANGES_FROM_ORDER) y desde 4tos en adelante ya
 * no. Es true cuando la primera fecha sin publicar es justo esa. El componente
 * cliente, además, lo muestra una sola vez por dispositivo (localStorage).
 */
export async function isDoubleChangeNoticeActive(): Promise<boolean> {
  const pending = (
    await db
      .select({ order: rounds.order })
      .from(rounds)
      .where(ne(rounds.status, "published"))
      .orderBy(asc(rounds.order))
      .limit(1)
  )[0];
  return !!pending && pending.order === PLAYOFFS_FREE_CHANGES_FROM_ORDER;
}

/** Ventana del recordatorio de cierre: aparece desde 24 h antes del deadline. */
const CHANGE_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Payload del popup recordatorio "te quedan menos de 24 h para cambiar tu equipo".
 * Devuelve no-null SOLO si: hay fecha editable, faltan <24 h para su cierre, el
 * usuario tiene equipo y TODAVÍA NO tocó su equipo para esa fecha (mismo cálculo
 * de cambios que `getChangesStatus`/`saveLineup`). Si no, `null` (no se muestra).
 * El short-circuit por la ventana de 24 h va primero para que el costo por
 * request (se monta global en el layout) sea mínimo cuando no aplica.
 */
export async function getChangeReminder(
  userId: number,
  now: Date = new Date(),
): Promise<{ roundId: number; roundName: string; deadline: string } | null> {
  const editable = await getEditableRound(now);
  // Sin fecha editable, o con cierre "a definir" (playoffs sin fixtures todavía):
  // no hay deadline contra el cual recordar → no se muestra el popup.
  if (!editable || !editable.deadline) return null;
  const deadline = editable.deadline;
  const msLeft = deadline.getTime() - now.getTime();
  if (msLeft <= 0 || msLeft > CHANGE_REMINDER_WINDOW_MS) return null;

  const entry = (
    await db.select({ id: entries.id }).from(entries).where(eq(entries.userId, userId)).limit(1)
  )[0];
  if (!entry) return null; // el popup es solo para quien ya tiene equipo

  const editContext = await getEditContext(userId, editable.round.id, editable.round.order);
  if (editContext.baselinePlayerIds == null) {
    // Edición libre (primer equipo / fecha 1): "no hizo su cambio" = todavía no
    // guardó alineación para la fecha editable.
    if (editContext.savedThisRound) return null;
  } else if (editContext.priorChanges !== 0) {
    // Ya hizo (y confirmó) al menos un cambio en la fecha → no insistimos.
    return null;
  }

  return {
    roundId: editable.round.id,
    // Nombre completo de la DB: el popup lo formatea con `roundWithArticle`
    // ("La Fecha 2", "Los 16vos de Final", "La Final"…).
    roundName: editable.round.name,
    deadline: deadline.toISOString(),
  };
}

export async function getMyLeagues(userId: number) {
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      code: leagues.code,
      isPublic: leagues.isPublic,
      kind: leagues.kind,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId));
}

/**
 * ¿El usuario está inscripto en alguna copa premium (GOLDEN TICKET)? Define el cupo
 * de cambios gratis extra de los 16vos (ver getFreeChangesForRound en game/config).
 */
export async function isEnrolledInGoldenTicket(userId: number): Promise<boolean> {
  const row = (
    await db
      .select({ id: leagueMembers.id })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .where(and(eq(leagueMembers.userId, userId), eq(leagues.kind, "golden_ticket"), inArray(leagues.status, ["open", "full"])))
      .limit(1)
  )[0];
  return !!row;
}

export type CopaStatus = Awaited<ReturnType<typeof getGoldenTicketCopas>>[number];

/**
 * Estado de las copas premium (GOLDEN TICKET) visibles —todas menos las 'draft'—,
 * para la UI de inscripción y el cupo en vivo: inscriptos/capacity, cuántos lugares
 * quedan, entrada, premio, el sku del producto de entrada (para createEntryOrder) y
 * si el usuario ya está dentro. Ordenadas por id (la copa 1 primero).
 */
export async function getGoldenTicketCopas(userId?: number) {
  const rows = await db
    .select({
      id: leagues.id,
      code: leagues.code,
      name: leagues.name,
      status: leagues.status,
      capacity: leagues.capacity,
      entryFeeArs: leagues.entryFeeArs,
      prizeArs: leagues.prizeArs,
      entrySku: products.sku,
      // Cierre por tiempo: la inscripción cierra en el kickoff de la fecha de arranque
      // (deadline del scoringStartRound). Lo exponemos para que la UI no invite a una
      // copa que ya no admite inscripciones (aunque el status siga 'open').
      closesAt: rounds.deadline,
      enrolled: sql<number>`(select count(*) from ${leagueMembers} where ${leagueMembers.leagueId} = ${leagues.id})`,
      isEnrolled:
        userId != null
          ? sql<boolean>`exists (select 1 from ${leagueMembers} where ${leagueMembers.leagueId} = ${leagues.id} and ${leagueMembers.userId} = ${userId})`
          : sql<boolean>`false`,
      // ¿El usuario ya tiene equipo armado? Lo resolvemos como una columna más de este
      // mismo query (un solo round-trip a Neon, que es HTTP) para que la landing /copa
      // sepa si empujar a "Armá tu equipo" sin pagar una consulta extra. El valor es el
      // mismo en todas las filas (no depende de la copa); la UI lo lee de cualquiera.
      hasTeam:
        userId != null
          ? sql<boolean>`exists (select 1 from ${entries} where ${entries.userId} = ${userId})`
          : sql<boolean>`false`,
    })
    .from(leagues)
    .leftJoin(products, eq(products.entryLeagueId, leagues.id))
    .leftJoin(rounds, eq(rounds.id, leagues.scoringStartRoundId))
    .where(and(eq(leagues.kind, "golden_ticket"), ne(leagues.status, "draft")))
    .orderBy(asc(leagues.id));

  return rows.map((r) => {
    const enrolled = Number(r.enrolled);
    const pct = r.capacity != null && r.capacity > 0 ? (enrolled / r.capacity) * 100 : 0;
    return {
      ...r,
      enrolled,
      // Lugares libres (nunca negativo); null si la copa no tiene cupo.
      spotsLeft: r.capacity != null ? Math.max(0, r.capacity - enrolled) : null,
      // Señal de escasez (qué tan llena está la copa) SIN revelar el número exacto.
      // La UI de no inscriptos muestra solo esto: "low" → "Quedan pocos cupos",
      // "last" → "Últimos lugares". Es la única info de cupo que viaja al cliente
      // para quien no está dentro (ver getCopasStatus, que oculta enrolled/spotsLeft).
      scarcity: (pct >= 95 ? "last" : pct >= 80 ? "low" : "none") as "none" | "low" | "last",
      // ¿Ya cerró por tiempo? (pasó el kickoff de los 16vos).
      deadlinePassed: r.closesAt != null && Date.now() >= new Date(r.closesAt).getTime(),
    };
  });
}

/**
 * Reconciliación de entradas a copas: órdenes de entrada (productos con entryLeagueId)
 * que están `paid` o `refunded` pero cuyo usuario NO figura en la copa. Son los casos
 * de "pagó sin lugar" (overflow / fuera de término): el dueño las usa para reembolsar a
 * mano en Mercado Pago. Ver lib/payments/credit.ts (markOrderForRefund) y /admin.
 */
export async function getOrphanedEntryOrders() {
  return db
    .select({
      orderId: orders.id,
      status: orders.status,
      userId: orders.userId,
      username: users.username,
      amount: orders.amount,
      currency: orders.currency,
      providerRef: orders.providerRef,
      paidAt: orders.paidAt,
      copaId: leagues.id,
      copaName: leagues.name,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .innerJoin(leagues, eq(leagues.id, products.entryLeagueId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(
      and(
        inArray(orders.status, ["paid", "refunded"]),
        sql`not exists (select 1 from ${leagueMembers} where ${leagueMembers.leagueId} = ${leagues.id} and ${leagueMembers.userId} = ${orders.userId})`,
      ),
    )
    .orderBy(desc(orders.paidAt));
}

/**
 * Todas las copas premium (incluidas las `draft`), con su cupo, para el panel de
 * admin: abrir/cerrar a mano y ver el snapshot. A diferencia de getGoldenTicketCopas,
 * NO oculta las `draft`.
 */
export async function getCopasForAdmin() {
  return db
    .select({
      id: leagues.id,
      code: leagues.code,
      name: leagues.name,
      status: leagues.status,
      capacity: leagues.capacity,
      enrolled: sql<number>`(select count(*) from ${leagueMembers} where ${leagueMembers.leagueId} = ${leagues.id})`,
      // Estado del producto de ENTRADA (active=true → se puede pagar). Para el toggle de /admin.
      entryActive: sql<boolean>`coalesce((select ${products.active} from ${products} where ${products.entryLeagueId} = ${leagues.id} limit 1), false)`,
    })
    .from(leagues)
    .where(eq(leagues.kind, "golden_ticket"))
    .orderBy(asc(leagues.id));
}

/**
 * Posiciones finales de una copa (sin paginar), ordenadas con el MISMO desempate que
 * getLeagueRanking (puntos totales → mejor pico de fecha → inscripción más temprana).
 * La usa snapshotCopaRanking para congelar el ranking tras la Final. Devuelve los
 * userId en orden de puesto (1°, 2°, ...).
 */
export async function getCopaStanding(leagueId: number) {
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league) return null;
  let startOrder = 1;
  if (league.scoringStartRoundId != null) {
    const sr = (
      await db.select({ order: rounds.order }).from(rounds).where(eq(rounds.id, league.scoringStartRoundId)).limit(1)
    )[0];
    if (sr) startOrder = sr.order;
  }
  const pointsExpr = sql<number>`coalesce(sum(case when ${rounds.order} >= ${startOrder} then ${entryRounds.points} else 0 end), 0)`;
  const bestRoundExpr = sql<number>`coalesce(max(case when ${rounds.order} >= ${startOrder} then ${entryRounds.points} end), -1000000)`;
  const rows = await db
    .select({ userId: leagueMembers.userId, totalPoints: pointsExpr })
    .from(leagueMembers)
    .leftJoin(entries, eq(entries.userId, leagueMembers.userId))
    .leftJoin(entryRounds, eq(entryRounds.entryId, entries.id))
    .leftJoin(rounds, eq(rounds.id, entryRounds.roundId))
    .where(eq(leagueMembers.leagueId, leagueId))
    .groupBy(leagueMembers.userId, leagueMembers.joinedAt)
    .orderBy(desc(pointsExpr), desc(bestRoundExpr), asc(leagueMembers.joinedAt));
  return { league, rows };
}

export const LEAGUE_RANKING_PAGE_SIZE = 50;

/**
 * Ranking de una liga, paginado: una liga viral grande puede tener cientos de
 * miembros y antes se traían y renderizaban todos de una. `page` es 1-based.
 */
export async function getLeagueRanking(code: string, page = 1, singleRoundOrder?: number) {
  const league = (
    await db.select().from(leagues).where(eq(leagues.code, code.toUpperCase())).limit(1)
  )[0];
  if (!league) return null;

  // Instancia de arranque: la liga solo suma entryRounds.points desde esta fecha
  // (por su `order`) en adelante. null = desde el inicio (startOrder = 1 = cuenta
  // todo, equivalente a entries.totalPoints).
  let startOrder = 1;
  let scoringStart: { roundId: number; name: string } | null = null;
  if (league.scoringStartRoundId != null) {
    const sr = (
      await db
        .select({ order: rounds.order, name: rounds.name })
        .from(rounds)
        .where(eq(rounds.id, league.scoringStartRoundId))
        .limit(1)
    )[0];
    if (sr) {
      startOrder = sr.order;
      scoringStart = { roundId: league.scoringStartRoundId, name: sr.name };
    }
  }

  // Vista "por fecha": en vez de acumular desde startOrder, rankea solo por los
  // puntos de UNA fecha (su `order`). Se ignora si la fecha cae antes del arranque
  // de la liga (no puntúa) — eso lo filtra quien llama, vía las fechas publicadas
  // dentro de la ventana de la liga.
  const useSingleRound = singleRoundOrder != null;
  // Condición de "fecha dentro de la ventana": una sola fecha (vista por fecha) o todo
  // desde startOrder en adelante (acumulado). OJO: no usar una cota superior numérica
  // (p.ej. Number.MAX_SAFE_INTEGER) — `rounds.order` es int4 y Postgres castea el literal
  // a int32, que se desborda (error 22003 / pg_strtoint32_safe).
  const inWindow = useSingleRound
    ? sql`${rounds.order} = ${singleRoundOrder}`
    : sql`${rounds.order} >= ${startOrder}`;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.id));
  const total = Number(count);

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * LEAGUE_RANKING_PAGE_SIZE;

  // Suma por miembro de los puntos de sus fechas desde startOrder en adelante.
  // Miembro sin entry o sin fechas en rango → 0.
  const pointsExpr = sql<number>`coalesce(sum(case when ${inWindow} then ${entryRounds.points} else 0 end), 0)`;
  // Desempate (decisión del dueño, ver docs/legal/BASES-Y-CONDICIONES.md): a igualdad
  // de puntos totales gana quien tuvo el MEJOR puntaje en una sola fecha dentro de la
  // ventana de la liga; si siguen iguales, la inscripción más temprana (joinedAt).
  // `else null` excluye fechas fuera de rango; sentinela bajo para que el null ordene último.
  const bestRoundExpr = sql<number>`coalesce(max(case when ${inWindow} then ${entryRounds.points} end), -1000000)`;
  const rows = await db
    .select({
      userId: leagueMembers.userId,
      username: users.username,
      entryName: entries.name,
      totalPoints: pointsExpr,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .leftJoin(entries, eq(entries.userId, users.id))
    .leftJoin(entryRounds, eq(entryRounds.entryId, entries.id))
    .leftJoin(rounds, eq(rounds.id, entryRounds.roundId))
    .where(eq(leagueMembers.leagueId, league.id))
    .groupBy(leagueMembers.userId, users.username, entries.name, leagueMembers.joinedAt)
    .orderBy(desc(pointsExpr), desc(bestRoundExpr), asc(leagueMembers.joinedAt))
    .limit(LEAGUE_RANKING_PAGE_SIZE)
    .offset(offset);

  return {
    league,
    rows,
    total,
    page: safePage,
    pageSize: LEAGUE_RANKING_PAGE_SIZE,
    scoringStart,
    startOrder,
    singleRoundOrder: useSingleRound ? singleRoundOrder : null,
  };
}

/**
 * Puesto de un usuario DENTRO de una liga, para pinearlo arriba del ranking
 * (como "Tu posición") aunque esté en una página lejana. Respeta la misma vista
 * que el ranking: acumulado desde `startOrder`, o una sola fecha (`singleRoundOrder`).
 * Rank = 1 + miembros con MÁS puntos (mismo criterio que el orden de la tabla;
 * los desempates finos no afectan el número de puesto mostrado). Devuelve null si
 * el usuario no es miembro.
 */
export async function getLeagueUserStanding(
  leagueId: number,
  userId: number,
  startOrder: number,
  singleRoundOrder?: number | null,
): Promise<{ rank: number; points: number; username: string | null; entryName: string | null } | null> {
  // Misma ventana que el ranking; sin cota superior numérica (rounds.order es int4 →
  // un literal tipo Number.MAX_SAFE_INTEGER desborda el int32 y rompe la query).
  const inWindow =
    singleRoundOrder != null
      ? sql`${rounds.order} = ${singleRoundOrder}`
      : sql`${rounds.order} >= ${startOrder}`;
  const ptsExpr = sql<number>`coalesce(sum(case when ${inWindow} then ${entryRounds.points} else 0 end), 0)`;

  // Puntos (y datos) del usuario en la vista actual.
  const meRow = (
    await db
      .select({ userId: leagueMembers.userId, username: users.username, entryName: entries.name, points: ptsExpr })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .leftJoin(entries, eq(entries.userId, users.id))
      .leftJoin(entryRounds, eq(entryRounds.entryId, entries.id))
      .leftJoin(rounds, eq(rounds.id, entryRounds.roundId))
      .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
      .groupBy(leagueMembers.userId, users.username, entries.name)
      .limit(1)
  )[0];
  if (!meRow) return null;

  // Cuántos miembros tienen MÁS puntos que el usuario en la misma vista.
  const aheadRows = await db
    .select({ userId: leagueMembers.userId, points: ptsExpr })
    .from(leagueMembers)
    .leftJoin(entries, eq(entries.userId, leagueMembers.userId))
    .leftJoin(entryRounds, eq(entryRounds.entryId, entries.id))
    .leftJoin(rounds, eq(rounds.id, entryRounds.roundId))
    .where(eq(leagueMembers.leagueId, leagueId))
    .groupBy(leagueMembers.userId)
    .having(gt(ptsExpr, meRow.points));

  return {
    rank: aheadRows.length + 1,
    points: meRow.points,
    username: meRow.username,
    entryName: meRow.entryName,
  };
}

/**
 * Lista completa de miembros de una liga (sin paginar): la usa LeagueManagement
 * para que el dueño pueda expulsar a cualquiera, no solo a los de la página
 * visible del ranking. Es owner-only y on-demand, no el camino caliente.
 */
export async function getLeagueMembersForManagement(leagueId: number) {
  return db
    .select({ userId: leagueMembers.userId, username: users.username, entryName: entries.name })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .leftJoin(entries, eq(entries.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId));
}

export async function getLineupPlayers(entryRoundId: number) {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      price: players.price,
      isStarter: entryRoundPlayers.isStarter,
      slot: entryRoundPlayers.slot,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      code: countries.code,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(entryRoundPlayers)
    .innerJoin(players, eq(entryRoundPlayers.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(entryRoundPlayers.entryRoundId, entryRoundId));
  return rows.map((p) => ({ ...p, countryName: countryEs(p.countryName) }));
}

/**
 * Desglose por jugador de la fecha de un equipo, para "Puntos por fecha".
 * Solo devuelve detalle si la fecha está `published`. Verifica que el entryRound
 * sea del usuario. El cómputo (reusando la lógica real de scoring) vive en
 * lib/scoring/desglose.ts; acá solo se traen los datos.
 */
export async function getRoundBreakdown(
  entryRoundId: number,
  userId: number,
): Promise<RoundBreakdown | null> {
  const er = (
    await db
      .select({
        roundId: entryRounds.roundId,
        captainPlayerId: entryRounds.captainPlayerId,
        coachId: entryRounds.coachId,
        ownerId: entries.userId,
        roundStatus: rounds.status,
      })
      .from(entryRounds)
      .innerJoin(entries, eq(entryRounds.entryId, entries.id))
      .innerJoin(rounds, eq(entryRounds.roundId, rounds.id))
      .where(eq(entryRounds.id, entryRoundId))
      .limit(1)
  )[0];
  if (!er || er.ownerId !== userId) return null;
  if (er.roundStatus !== "published") return { published: false };

  const lineup = await db
    .select({
      playerId: entryRoundPlayers.playerId,
      isStarter: entryRoundPlayers.isStarter,
      slot: entryRoundPlayers.slot,
      name: players.name,
      position: players.position,
      countryName: countries.name,
      flagUrl: countries.flagUrl,
      code: countries.code,
      eliminatedRound: countries.eliminatedRound,
    })
    .from(entryRoundPlayers)
    .innerJoin(players, eq(entryRoundPlayers.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(entryRoundPlayers.entryRoundId, entryRoundId));

  const ms = await db
    .select({
      id: matches.id,
      homeCountryId: matches.homeCountryId,
      awayCountryId: matches.awayCountryId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homePenalties: matches.homePenalties,
      awayPenalties: matches.awayPenalties,
    })
    .from(matches)
    .where(eq(matches.roundId, er.roundId));

  const playerIds = lineup.map((l) => l.playerId);
  const matchIds = ms.map((m) => m.id);
  const stats =
    playerIds.length && matchIds.length
      ? await db
          .select({
            playerId: playerMatchStats.playerId,
            minutes: playerMatchStats.minutes,
            rating: playerMatchStats.rating,
            goals: playerMatchStats.goals,
            penaltyGoals: playerMatchStats.penaltyGoals,
            assists: playerMatchStats.assists,
            yellow: playerMatchStats.yellow,
            red: playerMatchStats.red,
            ownGoals: playerMatchStats.ownGoals,
            penaltiesSaved: playerMatchStats.penaltiesSaved,
            penaltiesMissed: playerMatchStats.penaltiesMissed,
            goalsConceded: playerMatchStats.goalsConceded,
            cleanSheet: playerMatchStats.cleanSheet,
            isMotm: playerMatchStats.isMotm,
          })
          .from(playerMatchStats)
          .where(
            and(
              inArray(playerMatchStats.playerId, playerIds),
              inArray(playerMatchStats.matchId, matchIds),
            ),
          )
      : [];

  const coach =
    er.coachId != null
      ? (
          await db
            .select({
              name: coaches.name,
              countryId: coaches.countryId,
              countryName: countries.name,
              flagUrl: countries.flagUrl,
              code: countries.code,
            })
            .from(coaches)
            .innerJoin(countries, eq(coaches.countryId, countries.id))
            .where(eq(coaches.id, er.coachId))
            .limit(1)
        )[0] ?? null
      : null;

  return buildRoundBreakdown({
    captainPlayerId: er.captainPlayerId,
    lineup: lineup.map((l) => ({ ...l, position: l.position as Position, countryName: countryEs(l.countryName) })),
    stats,
    matches: ms,
    coach: coach ? { ...coach, countryName: countryEs(coach.countryName) } : null,
  });
}

export async function getActiveProducts() {
  // Solo packs de pines: se excluyen los productos de ENTRADA a copas premium
  // (entryLeagueId != null), que no van en la tienda de pines (/pines) — esos se
  // pagan desde la inscripción a la Copa (createEntryOrder), no acreditan pines.
  return db
    .select()
    .from(products)
    .where(and(eq(products.active, true), isNull(products.entryLeagueId)))
    .orderBy(asc(products.pins));
}
