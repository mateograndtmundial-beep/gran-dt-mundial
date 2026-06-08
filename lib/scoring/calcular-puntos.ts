import { SCORING, type Position } from '@/lib/game/config';

export interface StatsInput {
  position: Position;
  minutes: number;
  rating: number | null;
  goals: number; // goles totales (incluye los de penal)
  penaltyGoals: number; // de los goles, cuántos fueron de penal
  assists: number;
  yellow: number;
  red: number; // 1 si fue expulsado (directa o doble amarilla)
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  goalsConceded: number; // goles recibidos por el equipo (solo afecta al arquero)
  cleanSheet: boolean; // el equipo no recibió goles
  isMotm: boolean; // figura del partido
  isCaptain: boolean;
}

export interface PointsBreakdown {
  base: number;
  captainBonus: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  penaltySaved: number;
  goalsConceded: number;
  motm: number;
  cards: number;
  ownGoals: number;
  penaltyMissed: number;
  total: number;
}

/**
 * Calcula los puntos de un jugador en un partido según el SPEC §6.
 * Base = rating de API-Football (requiere >= 20'). El capitán duplica SOLO el rating base.
 *
 * Si el jugador no llegó a los 20' (tiempo reglamentario: 90' u 120' con tiempo extra,
 * sin contar el agregado), NO suma absolutamente nada — ni el rating, ni goles,
 * asistencias, tarjetas, etc. — y es el efectivo (titular o suplente que sí jugó
 * >= 20') quien puntúa en su lugar (ver computeEffectiveStarters). Esto garantiza que
 * cada equipo nunca sume más de 11 jugadores por fecha.
 */
export function calcularPuntos(s: StatsInput): PointsBreakdown {
  const played = s.minutes >= SCORING.minMinutes;

  if (!played) {
    return {
      base: 0,
      captainBonus: 0,
      goals: 0,
      assists: 0,
      cleanSheet: 0,
      penaltySaved: 0,
      goalsConceded: 0,
      motm: 0,
      cards: 0,
      ownGoals: 0,
      penaltyMissed: 0,
      total: 0,
    };
  }

  const base = s.rating != null ? Number(s.rating) : 0;
  const captainBonus = s.isCaptain ? base : 0; // duplica solo la calificación base

  const openPlayGoals = Math.max(0, s.goals - s.penaltyGoals);
  const goals = openPlayGoals * SCORING.goalByPosition[s.position] + s.penaltyGoals * SCORING.penaltyGoal;

  const assists = s.assists * SCORING.assist;
  const cleanSheet = s.cleanSheet ? SCORING.cleanSheet[s.position] : 0;
  const penaltySaved = s.penaltiesSaved * SCORING.penaltySaved;
  const goalsConceded = s.position === 'GK' ? s.goalsConceded * SCORING.goalConcededGK : 0;
  const motm = s.isMotm ? SCORING.motm : 0;

  // Roja (directa o por doble amarilla) = -4 fijo; no se suman las amarillas.
  const cards = s.red > 0 ? SCORING.red : s.yellow * SCORING.yellow;
  const ownGoals = s.ownGoals * SCORING.ownGoal;
  const penaltyMissed = s.penaltiesMissed * SCORING.penaltyMissed;

  const total =
    base +
    captainBonus +
    goals +
    assists +
    cleanSheet +
    penaltySaved +
    goalsConceded +
    motm +
    cards +
    ownGoals +
    penaltyMissed;

  return {
    base,
    captainBonus,
    goals,
    assists,
    cleanSheet,
    penaltySaved,
    goalsConceded,
    motm,
    cards,
    ownGoals,
    penaltyMissed,
    total: Math.round(total * 10) / 10,
  };
}

/** Puntos del técnico según el resultado de su selección en la fecha. */
export function calcularPuntosTecnico(result: 'win' | 'loss' | 'draw'): number {
  if (result === 'win') return SCORING.coachWin;
  if (result === 'loss') return SCORING.coachLoss;
  return 0;
}
