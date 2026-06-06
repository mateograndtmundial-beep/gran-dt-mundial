import { PRICING } from "@/lib/game/config";

/** Redondea a 1 decimal (5,7 / 46,1). Evita ruido de punto flotante. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Percentil (interpolación lineal) sobre una lista de valores.
 * p en [0,100]. Lista no necesita venir ordenada.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Mapea un valor de mercado (en EUR) a un precio de juego continuo [MIN, MAX]
 * con 1 decimal. `mvRef` es el valor de mercado que mapea a ~MAX (percentil alto),
 * para que un par de megaestrellas clipeen al techo y no aplasten al resto.
 *
 * Curva sobre el valor (no por ranking): como el valor de mercado es de cola
 * pesada, la mayoría queda barata (cerca de MIN) y solo las estrellas caras.
 * GAMMA<1 levanta los medios; GAMMA>1 los aplana.
 */
export function computePrice(mvEur: number, mvRef: number): number {
  const { MIN, MAX, GAMMA } = PRICING;
  if (!mvRef || mvEur <= 0) return MIN;
  const f = clamp(mvEur / mvRef, 0, 1) ** GAMMA;
  return round1(clamp(MIN + (MAX - MIN) * f, MIN, MAX));
}
