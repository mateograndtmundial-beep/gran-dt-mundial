"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, matches, playerMatchStats, countries, rounds, leagues, leagueMembers, products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCopaStanding } from "@/lib/queries";
import { syncRound, syncMatch } from "@/lib/api-football/sync";
import { publishRound } from "@/lib/scoring/publicar-fecha";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import { chunkedBatch as runChunked, type BatchOp } from "@/lib/db/batch";
import { clamp, round1 } from "@/lib/pricing/map";
import { PRICING } from "@/lib/game/config";
import { notifyRoundPublished, notifyRoundSynced, notifyError } from "@/lib/notify/slack";
import { postPendingRecaps, postMatchRecap } from "@/lib/stories/recap";
import { postRoundRecap } from "@/lib/stories/round-recap";
import { postPendingScoreboards } from "@/lib/stories/scoreboard";
import { closeBrowser } from "@/lib/stories/render";

/** Devuelve el usuario admin actual, o null si no autenticado / no admin. */
async function currentAdmin() {
  const u = await getCurrentUser();
  return u && u.isAdmin ? u : null;
}

/** Log estructurado de acciones de admin (auditoría mínima en stdout). */
function logAdmin(action: string, userId: number | null, data: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: "admin", action, userId, ...data }));
}

export async function syncRoundAction(roundId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false as const, error: "fecha inválida" };
  try {
    const r = await syncRound(roundId);
    logAdmin("syncRound", admin.id, { roundId, matches: r.matches, ok: true });
    notifyRoundSynced({ roundId, matches: r.matches, source: "admin" });
    revalidatePath("/admin");
    revalidatePath(`/admin/fecha/${roundId}`);
    return { ok: true as const, info: `${r.matches} partidos sincronizados` };
  } catch (e) {
    logAdmin("syncRound", admin.id, { roundId, ok: false, error: (e as Error).message });
    notifyError({ source: "syncRound", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  }
}

/**
 * Genera y postea a #SOCIAL las stories de los partidos terminados con stats que
 * aún no se postearon. Mismo resultado que el cron (postPendingRecaps), disparado
 * a mano desde /admin. Idempotente.
 */
export async function generateRecapsAction() {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  try {
    const { posted, skipped } = await postPendingRecaps();
    logAdmin("generateRecaps", admin.id, { posted, skipped, ok: true });
    return {
      ok: true as const,
      info: posted
        ? `${posted} story(s) a #SOCIAL${skipped ? ` · ${skipped} omitida(s)` : ""}`
        : skipped
          ? `Sin novedades · ${skipped} partido(s) aún sin stats`
          : "No hay partidos terminados pendientes",
    };
  } catch (e) {
    logAdmin("generateRecaps", admin.id, { ok: false, error: (e as Error).message });
    notifyError({ source: "generateRecaps", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  } finally {
    // No dejar el navegador compartido colgado entre requests: si se congela el
    // Lambda y muere su chromium, el próximo render reusaría uno stale y fallaría
    // con "Target page... has been closed". Cerrarlo acá lo evita de raíz.
    await closeBrowser();
  }
}

/**
 * Genera y postea a #SOCIAL los carruseles de puntajes (portada + tabla por equipo
 * + leyenda) por grupo/fecha (grupos) o por partido (eliminatorias) que aún no se
 * postearon. Mismo resultado que el cron (postPendingScoreboards). Idempotente.
 */
export async function generateScoreboardsAction() {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  try {
    const { posted, skipped } = await postPendingScoreboards();
    logAdmin("generateScoreboards", admin.id, { posted, skipped, ok: true });
    return {
      ok: true as const,
      info: posted
        ? `${posted} carrusel(es) a #SOCIAL${skipped ? ` · ${skipped} omitido(s)` : ""}`
        : skipped
          ? `Sin novedades · ${skipped} unidad(es) aún sin stats`
          : "No hay grupos/partidos pendientes",
    };
  } catch (e) {
    logAdmin("generateScoreboards", admin.id, { ok: false, error: (e as Error).message });
    notifyError({ source: "generateScoreboards", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  } finally {
    await closeBrowser();
  }
}

/**
 * Genera y postea a #SOCIAL la story de UN partido, SIEMPRE (re-trigger forzado,
 * aunque ya se haya posteado), mientras tenga stats cargadas. Disparo manual por
 * partido desde /admin/fecha/[id].
 */
export async function generateMatchRecapAction(matchId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(matchId) || matchId <= 0) return { ok: false as const, error: "partido inválido" };
  try {
    const ok = await postMatchRecap(matchId);
    logAdmin("generateMatchRecap", admin.id, { matchId, ok });
    if (!ok) return { ok: false as const, error: "el partido todavía no tiene stats cargadas" };
    return { ok: true as const, info: "story posteada a #SOCIAL" };
  } catch (e) {
    logAdmin("generateMatchRecap", admin.id, { matchId, ok: false, error: (e as Error).message });
    notifyError({ source: "generateMatchRecap", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  } finally {
    await closeBrowser();
  }
}

export async function syncMatchAction(matchId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(matchId) || matchId <= 0) return { ok: false as const, error: "partido inválido" };
  try {
    const r = await syncMatch(matchId);
    if (!r.ok) {
      logAdmin("syncMatch", admin.id, { matchId, ok: false, error: r.error });
      return { ok: false as const, error: r.error };
    }
    logAdmin("syncMatch", admin.id, { matchId, ok: true });
    revalidatePath(`/admin/partido/${matchId}`);
    return { ok: true as const, info: "partido sincronizado" };
  } catch (e) {
    logAdmin("syncMatch", admin.id, { matchId, ok: false, error: (e as Error).message });
    notifyError({ source: "syncMatch", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function updatePlayerPrice(playerId: number, price: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(playerId) || playerId <= 0) return { ok: false as const, error: "jugador inválido" };
  if (!Number.isFinite(price)) return { ok: false as const, error: "precio inválido" };
  const p = round1(clamp(price, PRICING.MIN, PRICING.MAX));
  // priceManual: marca el precio como fijado a mano para que `prices:apply` no lo pise.
  await db.update(players).set({ price: p, priceManual: true }).where(eq(players.id, playerId));
  logAdmin("updatePlayerPrice", admin.id, { playerId, price: p });
  revalidatePath("/admin/precios");
  revalidatePath("/jugadores");
  revalidatePath("/equipo");
  // El plantel está cacheado (getPlayersWithCountry, tag `players`); revalidatePath
  // no invalida el Data Cache, así que el precio nuevo quedaría stale sin esto.
  revalidateTag("players", "max");
  return { ok: true as const, price: p };
}

export async function publishRoundAction(roundId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false as const, error: "fecha inválida" };
  try {
    const r = await publishRound(roundId);
    logAdmin("publishRound", admin.id, { roundId, entries: r.entries, players: r.players, ok: true });
    revalidatePath("/admin");
    revalidatePath("/ranking");
    // No notificamos si la fecha ya estaba publicada (reintento idempotente → 0 equipos).
    if (!("alreadyPublished" in r)) {
      notifyRoundPublished({ roundId, entries: r.entries, players: r.players });
      // Auto-posteo del carrusel de resumen (aviso + Top 3 + Mejor XI) a #SOCIAL.
      // Best-effort: un fallo de render/Slack NO marca el publish como fallido
      // (ya se publicó). Re-postear a mano con el botón si hiciera falta.
      try {
        await postRoundRecap(roundId);
        logAdmin("publishRound:recap", admin.id, { roundId, ok: true });
      } catch (e) {
        logAdmin("publishRound:recap", admin.id, { roundId, ok: false, error: (e as Error).message });
        notifyError({ source: "publishRound:recap", message: (e as Error).message });
      }
    }
    return { ok: true as const, info: `${r.entries} equipos · ${r.players} jugadores` };
  } catch (e) {
    logAdmin("publishRound", admin.id, { roundId, ok: false, error: (e as Error).message });
    notifyError({ source: "publishRound", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  } finally {
    // El publish postea el carrusel de resumen (render) → cerrar el navegador.
    await closeBrowser();
  }
}

/**
 * Postea (o re-postea) a #SOCIAL el carrusel de resumen de una fecha publicada:
 * aviso "ya están los puntos" + Top 3 (fecha + global) + Mejor XI. Disparo manual
 * desde /admin; el auto-posteo ya corre solo al publicar.
 */
export async function postRoundRecapAction(roundId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false as const, error: "fecha inválida" };
  try {
    const ok = await postRoundRecap(roundId);
    logAdmin("postRoundRecap", admin.id, { roundId, ok });
    if (!ok) return { ok: false as const, error: "la fecha todavía no tiene puntos publicados" };
    return { ok: true as const, info: "resumen (3 imágenes) posteado a #SOCIAL" };
  } catch (e) {
    logAdmin("postRoundRecap", admin.id, { roundId, ok: false, error: (e as Error).message });
    notifyError({ source: "postRoundRecap", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  } finally {
    await closeBrowser();
  }
}

export type StatRowInput = {
  playerId: number;
  minutes: number;
  rating: number | null;
  goals: number;
  penaltyGoals: number;
  assists: number;
  yellow: number;
  red: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  // Goles recibidos por su equipo MIENTRAS estuvo en cancha (para la valla invicta
  // y el −1 del arquero, calculados a nivel jugador). Si es null/undefined se usa
  // el total del rival (default a nivel equipo, igual que el marcador).
  goalsConceded?: number | null;
};

export type SaveMatchInput = {
  matchId: number;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  motmPlayerId: number | null;
  rows: StatRowInput[];
};

const int = (n: unknown, min = 0): number => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) && v >= min ? Math.trunc(v) : 0;
};

/**
 * Guarda/edita a mano las stats de un partido. Recalcula fantasyPoints con la
 * misma lógica que el sync (calcularPuntos), marca las filas como manualEdit
 * (para que un re-sync no las pise) y actualiza marcador, penales y figura.
 */
export async function saveMatchStats(input: SaveMatchInput) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(input.matchId) || input.matchId <= 0) return { ok: false as const, error: "partido inválido" };

  const m = (await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1))[0];
  if (!m) return { ok: false as const, error: "partido no existe" };
  if (m.homeCountryId == null || m.awayCountryId == null) {
    return { ok: false as const, error: "el partido no tiene selecciones asignadas" };
  }

  // Validación server-side: posición y país de cada jugador enviado.
  const ids = [...new Set(input.rows.map((r) => r.playerId))].filter((id) => Number.isInteger(id) && id > 0);
  const ps = ids.length
    ? await db
        .select({ id: players.id, position: players.position, countryId: players.countryId })
        .from(players)
        .where(inArray(players.id, ids))
    : [];
  const pmap = new Map(ps.map((p) => [p.id, p]));

  const homeScore = input.homeScore == null ? null : int(input.homeScore);
  const awayScore = input.awayScore == null ? null : int(input.awayScore);
  const finished = homeScore != null && awayScore != null;

  const ops: BatchOp[] = [];
  let saved = 0;
  for (const r of input.rows) {
    const p = pmap.get(r.playerId);
    if (!p) continue; // jugador inexistente
    if (p.countryId !== m.homeCountryId && p.countryId !== m.awayCountryId) continue; // no es de este partido
    const isHome = p.countryId === m.homeCountryId;
    const concededTeam = isHome ? awayScore ?? 0 : homeScore ?? 0;
    // Valla invicta a nivel jugador: si el admin mandó los goles recibidos estando
    // en cancha, se usan; si no, se cae al total del equipo (marcador del rival).
    const conceded =
      r.goalsConceded == null ? concededTeam : Math.max(0, Math.min(concededTeam, int(r.goalsConceded)));
    const cleanSheet = finished ? conceded === 0 : false;
    const isMotm = input.motmPlayerId === r.playerId;
    // El rating se procesa como ENTERO en todo el juego (clamp 0-10 + redondeo).
    const rating =
      r.rating == null || !Number.isFinite(Number(r.rating))
        ? null
        : Math.round(Math.max(0, Math.min(10, Number(r.rating))));

    const stat = {
      minutes: int(r.minutes),
      goals: int(r.goals),
      penaltyGoals: int(r.penaltyGoals),
      assists: int(r.assists),
      yellow: int(r.yellow),
      red: int(r.red),
      ownGoals: int(r.ownGoals),
      penaltiesSaved: int(r.penaltiesSaved),
      penaltiesMissed: int(r.penaltiesMissed),
    };

    const bd = calcularPuntos({
      position: p.position,
      rating,
      goalsConceded: conceded,
      cleanSheet,
      isMotm,
      isCaptain: false,
      ...stat,
    });

    const values = {
      playerId: r.playerId,
      matchId: m.id,
      ...stat,
      goalsConceded: p.position === "GK" ? conceded : 0,
      cleanSheet,
      rating,
      isMotm,
      fantasyPoints: bd.total,
      manualEdit: true,
    };
    ops.push(
      db
        .insert(playerMatchStats)
        .values(values)
        .onConflictDoUpdate({ target: [playerMatchStats.playerId, playerMatchStats.matchId], set: values }),
    );
    saved++;
  }

  ops.push(
    db
      .update(matches)
      .set({
        homeScore,
        awayScore,
        homePenalties: input.homePenalties == null ? null : int(input.homePenalties),
        awayPenalties: input.awayPenalties == null ? null : int(input.awayPenalties),
        motmPlayerId: input.motmPlayerId,
        status: finished ? "finished" : m.status,
      })
      .where(eq(matches.id, m.id)),
  );

  await runChunked(ops);
  logAdmin("saveMatchStats", admin.id, { matchId: m.id, rows: saved });
  revalidatePath(`/admin/partido/${m.id}`);
  revalidatePath(`/admin/fecha/${m.roundId}`);
  // Si la fecha ya estaba publicada, las stats acumuladas (getPlayerTournamentStats)
  // cambiaron → invalidar su caché para que /jugadores y /equipo no queden viejos.
  revalidateTag("player-stats", "max");
  return { ok: true as const, saved };
}

/**
 * Despublica una fecha para poder corregir y volver a publicar: la pone "open" y
 * limpia las eliminaciones de ESTA fecha (se re-aplican al publicar de nuevo). Los
 * puntos quedan como están hasta que se vuelve a publicar (recalcula todo).
 */
export async function unpublishRound(roundId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false as const, error: "fecha inválida" };
  const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
  if (!round) return { ok: false as const, error: "fecha no existe" };
  if (round.status !== "published") return { ok: true as const, info: "la fecha no estaba publicada" };

  await db.batch([
    db.update(rounds).set({ status: "open" }).where(eq(rounds.id, roundId)),
    db.update(countries).set({ eliminatedRound: null }).where(eq(countries.eliminatedRound, round.order)),
  ]);
  logAdmin("unpublishRound", admin.id, { roundId });
  revalidatePath("/admin");
  revalidatePath(`/admin/fecha/${roundId}`);
  revalidatePath("/ranking");
  // La fecha sale de "published" → ya no cuenta en las stats acumuladas; invalidar.
  revalidateTag("player-stats", "max");
  // Los puntos acumulados y el estado "torneo terminado" (isTournamentFinished) se
  // derivan de las fechas publicadas → al despublicar hay que invalidarlos también,
  // si no el sitio queda mostrando el ranking viejo y/o el modo de cierre.
  revalidateTag("leaderboard", "max");
  revalidateTag("global-rank", "max");
  return { ok: true as const, info: "Fecha despublicada. Revisá y volvé a publicar." };
}

// ---------- Copas premium (GOLDEN TICKET) ----------

const COPA_STATUSES = ["draft", "open", "full", "closed"] as const;
type CopaStatus = (typeof COPA_STATUSES)[number];

/**
 * Abre/cierra una copa premium a mano (fallback de la auto-activación: abrir la copa
 * de reserva, cerrar por tiempo, o reabrir un cupo). El flujo normal (llenarse →
 * activar la siguiente) es automático en enrollInLeague; esto es el control manual.
 */
export async function setCopaStatus(leagueId: number, status: string) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(leagueId) || leagueId <= 0) return { ok: false as const, error: "copa inválida" };
  if (!COPA_STATUSES.includes(status as CopaStatus)) return { ok: false as const, error: "estado inválido" };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league || league.kind !== "golden_ticket") return { ok: false as const, error: "no es una copa premium" };

  await db.update(leagues).set({ status }).where(eq(leagues.id, leagueId));
  logAdmin("setCopaStatus", admin.id, { leagueId, status });
  revalidatePath("/admin");
  revalidatePath("/ligas");
  revalidatePath("/copa");
  return { ok: true as const, info: `Copa ${league.name} → ${status}` };
}

/**
 * Activa/desactiva el PRODUCTO DE ENTRADA de una copa (`products.active`). active=true
 * habilita el cobro real por Mercado Pago (createEntryOrder exige el producto activo);
 * active=false lo gatea. Es el control del "play" del cobro, sin SQL manual — usar al
 * go-live (con visto legal) y para apagarlo si hace falta. Ver docs/MONETIZACION.md.
 */
export async function setCopaEntryActive(leagueId: number, active: boolean) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(leagueId) || leagueId <= 0) return { ok: false as const, error: "copa inválida" };
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1))[0];
  if (!league || league.kind !== "golden_ticket") return { ok: false as const, error: "no es una copa premium" };

  const updated = await db
    .update(products)
    .set({ active })
    .where(eq(products.entryLeagueId, leagueId))
    .returning({ id: products.id });
  if (updated.length === 0) return { ok: false as const, error: "la copa no tiene producto de entrada" };

  logAdmin("setCopaEntryActive", admin.id, { leagueId, active });
  revalidatePath("/admin");
  revalidatePath("/copa");
  revalidatePath("/ligas");
  return { ok: true as const, info: active ? "Entrada ACTIVADA (ya se puede pagar)" : "Entrada desactivada" };
}

