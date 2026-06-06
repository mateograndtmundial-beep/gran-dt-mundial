import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pinTransactions } from "@/lib/db/schema";

/** Saldo de pines de un usuario (suma del ledger). */
export async function getPinBalance(userId: number): Promise<number> {
  const r = await db
    .select({ total: sql<number>`coalesce(sum(${pinTransactions.delta}), 0)` })
    .from(pinTransactions)
    .where(eq(pinTransactions.userId, userId));
  return Number(r[0]?.total ?? 0);
}

/** Registra un movimiento de pines (+comprados / −usados). */
export async function addPins(
  userId: number,
  delta: number,
  reason: "purchase" | "transfer" | "refund" | "grant",
  opts?: { orderId?: number; roundId?: number },
) {
  await db.insert(pinTransactions).values({
    userId,
    delta,
    reason,
    orderId: opts?.orderId ?? null,
    roundId: opts?.roundId ?? null,
  });
}
