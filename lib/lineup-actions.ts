"use server";

import { getCurrentUser } from "@/lib/auth";
import { getOwnedRoundLineup } from "@/lib/queries";

/**
 * Alineación (jugadores + técnico) de una fecha del usuario, para navegar el
 * equipo fecha por fecha en /mi-equipo (lazy, al cambiar de fecha). Valida que
 * la fecha sea del usuario logueado (la query también lo chequea).
 */
export async function getRoundLineupAction(entryRoundId: number) {
  if (!Number.isInteger(entryRoundId) || entryRoundId <= 0) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  return getOwnedRoundLineup(entryRoundId, user.id);
}
