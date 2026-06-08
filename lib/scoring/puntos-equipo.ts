// Cálculo puro del puntaje de un equipo en una fecha. Sin acceso a DB para que sea
// testeable de forma aislada (ver puntos-equipo.test.ts). publishRound arma el
// contexto desde la DB y delega acá el cómputo.
import { calcularPuntosTecnico } from "@/lib/scoring/calcular-puntos";

export type LineupSlot = { playerId: number; isStarter: boolean; slot: string | null };

export type EntryScoringInput = {
  captainPlayerId: number | null;
  coachId: number | null;
  lineup: LineupSlot[];
};

export type ScoringContext = {
  /** playerId -> puntos de la fecha (suma de fantasyPoints de sus partidos). */
  pts: Map<number, number>;
  /** playerId -> suma de rating (solo partidos con >= minMinutes y rating no nulo). */
  base: Map<number, number>;
  /** ¿el jugador jugó la fecha (>= minMinutes)? */
  played: (playerId: number) => boolean;
  /** coachId -> countryId del técnico. */
  coachCountry: Map<number, number>;
  /** countryId -> resultado de la selección en la fecha. */
  countryResult: Map<number, "win" | "loss" | "draw">;
};

/** Redondeo a 1 decimal evitando drift de punto flotante (suma en décimos enteros). */
function roundTenths(values: number[]): number {
  const tenths = values.reduce((s, v) => s + Math.round(v * 10), 0);
  return tenths / 10;
}

/**
 * Mapea cada titular a quien efectivamente puntúa por él. Si un titular no jugó
 * (>= minMinutes), lo reemplaza el primer suplente disponible de su misma posición
 * que sí jugó (un suplente por posición). Si no hay reemplazo útil, queda el titular.
 */
export function computeEffectiveStarters(
  lineup: LineupSlot[],
  played: (playerId: number) => boolean,
): Map<number, number> {
  const starters = lineup.filter((l) => l.isStarter);
  const subsByPos = new Map<string, number[]>();
  for (const sub of lineup.filter((l) => !l.isStarter)) {
    const pos = (sub.slot ?? "").split("_")[1] ?? ""; // 'SUB_DEF' -> 'DEF'
    if (!subsByPos.has(pos)) subsByPos.set(pos, []);
    subsByPos.get(pos)!.push(sub.playerId);
  }
  const usedSub = new Map<string, number>();
  const effectiveOf = new Map<number, number>();
  for (const st of starters) {
    if (played(st.playerId)) {
      effectiveOf.set(st.playerId, st.playerId);
      continue;
    }
    const pos = (st.slot ?? "").split("_")[0] ?? ""; // 'DEF_2' -> 'DEF'
    const pool = subsByPos.get(pos) ?? [];
    const idx = usedSub.get(pos) ?? 0;
    if (idx < pool.length && played(pool[idx]!)) {
      usedSub.set(pos, idx + 1);
      effectiveOf.set(st.playerId, pool[idx]!);
    } else {
      effectiveOf.set(st.playerId, st.playerId); // sin reemplazo útil → titular (0 pts)
    }
  }
  return effectiveOf;
}

/**
 * Puntaje total del equipo en la fecha: titulares (con auto-sustitución) + bonus de
 * capitán + técnico.
 *
 * Bonus de capitán: duplica el rating base del capitán (suma de su rating en partidos con
 * >= minMinutes). Si el capitán no jugó lo suficiente o no tiene rating registrado, el
 * bonus es 0 — se pierde, NO pasa al suplente que lo reemplazó como titular.
 */
export function computeEntryTotal(entry: EntryScoringInput, ctx: ScoringContext): number {
  const starters = entry.lineup.filter((l) => l.isStarter);
  const effectiveOf = computeEffectiveStarters(entry.lineup, ctx.played);

  const terms: number[] = [];
  for (const st of starters) {
    terms.push(ctx.pts.get(effectiveOf.get(st.playerId) ?? st.playerId) ?? 0);
  }
  if (entry.captainPlayerId != null) {
    // El bonus de capitán NO se transfiere: si el capitán no jugó (>= minMinutes),
    // ctx.base no tiene su rating y el bonus es 0 — se pierde, no pasa al suplente
    // que lo reemplazó como titular.
    terms.push(ctx.base.get(entry.captainPlayerId) ?? 0);
  }
  if (entry.coachId != null) {
    const cc = ctx.coachCountry.get(entry.coachId);
    const res = cc != null ? ctx.countryResult.get(cc) : undefined;
    if (res) terms.push(calcularPuntosTecnico(res));
  }
  return roundTenths(terms);
}

/** Suma de puntos por fecha de un equipo, con redondeo robusto. */
export function sumRoundPoints(points: number[]): number {
  return roundTenths(points);
}
