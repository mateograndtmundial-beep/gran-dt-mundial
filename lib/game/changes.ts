// Lógica PURA de "cambios entre fechas" y su costo en pines. Es la fuente única
// que comparten el server (saveLineup, que decide y cobra) y el cliente (el
// contador en vivo + el cartel de confirmación del armador). Sin esto, el front
// duplicaría la fórmula y podría mostrar un número distinto al que el server cobra.

/**
 * Cantidad de cambios de una alineación respecto del baseline (los 15 de la fecha
 * ANTERIOR). Un "cambio" = un jugador que no estaba en la alineación anterior.
 * Mover a un jugador de titular a suplente, o cambiar capitán/técnico/formación,
 * NO cuenta (el conjunto de 15 jugadores es el mismo).
 *
 * Si no hay baseline (el usuario no tiene una fecha previa: primer equipo, o
 * estamos en la primera fecha del torneo) no hay nada contra qué comparar →
 * 0 cambios = armado/edición libre.
 */
export function countPlayerChanges(
  currentPlayerIds: Iterable<number>,
  baselinePlayerIds: readonly number[] | null,
): number {
  if (!baselinePlayerIds) return 0;
  const base = new Set(baselinePlayerIds);
  let changes = 0;
  for (const id of currentPlayerIds) if (!base.has(id)) changes++;
  return changes;
}

/**
 * Pines necesarios (TOTAL de la fecha) para `changes` cambios: los primeros
 * `freeChanges` son gratis, cada extra cuesta 1 pin. Los usuarios premium (pack
 * ilimitado) no pagan nunca. La reconciliación de lo ya gastado en re-ediciones
 * se hace aparte con `pinsDueNow`.
 */
export function pinsForChanges(
  changes: number,
  { freeChanges, isPremium }: { freeChanges: number; isPremium: boolean },
): number {
  if (isPremium) return 0;
  return Math.max(0, changes - freeChanges);
}

/** Cambios gratis que quedan disponibles (nunca negativo). */
export function freeChangesLeft(changes: number, freeChanges: number): number {
  return Math.max(0, freeChanges - changes);
}

/**
 * Pines a cobrar AHORA = total de la fecha menos lo ya gastado en esta fecha
 * (guardados previos). Acotado a >=0 para el chequeo de saldo en la UI; la
 * devolución real (delta negativo al revertir cambios) la maneja el server.
 */
export function pinsDueNow(totalPins: number, alreadySpent: number): number {
  return Math.max(0, totalPins - alreadySpent);
}
