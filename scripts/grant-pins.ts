import "dotenv/config";
import { eq, sql, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { users, pinTransactions } from "../lib/db/schema";

/**
 * Regala pines a uno o más usuarios SIN tocar la contabilidad.
 *
 * Uso:
 *   npx tsx scripts/grant-pins.ts <cantidad> <username> [username2 ...]
 *   ej: npx tsx scripts/grant-pins.ts 10 bruno
 *
 * Cómo NO ensucia las finanzas ni #pagos:
 *   - Inserta SOLO una fila en `pin_transactions` con `reason = 'grant'`,
 *     `delta > 0` y SIN `orderId`/`roundId`.
 *   - El saldo del usuario es SUM(delta) del ledger → estos pines quedan
 *     usables inmediatamente, igual que los comprados.
 *   - El resumen financiero (`lib/reports/finance-digest.ts`) y #pagos leen
 *     de la tabla `orders` (status='paid'). Un grant NO crea ninguna orden →
 *     es invisible para ingresos, comisiones y breakeven.
 *   - La auditoría de pines (`scripts/audit-pins.ts`) chequea consistencia solo
 *     sobre `reason='transfer'`. Al usar `reason='grant'` no rompe ese balance
 *     (transfer == -pinsSpent sigue cuadrando).
 *
 * Es idempotente-friendly pero NO idempotente: cada corrida regala de nuevo.
 * READ-CAREFULLY: corre contra la DB de PRODUCCIÓN (misma Neon).
 */
async function main() {
  const amount = Number(process.argv[2]);
  const usernames = process.argv.slice(3).map((u) => u.trim()).filter(Boolean);

  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Cantidad inválida. Uso: npx tsx scripts/grant-pins.ts <cantidad> <username> [username2 ...]");
    process.exit(1);
  }
  if (usernames.length === 0) {
    console.error("Falta al menos un username. Uso: npx tsx scripts/grant-pins.ts <cantidad> <username> [...]");
    process.exit(1);
  }

  // Resolución case-insensitive de los usernames.
  const found = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(sql`lower(${users.username})`, usernames.map((u) => u.toLowerCase())));

  const foundByLower = new Map(found.map((u) => [(u.username ?? "").toLowerCase(), u]));
  const missing = usernames.filter((u) => !foundByLower.has(u.toLowerCase()));
  if (missing.length) {
    console.error(`No se encontraron estos usuarios: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Deduplicar por id (por si se pasa el mismo user dos veces).
  const targets = [...new Map(found.map((u) => [u.id, u])).values()];

  const balanceOf = async (userId: number): Promise<number> => {
    const r = await db
      .select({ total: sql<number>`coalesce(sum(${pinTransactions.delta}), 0)` })
      .from(pinTransactions)
      .where(eq(pinTransactions.userId, userId));
    return Number(r[0]?.total ?? 0);
  };

  console.log(`\nRegalando ${amount} pines (reason='grant') a ${targets.length} usuario(s):\n`);

  for (const u of targets) {
    const before = await balanceOf(u.id);
    await db.insert(pinTransactions).values({
      userId: u.id,
      delta: amount,
      reason: "grant",
      // sin orderId ni roundId → no toca #pagos ni finanzas.
    });
    const after = await balanceOf(u.id);
    console.log(`  ✓ ${u.username} (id ${u.id}): ${before} → ${after} pines`);
  }

  console.log("\nListo. Estos pines NO impactan #pagos ni el resumen financiero.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
