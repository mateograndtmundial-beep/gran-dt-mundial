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
  // Saldo actual del usuario (suma del ledger), como subconsulta reusable.
  const balance = sql`(select coalesce(sum(${pinTransactions.delta}), 0) from ${pinTransactions} where ${pinTransactions.userId} = ${userId})`;
  const debit = db.insert(pinTransactions).values({
    userId,
    // Si el saldo alcanza, debita -delta. Si NO alcanza, fuerza una división por cero
    // que aborta TODO el batch (no se guarda la alineación sin cobrar ni queda saldo
    // negativo); saveLineup mapea ese error a "pins".
    //
    // ⚠️ El divisor de la rama `else` DEBE depender de una subconsulta (acá `balance -
    // balance` = 0). NO usar el literal `1 / 0`: Postgres constant-foldea las
    // expresiones constantes en tiempo de PLANEACIÓN, así que `1 / 0` lanza el error
    // SIEMPRE —incluso cuando el saldo alcanza y nunca se entra al `else`—, lo que
    // rompía TODO gasto de pines (ningún débito llegaba a concretarse). Al derivar el
    // cero de una subconsulta, el planner no puede pre-evaluarlo y el error ocurre
    // solo en runtime cuando realmente no hay saldo.
    delta: sql<number>`case when ${balance} >= ${delta} then ${-delta} else ${delta} / (${balance} - ${balance}) end`,
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
