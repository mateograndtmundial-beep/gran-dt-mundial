import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { rounds } from "../lib/db/schema";
import { getUnitData, type CarouselUnit } from "../lib/stories/scoreboard-data";
import { generateUnitPngs } from "../lib/stories/scoreboard";

// Genera un carrusel a mano (sin pasar por getCarouselUnits, que llama a la API
// de API-Football para resolver el cruce). Usar cuando el cruce ya se conoce
// por la DB y no queremos gastar cuota de API.
//   npx tsx scripts/gen-manual-unit.ts <roundOrder> <matchId1> <matchId2>

async function main() {
  const roundOrder = Number(process.argv[2]);
  const matchIds = process.argv.slice(3).map(Number);
  const round = (await db.select().from(rounds).where(eq(rounds.order, roundOrder)))[0];
  if (!round) throw new Error(`No existe la fecha order=${roundOrder}`);

  const sorted = [...matchIds].sort((a, b) => a - b);
  const unit: CarouselUnit = {
    kind: "knockout",
    bucket: `match:${sorted.join("-")}`,
    roundId: round.id,
    roundOrder,
    matchIds: sorted,
  };
  const data = await getUnitData(unit);
  const outDir = path.join(process.cwd(), "out/scoreboards");
  await mkdir(outDir, { recursive: true });
  const pngs = await generateUnitPngs(data);
  for (const { buf, filename } of pngs) {
    await writeFile(path.join(outDir, filename), buf);
    console.log(`✓ ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
