import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { rounds } from "../lib/db/schema";
import { ROUNDS } from "../lib/game/config";

// Uso: npx tsx scripts/rename-rounds.ts [--dry]
// Sincroniza rounds.name en la DB con los nombres de ROUNDS (lib/game/config.ts),
// matcheando por sort_order. Idempotente: solo actualiza los que difieren.
// El seed no pisa nombres (solo inserta rounds si la tabla está vacía), por eso
// un rename del config necesita este one-shot.
async function main() {
  const dry = process.argv.includes("--dry");
  const existing = await db.select().from(rounds);
  if (!existing.length) {
    console.error("No hay rounds en la DB (¿corriste npm run seed?).");
    process.exit(1);
  }

  let changed = 0;
  for (const cfg of ROUNDS) {
    const row = existing.find((r) => r.order === cfg.order);
    if (!row) {
      console.warn(`⚠ No existe round con sort_order=${cfg.order} en la DB.`);
      continue;
    }
    if (row.name === cfg.name) {
      console.log(`= [${cfg.order}] "${row.name}" (sin cambios)`);
      continue;
    }
    console.log(`→ [${cfg.order}] "${row.name}" → "${cfg.name}"${dry ? " (dry)" : ""}`);
    if (!dry) {
      await db.update(rounds).set({ name: cfg.name }).where(eq(rounds.id, row.id));
    }
    changed++;
  }
  console.log(dry ? `Dry run: ${changed} por renombrar.` : `Listo: ${changed} renombrados.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
