// Configuración central del juego. Pensado para tunear fácil.

export const BUDGET = 250; // presupuesto a calibrar post-seed
export const SQUAD = { STARTERS: 11, SUBS: 4, TOTAL: 15 } as const;
export const MAX_PER_COUNTRY = 3;
export const FREE_CHANGES_PER_ROUND = 1; // cambios gratis por fecha; los extra cuestan pines

export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Arquero',
  DEF: 'Defensor',
  MID: 'Volante',
  FWD: 'Delantero',
};

// Colores Panini — texto del chip (sobre fondo claro)
export const POSITION_COLORS: Record<Position, string> = {
  GK:  '#D97706', // ámbar
  DEF: '#1E40AF', // azul profundo
  MID: '#059669', // verde esmeralda
  FWD: '#DC2626', // rojo
};

// Fondos Panini — fondo del chip
export const POSITION_BG: Record<Position, string> = {
  GK:  '#FEF3C7',
  DEF: '#DBEAFE',
  MID: '#D1FAE5',
  FWD: '#FEE2E2',
};

export type FormationShape = { GK: number; DEF: number; MID: number; FWD: number };

export const FORMATIONS: Record<string, FormationShape> = {
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '4-5-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '5-4-1': { GK: 1, DEF: 5, MID: 4, FWD: 1 },
  '4-1-4-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '3-3-4': { GK: 1, DEF: 3, MID: 3, FWD: 4 },
};

export const DEFAULT_FORMATION = '4-4-2';

// Tabla de puntaje (ver SPEC §6). Todo configurable.
export const SCORING = {
  minMinutes: 20,
  goalByPosition: { GK: 12, DEF: 9, MID: 6, FWD: 4 } as Record<Position, number>,
  penaltyGoal: 3,
  assist: 2,
  cleanSheet: { GK: 3, DEF: 2, MID: 0, FWD: 0 } as Record<Position, number>,
  penaltySaved: 4,
  goalConcededGK: -1,
  motm: 4,
  yellow: -2,
  red: -4,
  ownGoal: -2,
  penaltyMissed: -4,
  coachWin: 2,
  coachLoss: -2,
} as const;

export const ROUNDS = [
  { order: 1, name: 'Fecha 1 — Grupos (J1)', type: 'group' as const },
  { order: 2, name: 'Fecha 2 — Grupos (J2)', type: 'group' as const },
  { order: 3, name: 'Fecha 3 — Grupos (J3)', type: 'group' as const },
  { order: 4, name: 'Fecha 4 — 16avos', type: 'knockout' as const },
  { order: 5, name: 'Fecha 5 — Octavos', type: 'knockout' as const },
  { order: 6, name: 'Fecha 6 — Cuartos', type: 'knockout' as const },
  { order: 7, name: 'Fecha 7 — Semifinales', type: 'knockout' as const },
  { order: 8, name: 'Fecha 8 — Final y 3° puesto', type: 'knockout' as const },
];

export const TOURNAMENT_START = process.env.NEXT_PUBLIC_TOURNAMENT_START ?? '2026-06-11T19:00:00Z';
