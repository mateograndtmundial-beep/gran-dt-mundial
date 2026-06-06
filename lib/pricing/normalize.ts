// Letras que NFD no descompone (no llevan diacrítico combinable). Sin esto,
// "Łukasz" ↔ "Lukasz" o "Døgg" ↔ "Dogg" no cruzarían entre fuentes distintas.
const TRANSLIT: Record<string, string> = {
  ø: "o", œ: "oe", æ: "ae", ł: "l", đ: "d", ð: "d",
  ß: "ss", þ: "th", ı: "i", ŋ: "ng", ħ: "h", ʻ: "",
};

/**
 * Normaliza un nombre para cruzar fuentes (Transfermarkt ↔ API-Football):
 * minúsculas, sin acentos/diacríticos, transliterado, sin puntuación.
 *   "João Félix"  → "joao felix"
 *   "K. Mbappé"   → "k mbappe"
 *   "Łukasz"      → "lukasz"
 */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacríticos combinables
    .toLowerCase()
    .replace(/[øœæłđðßþıŋħʻ]/g, (m) => TRANSLIT[m] ?? "")
    .replace(/[^a-z0-9\s]/g, " ") // resto de puntuación → espacio
    .replace(/\s+/g, " ")
    .trim();
}

// Alias de países: API-Football y Transfermarkt nombran varias selecciones
// distinto. Mapeamos ambos lados a una clave canónica.
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  "united states of america": "united states",
  "south korea": "korea",
  "korea republic": "korea",
  "korea south": "korea",
  "north korea": "korea dpr",
  "ivory coast": "cote divoire",
  "cote d ivoire": "cote divoire",
  turkiye: "turkey",
  czechia: "czech republic",
  "congo dr": "dr congo",
  "dr congo": "dr congo",
  "democratic republic of the congo": "dr congo",
  "cape verde islands": "cape verde",
  "bosnia herzegovina": "bosnia",
  "bosnia and herzegovina": "bosnia",
  curacao: "curacao",
  "china pr": "china",
};

/** Normaliza un país a una clave canónica para el cruce (aplica alias). */
export function normalizeCountry(s: string): string {
  const n = normalizeName(s);
  return COUNTRY_ALIASES[n] ?? n;
}

// Palabras de "tipo de club" que sobran para comparar ("Aston Villa Football
// Club" ↔ "Aston Villa", "FC Bayern München" ↔ "Bayern").
const CLUB_STOPWORDS = new Set(["fc", "cf", "sc", "ac", "afc", "cd", "ad", "club", "football", "futbol", "association", "asociacion", "civil", "calcio", "de", "the"]);

/** Normaliza un club a una clave canónica (saca FC/Football Club/etc.). */
export function normalizeClub(s: string): string {
  return normalizeName(s)
    .split(" ")
    .filter((t) => t && !CLUB_STOPWORDS.has(t))
    .join(" ");
}
