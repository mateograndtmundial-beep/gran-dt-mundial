import "dotenv/config";
import { eq, count, asc, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { rounds, matches, playerMatchStats } from "../lib/db/schema";

async function main() {
  const rs = await db.select().from(rounds).orderBy(asc(rounds.order));
  for (const r of rs) {
    const ms = await db.select().from(matches).where(eq(matches.roundId, r.id));
    const matchIds = ms.map(m => m.id);
    let statsCount = 0;
    if (matchIds.length > 0) {
      const statsQ = await db.select({ c: count() }).from(playerMatchStats).where(inArray(playerMatchStats.matchId, matchIds));
      statsCount = Number(statsQ[0].c);
    }
    const byStatus: Record<string, number> = {};
    ms.forEach(m => { byStatus[m.status] = (byStatus[m.status]||0)+1; });
    const motmMissing = ms.filter(m => m.status === 'finished' && m.motmPlayerId == null).length;
    console.log(`Fecha ${r.order} [${r.name}] status=${r.status} matches=${ms.length} stats=${statsCount} match_statuses=${JSON.stringify(byStatus)}${motmMissing > 0 ? ' ⚠️  MOTM_MISSING=' + motmMissing : ''}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
