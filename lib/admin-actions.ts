"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { syncRound } from "@/lib/api-football/sync";
import { publishRound } from "@/lib/scoring/publicar-fecha";
import { clamp, round1 } from "@/lib/pricing/map";
import { PRICING } from "@/lib/game/config";

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
    revalidatePath("/admin");
    return { ok: true as const, info: `${r.matches} partidos sincronizados` };
  } catch (e) {
    logAdmin("syncRound", admin.id, { roundId, ok: false, error: (e as Error).message });
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
    return { ok: true as const, info: `${r.entries} equipos · ${r.players} jugadores` };
  } catch (e) {
    logAdmin("publishRound", admin.id, { roundId, ok: false, error: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  }
}
