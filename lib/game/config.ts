// Configuración central del juego. Pensado para tunear fácil.

export const BUDGET = 700; // presupuesto para armar el equipo (15 jugadores + DT)
export const SQUAD = { STARTERS: 11, SUBS: 4, TOTAL: 15 } as const;
export const MAX_PER_COUNTRY = 3;
// Desde los 16vos de Final (playoffs) el tope por país se afloja a 5 (en vez de
// liberarse): con 32 selecciones vivas no aprieta, y en la última instancia (4
// selecciones vivas) 5 por país da 20 jugadores posibles sobre 15 → alcanza para
// armar equipos 100% funcionales. Con 3 no alcanzaba. Regla GENERAL (todos los
// usuarios), no exclusiva de la Copa.
export const MAX_PER_COUNTRY_KNOCKOUT = 5;
export const FREE_CHANGES_PER_ROUND = 1; // cambios gratis por fecha (default); los extra cuestan pines

// En los 16vos de Final (order 4) los inscriptos en la Copa GOLDEN TICKET arrancan
// con cambios gratis extra, para emparejar cuentas nuevas y viejas al entrar a la
// Copa (ver docs/MONETIZACION.md). Es un beneficio EXCLUSIVO de los participantes de
// la Copa: el resto de los usuarios sigue en FREE_CHANGES_PER_ROUND siempre. El cupo
// es por-fecha y no se acumula (se reinicia al arrancar cada fecha).
export const FREE_CHANGES_R16 = 5;

/**
 * Cambios gratis de una fecha según su `order` (1-based, como en ROUNDS) y si el
 * usuario está inscripto en la Copa GOLDEN TICKET (`inCopa`). Solo los inscriptos
 * reciben el cupo extra de los 16vos; cualquier otro caso usa el default.
 */
export function getFreeChangesForRound(roundOrder: number, inCopa = false): number {
  return roundOrder === 4 && inCopa ? FREE_CHANGES_R16 : FREE_CHANGES_PER_ROUND;
}

// Pricing de jugadores: precio continuo derivado del valor de mercado (Transfermarkt).
// Ver lib/pricing/map.ts y scripts/price-players.ts. Todo tuneable post-seed.
export const PRICING = {
  MIN: 5,                 // piso continuo (jugador base / sin valor de mercado)
  ANCHOR: 85,             // precio del jugador en el percentil de referencia (mvRef)
  MAX: 150,               // techo duro (la elite extiende hasta acá)
  MV_REF_PERCENTILE: 98,  // mvRef = percentil del valor de mercado (≈ €90M)
  GAMMA: 0.85,            // curvatura: <1 levanta/estira los medios, >1 los aplana
} as const;

export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Arquero',
  DEF: 'Defensor',
  MID: 'Volante',
  FWD: 'Delantero',
};

// Abreviatura en español que se MUESTRA al usuario (chips, slots). El enum interno
// y las claves de slot siguen en inglés (GK/DEF/MID/FWD); esto es solo presentación.
export const POSITION_ABBR: Record<Position, string> = {
  GK: 'POR',
  DEF: 'DEF',
  MID: 'MED',
  FWD: 'DEL',
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

// Solo formaciones a tres líneas (DEF-MED-DEL) con máximo 4 jugadores por línea:
// con 5 en una línea, la cancha (mobile) corta la última figurita. Las notaciones
// de cuatro líneas (p. ej. 4-2-3-1) colapsan a una de estas, así que no se incluyen.
export const FORMATIONS: Record<string, FormationShape> = {
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '4-2-4': { GK: 1, DEF: 4, MID: 2, FWD: 4 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '3-3-4': { GK: 1, DEF: 3, MID: 3, FWD: 4 },
};

export const DEFAULT_FORMATION = '4-4-2';

// Tabla de puntaje (ver SPEC §6). Todo configurable.
export const SCORING = {
  minMinutes: 20,
  goalByPosition: { GK: 12, DEF: 9, MID: 6, FWD: 4 } as Record<Position, number>,
  penaltyGoal: 3,
  assist: 2,
  // Valla invicta: se evalúa A NIVEL JUGADOR (sin goles recibidos mientras estuvo
  // en cancha y jugó ≥20'), no a nivel equipo. Ídem el −1 del arquero (solo los
  // goles que recibió él). Ver lib/api-football/timing.ts.
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
  // Post fase de grupos, las fechas se llaman por su instancia (no "Fecha N").
  // La 8 incluye también el partido por el 3er puesto.
  { order: 4, name: '16vos de Final', type: 'knockout' as const },
  { order: 5, name: '8vos de Final', type: 'knockout' as const },
  { order: 6, name: '4tos de Final', type: 'knockout' as const },
  { order: 7, name: 'Semifinales', type: 'knockout' as const },
  { order: 8, name: 'Final', type: 'knockout' as const },
];

export const TOURNAMENT_START = process.env.NEXT_PUBLIC_TOURNAMENT_START ?? '2026-06-11T19:00:00Z';
