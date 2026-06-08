import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pinTransactions, users } from "@/lib/db/schema";

/** Mensaje del error de Postgres que usamos como señal de saldo insuficiente. */
export const PIN_INSUFFICIENT_MARK = "division by zero";

/**
 * Ops de batch para mover pines dentro de la MISMA transacción que el guardado de la
 * alineación (clave para que el ledger y `entryRounds.pinsSpent` queden consistentes
 * aunque algo falle).
 *
 * - delta < 0 → reembolso: acredita -delta pines (sin chequeo de saldo).
 * - delta > 0 → débito atómico y libre de carrera:
 *     1. `select ... for update` bloquea la fila del usuario → serializa débitos
 *        concurrentes del mismo usuario (evita el write-skew del saldo).
 *     2. el insert calcula el saldo y, si NO alcanza, fuerza `1/0` (division_by_zero)
 *        que aborta TODO el batch — así la alineación no se guarda sin cobrar y el
 *        saldo nunca queda negativo. saveLineup mapea ese error a "pins".
 *
 * Se devuelven como RunnableQuery para poder pasarlas a db.batch (db.execute no es
 * batcheable en neon-http).
 */
export function pinMovementOps(userId: number, delta: number, roundId: number) {
  if (delta < 0) {
    return [
      db.insert(pinTransactions).values({ userId, delta: -delta, reason: "transfer", roundId }),
    ];
  }
  const lock = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
  const debit = db.insert(pinTransactions).values({
    userId,
    delta: sql<number>`case when (select coalesce(sum(${pinTransactions.delta}), 0) from ${pinTransactions} where ${pinTransactions.userId} = ${userId}) >= ${delta} then ${-delta} else 1 / 0 end`,
    reason: "transfer",
    roundId,
  });
  return [lock, debit];
}

/** ¿El error de un batch fue por saldo de pines insuficiente (guard de pinMovementOps)? */
export function isInsufficientPinsError(e: unknown): boolean {
  return e instanceof Error && e.message.toLowerCase().includes(PIN_INSUFFICIENT_MARK);
}

/** ¿El error es una violación de constraint único de Postgres (código 23505)? */
export function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Error &&
    ("code" in e ? (e as { code?: string }).code === "23505" : /duplicate key value/i.test(e.message))
  );
}

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
