import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

/**
 * Devuelve el usuario de nuestra DB (creándolo si es la primera vez),
 * o null si no hay sesión / Clerk no está configurado.
 */
export async function getCurrentUser() {
  if (!clerkEnabled) return null;
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (existing.length) return existing[0];

  const cu = await currentUser();
  const username = cu?.username ?? cu?.firstName ?? "DT";
  const inserted = await db.insert(users).values({ clerkId: userId, username }).returning();
  return inserted[0];
}
