import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { matches, players, countries, playerMatchStats, rounds } from "@/lib/db/schema";

// Datos para una story "Resumen de partido" (ver SPEC §5). Se llenan 100% desde la
// DB después del sync (NO requiere publicar la fecha): resultado + mejor jugador
// (el que más fantasyPoints sumó). Todo puro — el render (Playwright) vive aparte.

export type Pos = "GK" | "DEF" | "MID" | "FWD";

export type StoryData = {
  fechaTorneo: number; // round order → tag "RESUMEN · FECHA N"
  grupo: string; // "Grupo A" (grupos) o la instancia (eliminatorias)
  estadio: string;
  estadoLinea: string; // "FINAL" o "FINAL · 22:00 HS"
  local: { sigla: string; code: string };
  visitante: { sigla: string; code: string };
  golesLocal: number;
  golesVisitante: number;
  jugador: {
    nombre: string;
    posicion: Pos;
    code: string; // código de país del jugador (clave de flags.json)
    puntos: number;
    figura: boolean;
    goles: number;
    asistencias: number;
    calificacion: string; // "9.0"
    vallaInvicta: boolean;
    amarilla: boolean;
    roja: boolean;
  };
};

export type FlagMap = Record<string, { name: string; group: string | null; b64: string }>;

// Color + siglas por posición (SPEC §2). DB usa GK/DEF/MID/FWD.
const POS: Record<Pos, { sigla: string; label: string; color: string }> = {
  GK: { sigla: "ARQ", label: "Arquero", color: "#E6B400" },
  DEF: { sigla: "DEF", label: "Defensor", color: "#1B4FD8" },
  MID: { sigla: "MED", label: "Mediocampista", color: "#1E9E4B" },
  FWD: { sigla: "DEL", label: "Delantero", color: "#D02B2B" },
};

const groupEs = (g: string | null) => (g ? g.replace(/^Group\s+/i, "Grupo ") : "");

// Snippets condicionales (copiados del comentario de assets/stories/template.html).
const FIGURA_SNIPPET = `<span style="background:#C8A24B;color:#111827;font-weight:800;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;padding:8px 16px;border-radius:6px;margin-left:14px;">★ Figura</span>`;
const YELLOW_SNIPPET = `<span style="display:inline-block;width:26px;height:38px;background:#FFC400;border:2px solid #111827;border-radius:4px;margin-left:12px;box-shadow:2px 2px 0 rgba(17,24,39,0.3);vertical-align:middle;"></span>`;
const RED_SNIPPET = `<span style="display:inline-block;width:26px;height:38px;background:#D02B2B;border:2px solid #111827;border-radius:4px;margin-left:12px;box-shadow:2px 2px 0 rgba(17,24,39,0.3);vertical-align:middle;"></span>`;

const stripB64 = (s: string) => s.replace(/^data:[^;]+;base64,/, "");

/** 3 chips según posición (SPEC §4): ofensivos GOLES/ASIST/CAL; defensivos VALLA/.../CAL. */
function chips(j: StoryData["jugador"]): { label: string; value: string }[] {
  const cal = { label: "CAL.", value: j.calificacion };
  if (j.posicion === "GK" || j.posicion === "DEF") {
    const second = j.goles > 0
      ? { label: "GOLES", value: String(j.goles) }
      : { label: "ASIST.", value: String(j.asistencias) };
    return [{ label: "VALLA", value: j.vallaInvicta ? "SÍ" : "NO" }, second, cal];
  }
  return [
    { label: "GOLES", value: String(j.goles) },
    { label: "ASIST.", value: String(j.asistencias) },
    cal,
  ];
}

/** Mapa de placeholders {{KEY}} → valor para el template. `logoB64` y las banderas van SIN el prefijo data:. */
export function buildPlaceholders(data: StoryData, flags: FlagMap, logoB64: string): Record<string, string> {
  const pos = POS[data.jugador.posicion];
  const flag = (code: string) => stripB64(flags[code]?.b64 ?? "");
  const [c1, c2, c3] = chips(data.jugador);
  return {
    LOGO_B64: stripB64(logoB64),
    FECHA_TORNEO: String(data.fechaTorneo),
    GRUPO: data.grupo,
    ESTADIO: data.estadio,
    LOCAL_FLAG_B64: flag(data.local.code),
    LOCAL_SIGLA: data.local.sigla,
    VIS_FLAG_B64: flag(data.visitante.code),
    VIS_SIGLA: data.visitante.sigla,
    GOLES_LOCAL: String(data.golesLocal),
    GOLES_VIS: String(data.golesVisitante),
    ESTADO_LINEA: data.estadoLinea,
    POS_COLOR: pos.color,
    POS_SIGLA: pos.sigla,
    POS_LABEL: pos.label,
    JUG_FLAG_B64: flag(data.jugador.code),
    JUG_PAIS_SIGLA: data.jugador.code,
    PUNTOS: String(data.jugador.puntos),
    NOMBRE: data.jugador.nombre,
    FIGURA_BADGE: data.jugador.figura ? FIGURA_SNIPPET : "",
    CARDS_BADGES: (data.jugador.amarilla ? YELLOW_SNIPPET : "") + (data.jugador.roja ? RED_SNIPPET : ""),
    CALIFICACION: data.jugador.calificacion,
    CHIP_1_LABEL: c1!.label,
    CHIP_1_VALUE: c1!.value,
    CHIP_2_LABEL: c2!.label,
    CHIP_2_VALUE: c2!.value,
    CHIP_3_LABEL: c3!.label,
    CHIP_3_VALUE: c3!.value,
  };
}

/** Reemplaza todos los {{KEY}} del template por sus valores (split/join: a prueba de chars especiales). */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  let html = template;
  for (const [k, v] of Object.entries(vars)) html = html.split(`{{${k}}}`).join(v);
  return html;
}