/**
 * Congela el ranking final de una copa para el payout: recalcula las posiciones con el
 * desempate oficial (mejor pico de fecha → inscripción más temprana) y las escribe en
 * leagueMembers.currentRank. Se corre UNA vez, después de publicar la Final. Ver
 * docs/legal/BASES-Y-CONDICIONES.md (momento de corte).
 */
export async function snapshotCopaRanking(leagueId: number) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(leagueId) || leagueId <= 0) return { ok: false as const, error: "copa inválida" };
  const standing = await getCopaStanding(leagueId);
  if (!standing) return { ok: false as const, error: "copa no existe" };
  if (standing.league.kind !== "golden_ticket") return { ok: false as const, error: "no es una copa premium" };

  const ops = standing.rows.map((row, i) =>
    db
      .update(leagueMembers)
      .set({ currentRank: i + 1 })
      .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, row.userId))),
  ) as unknown as BatchOp[];
  if (ops.length) await runChunked(ops);

  logAdmin("snapshotCopaRanking", admin.id, { leagueId, members: standing.rows.length });
  notifyError({
    source: "golden_ticket",
    message: `Snapshot del ranking de la copa ${leagueId} congelado: ${standing.rows.length} puestos. Revisá el top 10 para el payout.`,
  });
  revalidatePath("/admin");
  return { ok: true as const, info: `${standing.rows.length} puestos congelados` };
}
