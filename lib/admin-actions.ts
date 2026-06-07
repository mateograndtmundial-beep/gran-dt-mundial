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

async function isAdmin() {
  const u = await getCurrentUser();
  return !!u && u.isAdmin;
}

export async function syncRoundAction(roundId: number) {
  if (!(await isAdmin())) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false as const, error: "fecha inválida" };
  try {
    const r = await syncRound(roundId);
    revalidatePath("/admin");
    return { ok: true as const, info: `${r.matches} partidos sincronizados` };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function updatePlayerPrice(playerId: number, price: number) {
  if (!(await isAdmin())) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(playerId) || playerId <= 0) return { ok: false as const, error: "jugador inválido" };
  if (!Number.isFinite(price)) return { ok: false as const, error: "precio inválido" };
  const p = round1(clamp(price, PRICING.MIN, PRICING.MAX));
  // priceManual: marca el precio como fijado a mano para que `prices:apply` no lo pise.
  await db.update(players).set({ price: p, priceManual: true }).where(eq(players.id, playerId));
  revalidatePath("/admin/precios");
  revalidatePath("/jugadores");
  revalidatePath("/equipo");
  return { ok: true as const, price: p };
}

export async function publishRoundAction(roundId: number) {
  if (!(await isAdmin())) return { ok: false as const, error: "forbidden" };
  if (!Number.isInteger(roundId) || roundId <= 0) return { ok: false as const, error: "fecha inválida" };
  try {
    const r = await publishRound(roundId);
    revalidatePath("/admin");
    revalidatePath("/ranking");
    return { ok: true as const, info: `${r.entries} equipos · ${r.players} jugadores` };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
