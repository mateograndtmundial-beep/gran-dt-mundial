import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { rounds } from "../lib/db/schema";

/**
 * Carga deadlines MANUALES en las fechas de playoffs (16vos → final).
 *
 * Por qué: API-Football publica el cuadro de cada ronda recién cuando termina
 * la anterior. En ese hueco la fecha no tiene fixtures (`matches`), así que
 * `getEditableRound` no tiene `firstKickoff` del cual derivar el cierre y la UI
 * mostraría "CIERRE A DEFINIR" sin countdown. Con un `rounds.deadline` cargado a
 * mano, el home muestra countdown real durante ese hueco. Cuando se seedeen los
 * fixtures reales, el `firstKickoff` toma precedencia (el deadline manual es solo
 * fallback), así que esto NO pisa nada cuando ya hay partidos.
 *
 * deadline = kickoff del PRIMER partido de la ronda (en UTC). Verificado contra
 * el fixture oficial del Mundial 2026. ART = UTC-3. Para el #8 se usa el partido
 * por el 3er puesto (18/07), que es el primero de esa ronda.
 *
 * Si FIFA reprograma horarios, actualizá la tabla de abajo y re-corré (idempotente).
 *
 *   npx tsx scripts/set-playoff-deadlines.ts
 */
const DEADLINES: { order: number; label: string; utc: Date }[] = [
  { order: 5, label: "8vos      (04/07 14:00 ART)", utc: new Date(Date.UTC(2026, 6, 4, 17, 0, 0)) },
  { order: 6, label: "4tos      (09/07 17:00 ART)", utc: new Date(Date.UTC(2026, 6, 9, 20, 0, 0)) },
  { order: 7, label: "Semis     (14/07 16:00 ART)", utc: new Date(Date.UTC(2026, 6, 14, 19, 0, 0)) },
  { order: 8, label: "Final/3er (18/07 18:00 ART)", utc: new Date(Date.UTC(2026, 6, 18, 21, 0, 0)) },
];

const fmtArt = (d: Date) =>
  d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

async function main() {
  for (const d of DEADLINES) {
    const res = await db
      .update(rounds)
      .set({ deadline: d.utc })
      .where(eq(rounds.order, d.order))
      .returning({ name: rounds.name, deadline: rounds.deadline });
    const row = res[0];
    if (!row) {
      console.warn(`#${d.order} ${d.label} → NO existe esa ronda (¿order distinto?)`);
      continue;
    }
    console.log(`#${d.order} ${d.label} → ${row.name} | ${fmtArt(row.deadline!)} ART | ${row.deadline!.toISOString()}`);
  }
}

main().then(() => process.exit(0));
