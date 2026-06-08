"use server";

import { getCurrentUser } from "@/lib/auth";
import { getRoundBreakdown } from "@/lib/queries";
import type { RoundBreakdown } from "@/lib/scoring/desglose";

/**
 * Desglose por jugador de la fecha de un equipo (lazy, al expandir en /mi-equipo).
 * Valida que la fecha sea del usuario logueado (la query también lo chequea).
 */
export async function getRoundBreakdownAction(entryRoundId: number): Promise<RoundBreakdown | null> {
  if (!Number.isInteger(entryRoundId) || entryRoundId <= 0) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  return getRoundBreakdown(entryRoundId, user.id);
}
