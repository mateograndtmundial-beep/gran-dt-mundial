import 'dotenv/config';
import { apiFootball, LEAGUE_ID, SEASON } from '../lib/api-football/client';

/*
 * Valida que API-Football tenga cobertura de stats de jugadores (incluido el
 * rating) para el torneo configurado. El rating es la BASE del scoring, así que
 * si no está cubierto hay que caer al ingreso manual desde /admin.
 *
 *   npx tsx scripts/check-coverage.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

async function main() {
  console.log(`Chequeando cobertura de league=${LEAGUE_ID} season=${SEASON}…\n`);
  const resp = (await apiFootball.coverage()) as any[];
  const league = resp?.[0];
  if (!league) {
    console.error('❌ Sin respuesta de leagues. ¿Key válida? ¿league/season correctos?');
    process.exit(1);
  }

  console.log(`Liga: ${league.league?.name} (${league.country?.name})`);
  const years = (league.seasons ?? []).map((s: any) => s.year);
  console.log(`Temporadas disponibles: ${years.join(', ')}`);
  const matched = (league.seasons ?? []).find((s: any) => Number(s.year) === SEASON);
  const season = matched ?? league.seasons?.[league.seasons.length - 1];
  console.log(`Temporada usada: ${season?.year}${matched ? '' : '  (⚠️ fallback, no había 2026)'}`);
  const cov = season?.coverage;
  if (!cov) {
    console.error('❌ La temporada no reporta objeto de cobertura.');
    process.exit(1);
  }

  console.log('\nCobertura reportada:');
  console.log(JSON.stringify(cov, null, 2));

  const playersStats =
    cov?.fixtures?.statistics_players ?? cov?.fixtures?.players_statistics ?? cov?.players ?? false;
  console.log('\n── Resumen ──');
  console.log(`fixtures.events:             ${cov?.fixtures?.events ? '✅' : '⚠️ '}  (autogoles)`);
  console.log(`fixtures.lineups:            ${cov?.fixtures?.lineups ? '✅' : '⚠️ '}`);
  console.log(`fixtures.statistics_players: ${playersStats ? '✅' : '❌'}  (RATING — base del scoring)`);
  console.log(
    playersStats
      ? '\n✅ Hay cobertura de stats de jugadores: el rating debería venir cuando se jueguen los partidos.'
      : '\n❌ NO hay cobertura de stats de jugadores: el scoring base dependerá de carga manual.',
  );
}

main().catch((e) => {
  console.error('Error:', e?.message ?? e);
  process.exit(1);
});
