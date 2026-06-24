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
 * Diff de jugadores de una alineación respecto del baseline, para el log de
 * auditoría (lineup_change_log). `in` = jugadores nuevos (están ahora, no estaban
 * en el baseline); `out` = jugadores que salieron (estaban en el baseline, ya no).
 *
 * `|in| === |out|` salvo en el armado inicial (baseline vacío → `in` = los 15,
 * `out` = []). Es PURO y simétrico a countPlayerChanges: `|in|` === el conteo de
 * cambios que cobra el server. Conserva el orden de entrada (estable para tests).
 * Mover titular↔suplente o cambiar capitán/técnico/formación NO aparece acá (el
 * conjunto de 15 es el mismo) — eso se audita con los otros campos del log.
 */
export function computeRosterDiff(
  currentPlayerIds: readonly number[],
  baselinePlayerIds: readonly number[],
): { in: number[]; out: number[] } {
  const base = new Set(baselinePlayerIds);
  const current = new Set(currentPlayerIds);
  return {
    in: currentPlayerIds.filter((id) => !base.has(id)),
    out: baselinePlayerIds.filter((id) => !current.has(id)),
  };
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

/**
 * Tally de cambios de una fecha cuyo baseline es el ÚLTIMO equipo CONFIRMADO
 * (no la fecha anterior). Una vez que confirmás un cambio, ese equipo queda
 * fijado y los cambios siguientes se cuentan contra él:
 * - `priorChanges`: cambios ya aplicados (y contabilizados) en la fecha.
 * - `newChanges`: cambios nuevos de esta edición vs el equipo confirmado.
 *
 * El cupo gratis es por fecha y se consume UNA sola vez: `priorChanges` ya pudo
 * haberlo usado, así que un cambio nuevo (incluso revertir uno confirmado) cuesta
 * pines. El total de la fecha (`priorChanges + newChanges`) es monótono creciente
 * → nunca hay "deshacer gratis".
 */
export function roundTally(p: {
  priorChanges: number;
  newChanges: number;
  freeChanges: number;
  isPremium: boolean;
  alreadySpent: number;
}) {
  const totalChanges = p.priorChanges + p.newChanges;
  const pinsTotal = pinsForChanges(totalChanges, { freeChanges: p.freeChanges, isPremium: p.isPremium });
  const pinsDue = pinsDueNow(pinsTotal, p.alreadySpent);
  // Cupo gratis que quedaba ANTES de esta edición y cuántos de los cambios nuevos
  // lo aprovechan (para el copy "X gratis y el resto en pines").
  const freeLeftBefore = freeChangesLeft(p.priorChanges, p.freeChanges);
  const freeUsedNow = Math.min(p.newChanges, freeLeftBefore);
  const freeLeft = freeChangesLeft(totalChanges, p.freeChanges);
  return { totalChanges, pinsTotal, pinsDue, freeLeft, freeUsedNow };
}
