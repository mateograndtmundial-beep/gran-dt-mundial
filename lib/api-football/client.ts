// Cliente de API-Football (api-sports.io). El Mundial 2026 es league=1, season=2026.
const BASE_URL = process.env.API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io';
const KEY = process.env.API_FOOTBALL_KEY ?? '';

export const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
export const SEASON = Number(process.env.API_FOOTBALL_SEASON ?? 2026);

async function apiGet<T = unknown>(
  path: string,
  params: Record<string, string | number> = {},
  attempt = 0,
): Promise<T[]> {
  if (!KEY) throw new Error('Falta API_FOOTBALL_KEY en el entorno');
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, { headers: { 'x-apisports-key': KEY } });

  // Rate limit (plan gratis): esperar y reintentar.
  if (res.status === 429 && attempt < 5) {
    const retryAfter = Number(res.headers.get('retry-after')) || 6;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return apiGet<T>(path, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { response: T[]; errors?: unknown };
  const errs = json.errors;
  const hasErrors = Array.isArray(errs) ? errs.length > 0 : errs && Object.keys(errs).length > 0;
  if (hasErrors) throw new Error(`API-Football ${path} errors: ${JSON.stringify(errs)}`);

  return json.response ?? [];
}

export const apiFootball = {
  teams: () => apiGet('teams', { league: LEAGUE_ID, season: SEASON }),
  squad: (teamId: number) => apiGet('players/squads', { team: teamId }),
  // Perfil + estadísticas de un jugador en una temporada (nombre completo + club).
  playerSeason: (playerId: number, season: number) => apiGet('players', { id: playerId, season }),
  // Perfil del jugador (nombre completo, sin club). Fallback si no hay temporada.
  playerProfile: (playerId: number) => apiGet('players/profiles', { player: playerId }),
  coach: (teamId: number) => apiGet('coachs', { team: teamId }),
  fixtures: () => apiGet('fixtures', { league: LEAGUE_ID, season: SEASON }),
  fixtureById: (id: number) => apiGet('fixtures', { id }),
  fixtureRounds: () => apiGet<string>('fixtures/rounds', { league: LEAGUE_ID, season: SEASON }),
  fixturePlayers: (fixtureId: number) => apiGet('fixtures/players', { fixture: fixtureId }),
  standings: () => apiGet('standings', { league: LEAGUE_ID, season: SEASON }),
  coverage: () => apiGet('leagues', { id: LEAGUE_ID, season: SEASON }),
};

/** Mapea la posición de API-Football a nuestra enum. */
export function mapPosition(p: string | undefined): 'GK' | 'DEF' | 'MID' | 'FWD' {
  switch ((p ?? '').toLowerCase()) {
    case 'goalkeeper':
      return 'GK';
    case 'defender':
      return 'DEF';
    case 'midfielder':
      return 'MID';
    case 'attacker':
      return 'FWD';
    default:
      return 'MID';
  }
}

/** Mapea el texto de "round" de un fixture al order de nuestras fechas (1..8). */
export function mapRoundOrder(round: string): number | null {
  const r = round.toLowerCase();
  if (r.includes('group')) {
    const m = r.match(/(\d+)/);
    return m ? Number(m[1]) : 1; // "Group Stage - 1/2/3"
  }
  if (r.includes('32')) return 4;
  if (r.includes('16') || r.includes('octavos')) return 5;
  if (r.includes('quarter') || r.includes('cuartos')) return 6;
  if (r.includes('semi')) return 7;
  if (r.includes('final') || r.includes('3rd') || r.includes('third')) return 8;
  return null;
}
