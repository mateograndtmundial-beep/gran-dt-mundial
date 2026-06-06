"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { syncRound } from "@/lib/api-football/sync";
import { publishRound } from "@/lib/scoring/publicar-fecha";

async function isAdmin() {
  const u = await getCurrentUser();
  return !!u && u.isAdmin;
}

export async function syncRoundAction(roundId: number) {
  if (!(await isAdmin())) return { ok: false as const, error: "forbidden" };
  try {
    const r = await syncRound(roundId);
    revalidatePath("/admin");
    return { ok: true as const, info: `${r.matches} partidos sincronizados` };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function publishRoundAction(roundId: number) {
  if (!(await isAdmin())) return { ok: false as const, error: "forbidden" };
  try {
    const r = await publishRound(roundId);
    revalidatePath("/admin");
    revalidatePath("/ranking");
    return { ok: true as const, info: `${r.entries} equipos · ${r.players} jugadores` };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
