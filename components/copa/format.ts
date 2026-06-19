/** Monto en pesos argentinos para la UI de la Copa: $5.000 · $400.000 (sin decimales). */
export function formatArs(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}
