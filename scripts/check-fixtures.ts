import 'dotenv/config';
import { asc, eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { rounds, matches, countries } from '../lib/db/schema';

/* Diagnóstico: cuántos partidos hay por fecha (y cuántos con equipos asignados). */

async function main() {
  const cs = await db.select().from(countries);
  const cmap = new Map(cs.map((c) => [c.id, { name: c.name, group: c.groupLetter }]));
  console.log(`Selecciones cargadas: ${cs.length}\n`);

  const rs = await db.select().from(rounds).orderBy(asc(rounds.order));
  for (const r of rs) {
    const ms = await db.select().from(matches).where(eq(matches.roundId, r.id));
    const withTeams = ms.filter((m) => m.homeCountryId != null && m.awayCountryId != null).length;
    console.log(`${r.name}: ${ms.length} partidos (${withTeams} con equipos asignados)`);
  }

  const r1 = rs.find((r) => r.order === 1);
  if (r1) {
    const ms = await db.select().from(matches).where(eq(matches.roundId, r1.id));
    console.log(`\n── Fecha 1: ${ms.length} partidos ──`);
    for (const m of ms) {
      const h = cmap.get(m.homeCountryId ?? -1);
      const a = cmap.get(m.awayCountryId ?? -1);
      console.log(`  ${(h?.name ?? '?').padEnd(16)} vs ${a?.name ?? '?'}   [grupo ${h?.group ?? '?'}]`);
    }
  }
}

main().then(() => process.exit(0));
