// Las banderas de API-Football (`countries.flagUrl`, media.api-sports.io) son
// PNG cuadrados con la bandera real más chica adentro y relleno blanco pintado
// para llenar el canvas cuadrado (mismo molde que usan para logos de equipo).
// Con `object-cover` en cajas rectangulares ese blanco queda visible como
// franjas — no es un bug de CSS, el padding es contenido de pixel.
//
// flagcdn.com sirve banderas reales ya recortadas (proporción real de cada
// país, sin relleno), indexadas por ISO 3166-1 alpha-2. Como `countries.code`
// en la DB es el código FIFA de 3 letras de API-Football, se mapea acá — son
// las 48 selecciones fijas del Mundial 2026, no hace falta resolverlo en
// runtime contra ninguna API.
const FIFA_TO_ISO2: Record<string, string> = {
  ALG: "dz",
  ARG: "ar",
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BIH: "ba",
  BRA: "br",
  CAN: "ca",
  CPV: "cv",
  COL: "co",
  CGO: "cd",
  CRO: "hr",
  CUR: "cw",
  CZE: "cz",
  ECU: "ec",
  EGY: "eg",
  ENG: "gb-eng",
  FRA: "fr",
  GER: "de",
  GHA: "gh",
  HAI: "ht",
  IRN: "ir",
  IRQ: "iq",
  CIV: "ci",
  JPN: "jp",
  JOR: "jo",
  MEX: "mx",
  MAR: "ma",
  NED: "nl",
  NZL: "nz",
  NOR: "no",
  PAN: "pa",
  PAR: "py",
  POR: "pt",
  QAT: "qa",
  KSA: "sa",
  SCO: "gb-sct",
  SEN: "sn",
  RSA: "za",
  KOR: "kr",
  ESP: "es",
  SWE: "se",
  SUI: "ch",
  TUN: "tn",
  TUR: "tr",
  USA: "us",
  URU: "uy",
  UZB: "uz",
};

/**
 * URL de flagcdn.com para el código FIFA de un país (`countries.code`).
 * Devuelve `null` si el código es desconocido (selección nueva sin mapear
 * todavía) para que el caller caiga al placeholder de siempre.
 */
export function flagUrl(code: string | null | undefined, widthPx: 20 | 40 | 80 | 160 = 80): string | null {
  if (!code) return null;
  const iso2 = FIFA_TO_ISO2[code];
  if (!iso2) return null;
  return `https://flagcdn.com/w${widthPx}/${iso2}.png`;
}