/** Datos de la story de un partido (resultado + mejor jugador). null si no hay stats cargadas. */
export async function getMatchRecap(matchId: number): Promise<StoryData | null> {
  const home = alias(countries, "home_c");
  const away = alias(countries, "away_c");
  const m = (
    await db
      .select({
        homeId: home.id,
        homeCode: home.code,
        homeGroup: home.groupLetter,
        awayId: away.id,
        awayCode: away.code,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        venue: matches.venue,
        roundName: rounds.name,
        roundOrder: rounds.order,
        roundType: rounds.type,
      })
      .from(matches)
      .innerJoin(home, eq(matches.homeCountryId, home.id))
      .innerJoin(away, eq(matches.awayCountryId, away.id))
      .innerJoin(rounds, eq(matches.roundId, rounds.id))
      .where(eq(matches.id, matchId))
      .limit(1)
  )[0];
  if (!m) return null;

  const best = (
    await db
      .select({
        name: players.name,
        position: players.position,
        countryId: players.countryId,
        code: countries.code,
        points: playerMatchStats.fantasyPoints,
        rating: playerMatchStats.rating,
        goals: playerMatchStats.goals,
        assists: playerMatchStats.assists,
        isMotm: playerMatchStats.isMotm,
        yellow: playerMatchStats.yellow,
        red: playerMatchStats.red,
      })
      .from(playerMatchStats)
      .innerJoin(players, eq(playerMatchStats.playerId, players.id))
      .innerJoin(countries, eq(players.countryId, countries.id))
      .where(eq(playerMatchStats.matchId, matchId))
      .orderBy(desc(playerMatchStats.fantasyPoints), desc(playerMatchStats.rating))
      .limit(1)
  )[0];
  if (!best) return null;

  // Valla invicta validada contra el marcador (SPEC §4): SÍ solo si el equipo del
  // jugador recibió 0 goles. No confiamos en un flag suelto.
  const isHome = best.countryId === m.homeId;
  const conceded = isHome ? m.awayScore ?? 0 : m.homeScore ?? 0;

  return {
    fechaTorneo: m.roundOrder,
    grupo: m.roundType === "group" ? groupEs(m.homeGroup) : m.roundName,
    estadio: m.venue ?? "",
    estadoLinea: "FINAL",
    local: { sigla: m.homeCode ?? "", code: m.homeCode ?? "" },
    visitante: { sigla: m.awayCode ?? "", code: m.awayCode ?? "" },
    golesLocal: m.homeScore ?? 0,
    golesVisitante: m.awayScore ?? 0,
    jugador: {
      nombre: best.name,
      posicion: (best.position as Pos) ?? "MID",
      code: best.code ?? "",
      puntos: Math.round(Number(best.points)),
      figura: best.isMotm,
      goles: best.goals,
      asistencias: best.assists,
      calificacion: best.rating != null ? Number(best.rating).toFixed(1) : "—",
      vallaInvicta: conceded === 0,
      amarilla: best.yellow > 0,
      roja: best.red > 0,
    },
  };
}

/** IDs de partidos terminados de una fecha (por su `order`), para generar todas sus stories. */
export async function listFinishedMatchIds(roundOrder: number): Promise<number[]> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(rounds, eq(matches.roundId, rounds.id))
    .where(and(eq(rounds.order, roundOrder), eq(matches.status, "finished")));
  return rows.map((r) => r.id);
}

// Datos de prueba (golden tests SPEC §7) para testear el render sin DB: `--demo`.
export const DEMO: StoryData[] = [
  {
    fechaTorneo: 1, grupo: "Grupo A", estadio: "Estadio Azteca", estadoLinea: "FINAL",
    local: { sigla: "MEX", code: "MEX" }, visitante: { sigla: "RSA", code: "RSA" },
    golesLocal: 2, golesVisitante: 0,
    jugador: { nombre: "Quiñones", posicion: "MID", code: "MEX", puntos: 19, figura: true, goles: 1, asistencias: 0, calificacion: "9.0", vallaInvicta: false, amarilla: false, roja: false },
  },
  {
    fechaTorneo: 1, grupo: "Grupo A", estadio: "Estadio Guadalajara", estadoLinea: "FINAL",
    local: { sigla: "KOR", code: "KOR" }, visitante: { sigla: "CZE", code: "CZE" },
    golesLocal: 2, golesVisitante: 1,
    jugador: { nombre: "Hwang", posicion: "MID", code: "KOR", puntos: 21, figura: true, goles: 1, asistencias: 1, calificacion: "9.0", vallaInvicta: false, amarilla: false, roja: false },
  },
  {
    fechaTorneo: 1, grupo: "Grupo D", estadio: "SoFi Stadium · Los Ángeles", estadoLinea: "FINAL",
    local: { sigla: "USA", code: "USA" }, visitante: { sigla: "PAR", code: "PAR" },
    golesLocal: 4, golesVisitante: 1,
    jugador: { nombre: "Balogun", posicion: "FWD", code: "USA", puntos: 21, figura: true, goles: 2, asistencias: 0, calificacion: "9.0", vallaInvicta: false, amarilla: false, roja: false },
  },
  {
    fechaTorneo: 1, grupo: "Grupo B", estadio: "BMO Field", estadoLinea: "FINAL",
    local: { sigla: "CAN", code: "CAN" }, visitante: { sigla: "BIH", code: "BIH" },
    golesLocal: 1, golesVisitante: 1,
    jugador: { nombre: "Muharemović", posicion: "DEF", code: "BIH", puntos: 12, figura: true, goles: 0, asistencias: 0, calificacion: "8.0", vallaInvicta: false, amarilla: false, roja: false },
  },
];
