/** Monto en pesos argentinos para la UI de la Copa: $5.000 · $400.000 (sin decimales). */
export function formatArs(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

/**
 * Fecha de arranque de la copa (día/mes, ej. "28/06") a partir de `closesAt`: el deadline
 * del round de scoring inicial = kickoff de los 16vos, que es justo cuando la Liga Premium
 * empieza a puntuar. Derivado del fixture (no hardcodeado) para que siga bien si se mueve.
 * En zona horaria de Argentina. null si todavía no hay deadline cargado.
 */
export function formatCopaStart(closesAt: string | Date | null): string | null {
  if (!closesAt) return null;
  return new Date(closesAt).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

/**
 * Frase de arranque para la UI: "Arranca el 28/06 con los 16vos de final" si hay fecha,
 * o el fallback genérico si el fixture de 16vos todavía no tiene deadline cargado.
 */
export function copaStartLine(closesAt: string | Date | null): string {
  const d = formatCopaStart(closesAt);
  return d ? `Arranca el ${d}, con los 16vos de final` : "Arranca con los 16vos de final";
}
