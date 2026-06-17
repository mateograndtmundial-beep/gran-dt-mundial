import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { users, entries, entryRounds, pinTransactions } from "../lib/db/schema";

const FREE = 1; // FREE_CHANGES_PER_ROUND

/* READ-ONLY: audita la integridad del sistema de pines/cambios en prod.
   Uso: npx tsx scripts/audit-pins.ts */
async function main() {
  // ── 1) Ledger inconsistente: sum(transfer deltas) != -(sum pinsSpent) ──
  const transfers = await db
    .select({ userId: pinTransactions.userId, s: sql<number>`coalesce(sum(${pinTransactions.delta}),0)` })
    .from(pinTransactions)
    .where(eq(pinTransactions.reason, "transfer"))
    .groupBy(pinTransactions.userId);
  const transferByUser = new Map(transfers.map((t) => [t.userId, Number(t.s)]));
  const spent = await db
    .select({ userId: entries.userId, s: sql<number>`coalesce(sum(${entryRounds.pinsSpent}),0)` })
    .from(entryRounds)
    .innerJoin(entries, eq(entryRounds.entryId, entries.id))
    .groupBy(entries.userId);
  const ledgerBad: Array<{ userId: number; transferSum: number; pinsSpent: number; diff: number }> = [];
  for (const s of spent) {
    const transferSum = transferByUser.get(s.userId) ?? 0;
    const pinsSpent = Number(s.s);
    const diff = transferSum - -pinsSpent;
    if (diff !== 0) ledgerBad.push({ userId: s.userId, transferSum, pinsSpent, diff });
  }
  console.log(`\n[1] Ledger inconsistente (transfer ≠ -pinsSpent): ${ledgerBad.length}`);
  if (ledgerBad.length) console.table(ledgerBad);

  // ── 2) Saldos NEGATIVOS (overdraw) ──
  const balances = await db
    .select({ userId: pinTransactions.userId, balance: sql<number>`sum(${pinTransactions.delta})` })
    .from(pinTransactions)
    .groupBy(pinTransactions.userId);
  const negative = balances.filter((b) => Number(b.balance) < 0);
  console.log(`\n[2] Saldos negativos (overdraw): ${negative.length}`);
  if (negative.length) console.table(negative);

  // ── 3) entryRounds inconsistentes: pinsSpent ≠ max(0, changesMade-FREE) ──
  //     (no premium). Valida que el dato existente sea compatible con el modelo nuevo.
  const premiumIds = new Set(
    (await db.select({ id: users.id }).from(users).where(eq(users.isPremium, true))).map((u) => u.id),
  );
  const ers = await db
    .select({
      userId: entries.userId,
      roundId: entryRounds.roundId,
      changesMade: entryRounds.changesMade,
      pinsSpent: entryRounds.pinsSpent,
    })
    .from(entryRounds)
    .innerJoin(entries, eq(entryRounds.entryId, entries.id));
  const erBad = ers.filter((e) => {
    if (premiumIds.has(e.userId)) return e.pinsSpent !== 0; // premium nunca debería tener pinsSpent>0
    return e.pinsSpent !== Math.max(0, e.changesMade - FREE);
  });
  console.log(`\n[3] entryRounds inconsistentes (pinsSpent ≠ esperado, o premium con pinsSpent>0): ${erBad.length}`);
  if (erBad.length) console.table(erBad.slice(0, 50));

  // ── 4) Refunds (transfer con delta>0): rastro del bug viejo de reembolso ──
  const refunds = await db
    .select({
      userId: pinTransactions.userId,
      delta: pinTransactions.delta,
      roundId: pinTransactions.roundId,
      createdAt: pinTransactions.createdAt,
    })
    .from(pinTransactions)
    .where(sql`${pinTransactions.reason} = 'transfer' and ${pinTransactions.delta} > 0`);
  console.log(`\n[4] Transferencias con delta>0 (refunds): ${refunds.length}`);
  if (refunds.length) console.table(refunds);

  // ── 5) Valores negativos en entryRounds (no debería haber) ──
  const neg = ers.filter((e) => e.changesMade < 0 || e.pinsSpent < 0);
  console.log(`\n[5] entryRounds con changesMade/pinsSpent negativos: ${neg.length}`);
  if (neg.length) console.table(neg);

  console.log("\n== resumen ==");
  console.table({
    ledgerInconsistente: ledgerBad.length,
    saldosNegativos: negative.length,
    entryRoundsInconsistentes: erBad.length,
    refunds: refunds.length,
    valoresNegativos: neg.length,
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
