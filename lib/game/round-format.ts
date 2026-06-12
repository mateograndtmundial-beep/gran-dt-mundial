// Formato de nombres de fecha para mostrar al usuario.
//
// Los nombres en la DB / config (lib/game/config.ts ROUNDS) son:
//   "Fecha 1 — Grupos (J1)", "Fecha 2 — Grupos (J2)", "Fecha 3 — Grupos (J3)",
//   "16vos de Final", "8vos de Final", "4tos de Final", "Semifinales", "Final".
//
// El artículo correcto depende de la instancia: las eliminatorias "Nvos/Ntos de
// Final" son plurales masculinas ("los 16vos de Final"), mientras que Semifinal y
// Final llevan "la". Antes el artículo estaba hardcodeado como "la", lo que
// producía "la 4tos de Final". Centralizamos acá para no repetir el bug.

/** Nombre corto: "Fecha 1 — Grupos (J1)" → "Fecha 1"; las knockout quedan igual. */
export function shortRoundName(name: string): string {
  return (name ?? "").split("—")[0]!.trim();
}

/**
 * Nombre para mostrar. Igual que `shortRoundName`, pero "Semifinales" se muestra
 * en singular ("Semifinal") para que combine con el artículo "la".
 */
export function roundDisplayName(name: string): string {
  const short = shortRoundName(name);
  if (/^semifinal/i.test(short)) return "Semifinal";
  return short;
}

/** Artículo correcto: "los" para las eliminatorias "Nvos/Ntos de Final", "la" para el resto. */
export function roundArticle(name: string): "la" | "los" {
  return /^\d+(vos|tos)\s+de\s+final/i.test(shortRoundName(name)) ? "los" : "la";
}

/** Nombre con artículo: "los 16vos de Final", "la Semifinal", "la Final", "la Fecha 1". */
export function roundWithArticle(name: string, opts?: { capitalize?: boolean }): string {
  const article = roundArticle(name);
  const a = opts?.capitalize ? article[0]!.toUpperCase() + article.slice(1) : article;
  return `${a} ${roundDisplayName(name)}`;
}

/**
 * Aclaración para la Final: incluye también el partido por el 3er puesto.
 * Devuelve "" para el resto de las fechas.
 */
export function roundNote(name: string): string {
  return roundDisplayName(name) === "Final" ? "(incluye el partido por el 3er puesto)" : "";
}
