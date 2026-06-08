import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { countries } from '../lib/db/schema';
import { apiFootball } from '../lib/api-football/client';

/*
 * Corrige el grupo de las selecciones que quedaron mal seedeadas como
 * "Ranking of third-placed teams" (pseudo-grupo de API-Football que pisaba el
 * grupo real de los mejores terceros). Re-deriva el grupo correcto desde
 * standings (solo "Group A–L") y actualiza countries.groupLetter.
 *
 *   npx tsx scripts/fix-groups.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

async function main() {
  const standings = (await apiFootball.standings()) as any[];
  const groups: any[] = standings?.[0]?.league?.standings ?? [];
  const groupByApiId = new Map<number, string>();
  for (const g of groups) {
    for (const row of g ?? []) {
      const gname = row?.group ? String(row.group) : '';
      if (row?.team?.id && gname.startsWith('Group ')) groupByApiId.set(row.team.id, gname);
    }
  }
  console.log(`Grupos reales mapeados: ${groupByApiId.size} selecciones\n`);

  const cs = await db.select().from(countries);
  let fixed = 0;
  for (const c of cs) {
    if (c.apiFootballId == null) continue;
    const correct = groupByApiId.get(c.apiFootballId);
    if (correct && correct !== c.groupLetter) {
      await db.update(countries).set({ groupLetter: correct }).where(eq(countries.id, c.id));
      console.log(`  ${c.name.padEnd(22)} ${c.groupLetter ?? '(null)'} → ${correct}`);
      fixed++;
    }
  }
  console.log(`\nListo. ${fixed} selecciones corregidas.`);
}

main().then(() => process.exit(0));
