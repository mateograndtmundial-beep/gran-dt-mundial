import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
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
} from "@/lib/db/schema";
import { buildRoundBreakdown, type RoundBreakdown } from "@/lib/scoring/desglose";
import type { Position } from "@/lib/game/config";
import { FREE_CHANGES_PER_ROUND, SCORING } from "@/lib/game/config";
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
export async function getPlayersWithCountryRaw() {
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

export async function getPlayersWithCountry() {
  const rows = await getPlayersWithCountryRaw();
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

// Mínimo de equipos en la fecha para mostrar ownership. Por debajo, un "100%"
// con 1 de 1 equipo es ruido/engañoso (típico pre-lanzamiento) → no se muestra.
export const MIN_OWNERSHIP_SAMPLE = 30;

/**
 * % de equipos que rostean a cada jugador en una fecha (la editable).
 * Denominador = equipos con alineación en esa fecha. Devuelve playerId -> % (0–100,
 * entero). Mapa vacío si el universo es menor a MIN_OWNERSHIP_SAMPLE (anti-ruido).
 * Cacheado con tag "player-ownership" (cambia al editar equipos, no solo al publicar)
 * + TTL corto.
 */
export const getPlayerOwnership = unstable_cache(
  async (roundId: number): Promise<Record<number, number>> => {
    const totalRows = await db
      .select({ total: sql<number>`count(distinct ${entryRounds.entryId})::int` })
      .from(entryRounds)
      .where(eq(entryRounds.roundId, roundId));
    const total = Number(totalRows[0]?.total) || 0;
    if (total < MIN_OWNERSHIP_SAMPLE) return {};

    const rows = await db
      .select({
        playerId: entryRoundPlayers.playerId,
        owners: sql<number>`count(distinct ${entryRounds.entryId})::int`,
      })
      .from(entryRoundPlayers)
      .innerJoin(entryRounds, eq(entryRoundPlayers.entryRoundId, entryRounds.id))
      .where(eq(entryRounds.roundId, roundId))
      .groupBy(entryRoundPlayers.playerId);

    const out: Record<number, number> = {};
    for (const r of rows) {
      const owners = Number(r.owners) || 0;
      // % crudo (1 decimal): el front decide "<1%" vs "N%". Los jugadores que no
      // aparecen acá (0 dueños) no entran al mapa → el front los muestra "<1%"
      // mientras haya datos (la fecha superó MIN_OWNERSHIP_SAMPLE).
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

export async function getCoaches() {
  const rows = await db
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
    .innerJoin(countries, eq(coaches.countryId, countries.id));
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
 * Fecha editable = la primera no publicada cuyo primer partido todavía no arrancó.
 * Su "deadline" es el kickoff de ese primer partido. Cuando ese partido empieza,
 * la fecha queda bloqueada y la editable pasa a la siguiente. Devuelve null si no
 * hay ninguna editable (todo arrancó/publicado → equipo bloqueado).
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
    const deadline = c.firstKickoff ? new Date(c.firstKickoff) : null;
    // Sin fixtures todavía (deadline null) = NO editable: evita que una ronda
    // sin fecha definida quede abierta indefinidamente.
    if (deadline && deadline > now) return { round: c.round, deadline };
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

export async function getGlobalLeaderboard(limit = 100, offset = 0) {
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
}

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
  | { state: "premium"; roundName: string; deadline: string }
  | { state: "unlimited"; roundName: string; deadline: string }
  | { state: "limited"; roundName: string; deadline: string; freeLeft: number; pinBalance: number };

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
  const deadline = editable.deadline.toISOString();
  if (isPremium) return { state: "premium", roundName, deadline };

  const editContext = await getEditContext(userId, editable.round.id, editable.round.order);
  if (editContext.baselinePlayerIds == null) return { state: "unlimited", roundName, deadline };

  // El cupo gratis restante sale de los cambios YA acumulados en la fecha
  // (`priorChanges`), no de un diff recalculado: el baseline es el equipo
  // confirmado, así que un diff daría siempre 0.
  const freeLeft = freeChangesLeft(editContext.priorChanges, FREE_CHANGES_PER_ROUND);
  const pinBalance = await getPinBalance(userId);
  return { state: "limited", roundName, deadline, freeLeft, pinBalance };
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
  if (!editable) return null;
  const msLeft = editable.deadline.getTime() - now.getTime();
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
    deadline: editable.deadline.toISOString(),
  };
}

export async function getMyLeagues(userId: number) {
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      code: leagues.code,
      isPublic: leagues.isPublic,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId));
}

export const LEAGUE_RANKING_PAGE_SIZE = 50;

/**
 * Ranking de una liga, paginado: una liga viral grande puede tener cientos de
 * miembros y antes se traían y renderizaban todos de una. `page` es 1-based.
 */
export async function getLeagueRanking(code: string, page = 1) {
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

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.id));
  const total = Number(count);

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * LEAGUE_RANKING_PAGE_SIZE;

  // Suma por miembro de los puntos de sus fechas desde startOrder en adelante.
  // Miembro sin entry o sin fechas en rango → 0.
  const pointsExpr = sql<number>`coalesce(sum(case when ${rounds.order} >= ${startOrder} then ${entryRounds.points} else 0 end), 0)`;
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
    .groupBy(leagueMembers.userId, users.username, entries.name)
    .orderBy(desc(pointsExpr), asc(leagueMembers.userId))
    .limit(LEAGUE_RANKING_PAGE_SIZE)
    .offset(offset);

  return { league, rows, total, page: safePage, pageSize: LEAGUE_RANKING_PAGE_SIZE, scoringStart };
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
  return db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.pins));
}
