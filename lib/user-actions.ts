"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { validateUsernameFormat, type UsernameError } from "@/lib/username";

/** ¿Está libre el nickname? Compara case-insensitive, ignorando al propio usuario. */
async function isAvailable(username: string, exceptUserId?: number): Promise<boolean> {
  const conds = [sql`lower(${users.username}) = lower(${username})`];
  if (exceptUserId != null) conds.push(ne(users.id, exceptUserId));
  const hit = (await db.select({ id: users.id }).from(users).where(and(...conds)).limit(1))[0];
  return !hit;
}

/** Chequeo en vivo para el form de onboarding. */
export async function checkUsername(
  raw: string,
): Promise<{ ok: true } | { ok: false; error: UsernameError }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const fmt = validateUsernameFormat(raw);
  if (fmt) return { ok: false, error: fmt };
  if (!(await isAvailable(raw.trim(), user.id))) return { ok: false, error: "taken" };
  return { ok: true };
}

/** Setea el nickname único del usuario. */
export async function setUsername(
  raw: string,
): Promise<{ ok: true; username: string } | { ok: false; error: UsernameError }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };

  const username = raw.trim();
  const fmt = validateUsernameFormat(username);
  if (fmt) return { ok: false, error: fmt };
  if (!(await isAvailable(username, user.id))) return { ok: false, error: "taken" };

  try {
    await db.update(users).set({ username }).where(eq(users.id, user.id));
  } catch {
    // Carrera: dos requests tomando el mismo nick a la vez chocan contra el
    // índice único. El segundo cae acá.
    return { ok: false, error: "taken" };
  }

  revalidatePath("/", "layout");
  return { ok: true, username };
}
