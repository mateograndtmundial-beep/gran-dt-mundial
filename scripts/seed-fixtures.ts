import "dotenv/config";
import { db } from "../lib/db";
import { matches, rounds, countries } from "../lib/db/schema";
import { apiFootball, mapRoundOrder } from "../lib/api-football/client";

/*
 * Seed ACOTADO a fixtures: trae el fixture de API-Football e inserta SOLO partidos
 * nuevos (onConflictDoNothing por apiFootballFixtureId). No toca players/countries
 * ni stats. Pensado para sumar los cruces de eliminatorias (16vos+) cuando se
 * definen, sin re-escribir los 1248 jugadores como hace `npm run seed`.
 *
 *   npx tsx scripts/seed-fixtures.ts          # inserta
 *   npx tsx scripts/seed-fixtures.ts --dry    # solo muestra qué insertaría
 */

const DRY = process.argv.includes("--dry");

async function main() {
  console.log(`🗓️  Seed de fixtures${DRY ? " (DRY-RUN, no escribe)" : ""}...`);

  const allRounds = await db.select().from(rounds);
  const roundIdByOrder = new Map(allRounds.map((r) => [r.order, r.id]));
  const roundNameById = new Map(allRounds.map((r) => [r.id, r.name]));

  const allCountries = await db.select({ id: countries.id, apiId: countries.apiFootballId, name: countries.name }).from(countries);
  const countryIdByApi = new Map(allCountries.filter((c) => c.apiId != null).map((c) => [c.apiId as number, c.id]));
  const nameById = new Map(allCountries.map((c) => [c.id, c.name]));

  // Fixtures ya cargados: para reportar qué es nuevo (el insert igual es idempotente).
  const existing = await db.select({ fix: matches.apiFootballFixtureId }).from(matches);
  const existingFix = new Set(existing.map((e) => e.fix).filter((x): x is number => x != null));

  const fixtures = (await apiFootball.fixtures()) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  console.log(`  API devolvió ${fixtures.length} fixtures.`);

  let toInsert = 0, skippedExisting = 0, unknownRound = 0;
  const newByRound = new Map<number, number>();

  for (const f of fixtures) {
    const fixId = f.fixture?.id as number | undefined;
    const order = mapRoundOrder(f.league?.round ?? "");
    const roundId = order ? roundIdByOrder.get(order) : undefined;
    if (!roundId) { unknownRound++; continue; }
    if (fixId != null && existingFix.has(fixId)) { skippedExisting++; continue; }

    toInsert++;
    newByRound.set(roundId, (newByRound.get(roundId) ?? 0) + 1);
    const h = countryIdByApi.get(f.teams?.home?.id);
    const a = countryIdByApi.get(f.teams?.away?.id);
    console.log(`  + [${roundNameById.get(roundId)}] ${h ? nameById.get(h) : "∅"} vs ${a ? nameById.get(a) : "∅"}  (fix ${fixId})`);

    if (!DRY) {
      await db
        .insert(matches)
        .values({
          roundId,
          homeCountryId: h ?? null,
          awayCountryId: a ?? null,
          kickoff: f.fixture?.date ? new Date(f.fixture.date) : null,
          venue: f.fixture?.venue?.name ?? null,
          homeScore: f.goals?.home ?? null,
          awayScore: f.goals?.away ?? null,
          apiFootballFixtureId: fixId,
        })
        .onConflictDoNothing();
    }
  }

  console.log(`\nResumen: ${toInsert} nuevo(s)${DRY ? " (no insertados, dry)" : " insertados"} · ${skippedExisting} ya existían · ${unknownRound} de ronda desconocida.`);
  for (const [rid, n] of newByRound) console.log(`  ${roundNameById.get(rid)}: ${n} nuevo(s)`);
  process.exit(0);
}

main().catch((e) => { console.error("❌ Falló:", e); process.exit(1); });
