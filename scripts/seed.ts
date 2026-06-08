import 'dotenv/config';
import { db } from '../lib/db';
import { countries, players, coaches, rounds, matches } from '../lib/db/schema';
import { apiFootball, mapPosition, mapRoundOrder } from '../lib/api-football/client';
import { getPlayerDetails, resolveName } from '../lib/api-football/enrich';
import { ROUNDS } from '../lib/game/config';

/*
 * Paso 1 del pricing (y carga base del torneo). Trae de API-Football: selecciones,
 * fixture, técnicos y el plantel COMPLETO de cada jugador (nombre completo, club,
 * año de nacimiento, foto). Idempotente (onConflictDoUpdate; no pisa price).
 *
 *   npm run seed
 *
 * Después: `npm run prices:fetch` y `npm run prices:apply`. Ver scripts/README.md.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function seedRounds(): Promise<Map<number, number>> {
  console.log('→ Fechas (rounds)...');
  const existing = await db.select().from(rounds);
  if (existing.length === 0) {
    await db.insert(rounds).values(ROUNDS.map((r) => ({ name: r.name, type: r.type, order: r.order })));
  }
  const all = await db.select().from(rounds);
  return new Map(all.map((r) => [r.order, r.id]));
}

async function seedCountries(): Promise<Map<number, number>> {
  console.log('→ Selecciones...');
  const teams = (await apiFootball.teams()) as any[];

  // Intentar mapear grupos desde standings (best-effort).
  const groupByTeamId = new Map<number, string>();
  try {
    const standings = (await apiFootball.standings()) as any[];
    const groups = standings?.[0]?.league?.standings ?? [];
    for (const g of groups) {
      for (const row of g) {
        // Solo grupos reales (A–L). Se saltea el "Ranking of third-placed teams",
        // un pseudo-grupo que API-Football devuelve último y pisaba el grupo correcto.
        const gname = row?.group ? String(row.group) : '';
        if (row?.team?.id && gname.startsWith('Group ')) groupByTeamId.set(row.team.id, gname);
      }
    }
  } catch (e) {
    console.warn('  (sin grupos en standings):', (e as Error).message);
  }

  for (const t of teams) {
    const team = t.team ?? t;
    await db
      .insert(countries)
      .values({
        name: team.name,
        code: team.code ?? null,
        flagUrl: team.flag ?? team.logo ?? null,
        groupLetter: groupByTeamId.get(team.id) ?? null,
        apiFootballId: team.id,
      })
      .onConflictDoNothing();
  }

  const all = await db.select().from(countries);
  return new Map(all.filter((c) => c.apiFootballId != null).map((c) => [c.apiFootballId as number, c.id]));
}

async function seedSquadsAndCoaches(countryIdByApi: Map<number, number>) {
  console.log('→ Planteles y técnicos...');
  for (const [apiId, countryId] of countryIdByApi) {
    try {
      const squads = (await apiFootball.squad(apiId)) as any[];
      const list: any[] = squads?.[0]?.players ?? [];
      await sleep(300);
      for (const p of list) {
        // Completar nombre/club/nacimiento desde /players (el squad viene abreviado).
        const details = await getPlayerDetails(p.id);
        const name = resolveName(p.name, details?.firstname, details?.lastname);
        await db
          .insert(players)
          .values({
            countryId,
            name,
            position: mapPosition(p.position),
            photoUrl: details?.photo ?? p.photo ?? null,
            club: details?.club ?? null,
            birthYear: details?.birthYear ?? null,
            jerseyNumber: p.number ?? null,
            apiFootballId: p.id,
            price: 5,
          })
          // No pisamos price (lo fija el admin / price-players) ni status.
          .onConflictDoUpdate({
            target: players.apiFootballId,
            set: {
              name,
              position: mapPosition(p.position),
              photoUrl: details?.photo ?? p.photo ?? null,
              club: details?.club ?? null,
              birthYear: details?.birthYear ?? null,
              jerseyNumber: p.number ?? null,
            },
          });
      }
    } catch (e) {
      console.warn(`  squad ${apiId}:`, (e as Error).message);
    }

    try {
      const cs = (await apiFootball.coach(apiId)) as any[];
      const c = cs?.[0];
      if (c) {
        await db
          .insert(coaches)
          .values({ countryId, name: c.name, photoUrl: c.photo ?? null, apiFootballId: c.id, price: 0 })
          .onConflictDoNothing();
      }
    } catch (e) {
      console.warn(`  coach ${apiId}:`, (e as Error).message);
    }
    await sleep(350);
  }
}

async function seedFixtures(roundIdByOrder: Map<number, number>, countryIdByApi: Map<number, number>) {
  console.log('→ Fixture...');
  const fixtures = (await apiFootball.fixtures()) as any[];
  let inserted = 0;
  for (const f of fixtures) {
    const order = mapRoundOrder(f.league?.round ?? '');
    const roundId = order ? roundIdByOrder.get(order) : undefined;
    if (!roundId) {
      console.warn(`  fixture ${f.fixture?.id}: round desconocida "${f.league?.round}"`);
      continue;
    }
    await db
      .insert(matches)
      .values({
        roundId,
        homeCountryId: countryIdByApi.get(f.teams?.home?.id) ?? null,
        awayCountryId: countryIdByApi.get(f.teams?.away?.id) ?? null,
        kickoff: f.fixture?.date ? new Date(f.fixture.date) : null,
        venue: f.fixture?.venue?.name ?? null,
        homeScore: f.goals?.home ?? null,
        awayScore: f.goals?.away ?? null,
        apiFootballFixtureId: f.fixture?.id,
      })
      .onConflictDoNothing();
    inserted++;
  }
  console.log(`  ${inserted} partidos.`);
}

async function main() {
  console.log('🌱 Seeding DT Mundial (league=1, season=2026)...');
  const roundIdByOrder = await seedRounds();
  const countryIdByApi = await seedCountries();
  console.log(`  ${countryIdByApi.size} selecciones.`);
  await seedSquadsAndCoaches(countryIdByApi);
  await seedFixtures(roundIdByOrder, countryIdByApi);
  console.log('✅ Seed completo.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Seed falló:', e);
    process.exit(1);
  });
