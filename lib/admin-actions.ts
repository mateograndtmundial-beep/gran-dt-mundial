"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, matches, playerMatchStats, countries, rounds } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { syncRound } from "@/lib/api-football/sync";
import { publishRound } from "@/lib/scoring/publicar-fecha";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import { chunkedBatch as runChunked, type BatchOp } from "@/lib/db/batch";
import { clamp, round1 } from "@/lib/pricing/map";
import { PRICING } from "@/lib/game/config";
import { notifyRoundPublished, notifyRoundSynced, notifyError } from "@/lib/notify/slack";

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
    }
    return { ok: true as const, info: `${r.entries} equipos · ${r.players} jugadores` };
  } catch (e) {
    logAdmin("publishRound", admin.id, { roundId, ok: false, error: (e as Error).message });
    notifyError({ source: "publishRound", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
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
    const cleanSheet = finished ? concededTeam === 0 : false;
    const isMotm = input.motmPlayerId === r.playerId;
    const rating =
      r.rating == null || !Number.isFinite(Number(r.rating))
        ? null
        : Math.max(0, Math.min(10, Number(r.rating)));

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
      goalsConceded: concededTeam,
      cleanSheet,
      isMotm,
      isCaptain: false,
      ...stat,
    });

    const values = {
      playerId: r.playerId,
      matchId: m.id,
      ...stat,
      goalsConceded: p.position === "GK" ? concededTeam : 0,
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
  return { ok: true as const, info: "Fecha despublicada. Revisá y volvé a publicar." };
}
