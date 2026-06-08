import 'dotenv/config';

/*
 * Verifica EMPÍRICAMENTE si API-Football provee rating + stats de jugadores para
 * el Mundial (league=1). Un flag de cobertura en `false` para 2026 puede ser solo
 * "la temporada no arrancó"; la prueba real es mirar un Mundial YA JUGADO (2022)
 * y ver si /fixtures/players devuelve `games.rating` poblado.
 *
 *   npx tsx scripts/probe-ratings.ts            # prueba 2026, 2022, 2018
 *   npx tsx scripts/probe-ratings.ts 2022       # solo una temporada
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = process.env.API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io';
const KEY = process.env.API_FOOTBALL_KEY ?? '';
const LEAGUE = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);

async function get(path: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'x-apisports-key': KEY } });
  const json = (await res.json()) as any;
  return json;
}

async function probeSeason(season: number) {
  console.log(`\n========== Mundial ${season} (league=${LEAGUE}) ==========`);

  // 1) Cobertura declarada
  const lg = await get('leagues', { id: LEAGUE, season });
  const cov = lg?.response?.[0]?.seasons?.find((s: any) => Number(s.year) === season)?.coverage;
  if (cov) {
    console.log(
      `cobertura: statistics_players=${cov.fixtures?.statistics_players} · events=${cov.fixtures?.events} · lineups=${cov.fixtures?.lineups}`,
    );
  } else {
    console.log(`cobertura: (sin datos) errors=${JSON.stringify(lg?.errors)}`);
  }

  // 2) Fixtures de esa temporada
  const fx = await get('fixtures', { league: LEAGUE, season });
  const fixtures: any[] = fx?.response ?? [];
  console.log(`fixtures devueltos: ${fixtures.length}${fixtures.length ? '' : `  errors=${JSON.stringify(fx?.errors)}`}`);
  if (!fixtures.length) return;

  // 3) Buscar uno terminado y pedir las stats de jugadores
  const finished = fixtures.filter((f) => ['FT', 'AET', 'PEN'].includes(f?.fixture?.status?.short));
  console.log(`fixtures terminados: ${finished.length}`);
  const sample = finished[Math.floor(finished.length / 2)] ?? finished[0];
  if (!sample) {
    console.log('→ no hay partidos terminados todavía (temporada futura). No se puede probar el rating aún.');
    return;
  }

  const home = sample.teams?.home?.name;
  const away = sample.teams?.away?.name;
  const fid = sample.fixture?.id;
  console.log(`partido de muestra: ${home} vs ${away} (fixture ${fid})`);

  const pl = await get('fixtures/players', { fixture: fid });
  const blocks: any[] = pl?.response ?? [];
  let total = 0;
  let withRating = 0;
  const samples: string[] = [];
  for (const b of blocks) {
    for (const p of b?.players ?? []) {
      const st = p?.statistics?.[0];
      total++;
      const r = st?.games?.rating;
      if (r != null && r !== '') {
        withRating++;
        if (samples.length < 5) samples.push(`${p.player?.name}: ${r} (min ${st?.games?.minutes ?? '?'})`);
      }
    }
  }
  console.log(`jugadores con stats: ${total} · con rating: ${withRating}`);
  if (samples.length) console.log(`muestras de rating → ${samples.join(' · ')}`);
  console.log(
    withRating > 0
      ? '✅ ESTE Mundial trae rating real desde la API.'
      : total > 0
        ? '⚠️  Hay stats de jugadores pero SIN rating (campo null).'
        : '❌ /fixtures/players no devolvió jugadores.',
  );
}

async function main() {
  if (!KEY) {
    console.error('Falta API_FOOTBALL_KEY');
    process.exit(1);
  }
  const arg = process.argv[2];
  const seasons = arg ? [Number(arg)] : [2026, 2022, 2018];
  for (const s of seasons) {
    try {
      await probeSeason(s);
    } catch (e: any) {
      console.error(`Error en ${s}:`, e?.message ?? e);
    }
  }
}

main();
