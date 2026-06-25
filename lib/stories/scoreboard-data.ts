import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { matches, players, countries, playerMatchStats, rounds, coaches } from "@/lib/db/schema";
import { resolveMatchOutcome } from "@/lib/scoring/resultado-partido";
import { matchesWithCompleteStats } from "@/lib/scoring/stats-quality";
import { getMatchRecap, POS, POS_ORDER, fillTemplate, type Pos, type FlagMap } from "./recap-data";

// Datos del CARRUSEL de puntajes por grupo/fecha (1080×1350). Hermano de
// recap-data.ts (la story "figura del partido"), 100% desde la DB tras el sync.
// Una "unidad" = una publicación = un carrusel:
//   - fase de grupos: 1 carrusel por (fecha, grupo)  → ~2 partidos
//   - eliminatorias:  1 carrusel por partido
// Cada carrusel: portada + 1 tabla por equipo (titulares/suplentes + DT) + leyenda.
// Todo PURO; el render (Playwright) y la carga de assets viven en scoreboard.ts.

// Banderas que el arquero de minMinutes usa para la valla; el sync ya guarda 20'.
const MIN_MINUTES = 20;

// Código corto de la caja grande de portada en eliminatorias (por round.order).
const KO_HEADER_CODE: Record<number, string> = { 4: "16", 5: "8", 6: "4", 7: "SF", 8: "F" };

// ---------- tipos públicos ----------

export type CarouselUnit =
  | { kind: "group"; bucket: string; roundId: number; roundOrder: number; groupLetter: string; matchIds: number[] }
  | { kind: "knockout"; bucket: string; roundId: number; roundOrder: number; matchIds: number[] };

export type IconKind =
  | "gol" | "gol_pen" | "asist" | "pen_atajado"
  | "figura" | "valla" | "amarilla" | "roja"
  | "pen_errado" | "gol_contra" | "gol_recibido";

export type EventCount = { kind: IconKind; n: number };

export type PlayerRow = {
  pos: Pos;
  nombre: string;
  events: EventCount[];
  rating: string; // "7" o "-" (<20')
  pts: number;
  dim: boolean; // jugó < 20'
};

export type TeamData = {
  code: string; // clave de flags.json (= sigla)
  titulares: PlayerRow[];
  suplentes: PlayerRow[];
  dt: { nombre: string; resultado: "victoria" | "empate" | "derrota"; signo: string; color: string };
};

export type FigureData = { posSigla: string; posColor: string; nombre: string; pts: number };

export type MatchBlock = {
  homeSigla: string; homeCode: string; awaySigla: string; awayCode: string;
  hg: number; ag: number;
  fig: FigureData | null;
};

export type CoverData = {
  headerCode: string;
  instanceLabel: string;
  instanceTitle: string;
  instanceTitleSize: string;
  instanceSubtitle: string;
  matchBlocks: MatchBlock[];
};

export type UnitData = {
  unit: CarouselUnit;
  cover: CoverData;
  teams: TeamData[];
  subtitle: string; // "Puntajes · Fecha 1" — para cada tabla de equipo
  total: number; // total de slides del carrusel
};

/** base64 (sin prefijo data:) de los 4 íconos PNG, cargados por scoreboard.ts. */
export type IconAssets = { gol: string; asist: string; golPen: string; penAtajado: string };

// ---------- selección de unidades ----------

/**
 * Unidades a postear para una fecha (por su id). Grupos: una por grupo, solo
 * cuando TODOS los partidos de ese grupo en la fecha están terminados (no se
 * postea un grupo a medias). Eliminatorias: una por partido terminado.
 */
export async function getCarouselUnits(roundId: number): Promise<CarouselUnit[]> {
  const round = (
    await db.select({ id: rounds.id, order: rounds.order, type: rounds.type }).from(rounds).where(eq(rounds.id, roundId)).limit(1)
  )[0];
  if (!round) return [];

  const home = alias(countries, "home_c");
  const rows = await db
    .select({
      matchId: matches.id,
      status: matches.status,
      homeGroup: home.groupLetter,
    })
    .from(matches)
    .innerJoin(home, eq(matches.homeCountryId, home.id))
    .where(eq(matches.roundId, roundId))
    .orderBy(asc(matches.kickoff), asc(matches.id));

  // Solo consideramos "listo" un partido finished con stats COMPLETAS (no parciales:
  // API-Football marca FT antes de cargar todas las stats de jugadores). Evita
  // postear —y lockear, por ser idempotente— un carrusel con tablas vacías.
  const finishedIds = rows.filter((r) => r.status === "finished").map((r) => r.matchId);
  const ready = await matchesWithCompleteStats(finishedIds);

  if (round.type === "knockout") {
    return rows
      .filter((r) => r.status === "finished" && ready.has(r.matchId))
      .map((r) => ({
        kind: "knockout" as const,
        bucket: `match:${r.matchId}`,
        roundId,
        roundOrder: round.order,
        matchIds: [r.matchId],
      }));
  }

  // Grupos: agrupar por letra; emitir solo los grupos cuyos partidos están TODOS
  // terminados y con stats completas.
  const byGroup = new Map<string, { all: number[]; ready: number }>();
  for (const r of rows) {
    const letter = (r.homeGroup ?? "").replace(/^Group\s+/i, "").trim() || "?";
    const g = byGroup.get(letter) ?? { all: [], ready: 0 };
    g.all.push(r.matchId);
    if (r.status === "finished" && ready.has(r.matchId)) g.ready++;
    byGroup.set(letter, g);
  }
  const units: CarouselUnit[] = [];
  for (const [letter, g] of [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (g.all.length > 0 && g.ready === g.all.length) {
      units.push({
        kind: "group",
        bucket: `group:${letter}`,
        roundId,
        roundOrder: round.order,
        groupLetter: letter,
        matchIds: g.all,
      });
    }
  }
  return units;
}

// ---------- armado de datos de una unidad ----------

type MatchMeta = {
  homeCountryId: number; awayCountryId: number;
  homeCode: string; awayCode: string;
  homeScore: number | null; awayScore: number | null;
  homePenalties: number | null; awayPenalties: number | null;
};

async function getMatchMeta(matchId: number): Promise<MatchMeta | null> {
  const home = alias(countries, "home_c");
  const away = alias(countries, "away_c");
  const m = (
    await db
      .select({
        homeCountryId: home.id, awayCountryId: away.id,
        homeCode: home.code, awayCode: away.code,
        homeScore: matches.homeScore, awayScore: matches.awayScore,
        homePenalties: matches.homePenalties, awayPenalties: matches.awayPenalties,
      })
      .from(matches)
      .innerJoin(home, eq(matches.homeCountryId, home.id))
      .innerJoin(away, eq(matches.awayCountryId, away.id))
      .where(eq(matches.id, matchId))
      .limit(1)
  )[0];
  if (!m) return null;
  return {
    homeCountryId: m.homeCountryId, awayCountryId: m.awayCountryId,
    homeCode: m.homeCode ?? "", awayCode: m.awayCode ?? "",
    homeScore: m.homeScore, awayScore: m.awayScore,
    homePenalties: m.homePenalties, awayPenalties: m.awayPenalties,
  };
}

/** Eventos de una fila a partir de las stats (sin íconos: solo el conteo por tipo). */
function buildEvents(s: {
  position: Pos; minutes: number; goals: number; penaltyGoals: number; assists: number;
  penaltiesSaved: number; isMotm: boolean; cleanSheet: boolean; yellow: number; red: number;
  penaltiesMissed: number; ownGoals: number; goalsConceded: number;
}): EventCount[] {
  const ev: EventCount[] = [];
  const open = Math.max(0, s.goals - s.penaltyGoals);
  if (open > 0) ev.push({ kind: "gol", n: open });
  if (s.penaltyGoals > 0) ev.push({ kind: "gol_pen", n: s.penaltyGoals });
  if (s.assists > 0) ev.push({ kind: "asist", n: s.assists });
  if (s.penaltiesSaved > 0) ev.push({ kind: "pen_atajado", n: s.penaltiesSaved });
  if (s.isMotm) ev.push({ kind: "figura", n: 1 });
  if ((s.position === "GK" || s.position === "DEF") && s.cleanSheet && s.minutes >= MIN_MINUTES)
    ev.push({ kind: "valla", n: 1 });
  if (s.yellow > 0) ev.push({ kind: "amarilla", n: s.yellow });
  if (s.red > 0) ev.push({ kind: "roja", n: 1 });
  if (s.penaltiesMissed > 0) ev.push({ kind: "pen_errado", n: s.penaltiesMissed });
  if (s.ownGoals > 0) ev.push({ kind: "gol_contra", n: s.ownGoals });
  if (s.position === "GK" && s.goalsConceded > 0) ev.push({ kind: "gol_recibido", n: s.goalsConceded });
  return ev;
}

/** Tabla de un equipo (titulares/suplentes ordenados por puesto + fila DT). */
async function buildTeamData(matchId: number, countryId: number, meta: MatchMeta): Promise<TeamData> {
  const code = countryId === meta.homeCountryId ? meta.homeCode : meta.awayCode;

  const stats = await db
    .select({
      name: players.name,
      position: players.position,
      minutes: playerMatchStats.minutes,
      rating: playerMatchStats.rating,
      fantasyPoints: playerMatchStats.fantasyPoints,
      substitute: playerMatchStats.substitute,
      goals: playerMatchStats.goals,
      penaltyGoals: playerMatchStats.penaltyGoals,
      assists: playerMatchStats.assists,
      penaltiesSaved: playerMatchStats.penaltiesSaved,
      isMotm: playerMatchStats.isMotm,
      cleanSheet: playerMatchStats.cleanSheet,
      yellow: playerMatchStats.yellow,
      red: playerMatchStats.red,
      penaltiesMissed: playerMatchStats.penaltiesMissed,
      ownGoals: playerMatchStats.ownGoals,
      goalsConceded: playerMatchStats.goalsConceded,
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .where(and(eq(playerMatchStats.matchId, matchId), eq(players.countryId, countryId)));

  const toRow = (s: (typeof stats)[number]): PlayerRow => {
    const pos = (s.position as Pos) ?? "MID";
    const dim = s.minutes < MIN_MINUTES;
    return {
      pos,
      nombre: s.name,
      events: dim ? [] : buildEvents({ ...s, position: pos }),
      rating: dim || s.rating == null ? "-" : String(Math.round(Number(s.rating))),
      pts: dim ? 0 : Math.round(Number(s.fantasyPoints)),
      dim,
    };
  };

  // Orden ARQ→DEF→MED→DEL y, dentro de cada puesto, por puntos desc.
  const sortRows = (a: PlayerRow, b: PlayerRow) =>
    POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.pts - a.pts || a.nombre.localeCompare(b.nombre);

  // Solo jugadores que pisaron la cancha (minutes>0); el banco sin jugar no va.
  const played = stats.filter((s) => s.minutes > 0);
  // 6º cambio solo si hubo tiempo extra (algún jugador con >90'); si no, 5.
  const maxSubs = played.some((s) => s.minutes > 90) ? 6 : 5;
  // Titulares: arrancaron (substitute=false), tope 11. Suplentes: los que entraron
  // (substitute=true), tope 5 (90') / 6 (con alargue). El tope es una red de
  // seguridad para partidos cargados a mano (sin `substitute` real → todos false).
  const titulares = played.filter((s) => !s.substitute).map(toRow).sort(sortRows).slice(0, 11);
  const suplentes = played.filter((s) => s.substitute).map(toRow).sort(sortRows).slice(0, maxSubs);

  // DT: resultado del partido para ESTE país → ±2 / 0.
  const coach = (await db.select({ name: coaches.name }).from(coaches).where(eq(coaches.countryId, countryId)).limit(1))[0];
  const outcome = resolveMatchOutcome({
    homeCountryId: meta.homeCountryId, awayCountryId: meta.awayCountryId,
    homeScore: meta.homeScore, awayScore: meta.awayScore,
    homePenalties: meta.homePenalties, awayPenalties: meta.awayPenalties,
  });
  let dt: TeamData["dt"];
  if (outcome.decided && outcome.winnerId === countryId)
    dt = { nombre: coach?.name ?? "—", resultado: "victoria", signo: "+2", color: "#16713F" };
  else if (outcome.decided && outcome.loserId === countryId)
    dt = { nombre: coach?.name ?? "—", resultado: "derrota", signo: "−2", color: "#D02B2B" };
  else dt = { nombre: coach?.name ?? "—", resultado: "empate", signo: "0", color: "#6B7280" };

  return { code, titulares, suplentes, dt };
}

// Archivo Black es ancha → tamaños más conservadores para que no se desborden los
// títulos largos de eliminatorias ("16VOS DE FINAL") al lado del recuadro de código.
const titleSize = (t: string) => (t.length <= 7 ? "112px" : t.length <= 11 ? "82px" : "64px");

/** Arma TODOS los datos de una unidad: portada + tablas + paginación. */
export async function getUnitData(unit: CarouselUnit): Promise<UnitData> {
  const round = (await db.select({ name: rounds.name }).from(rounds).where(eq(rounds.id, unit.roundId)).limit(1))[0];
  const roundName = round?.name ?? "";

  const matchBlocks: MatchBlock[] = [];
  const teams: TeamData[] = [];
  for (const matchId of unit.matchIds) {
    const meta = await getMatchMeta(matchId);
    if (!meta) continue;

    const recap = await getMatchRecap(matchId); // figura del partido (mejor fantasyPoints)
    matchBlocks.push({
      homeSigla: meta.homeCode, homeCode: meta.homeCode,
      awaySigla: meta.awayCode, awayCode: meta.awayCode,
      hg: meta.homeScore ?? 0, ag: meta.awayScore ?? 0,
      fig: recap
        ? {
            posSigla: POS[recap.jugador.posicion].sigla,
            posColor: POS[recap.jugador.posicion].color,
            nombre: recap.jugador.nombre,
            pts: recap.jugador.puntos,
          }
        : null,
    });

    teams.push(await buildTeamData(matchId, meta.homeCountryId, meta));
    teams.push(await buildTeamData(matchId, meta.awayCountryId, meta));
  }

  const cover: CoverData =
    unit.kind === "group"
      ? {
          headerCode: unit.groupLetter,
          instanceLabel: `Grupo ${unit.groupLetter}`,
          instanceTitle: `FECHA ${unit.roundOrder}`,
          instanceTitleSize: "118px",
          instanceSubtitle: "Puntajes de la jornada",
          matchBlocks,
        }
      : {
          headerCode: KO_HEADER_CODE[unit.roundOrder] ?? "F",
          instanceLabel: "Eliminatorias",
          instanceTitle: roundName.toUpperCase(),
          instanceTitleSize: titleSize(roundName),
          instanceSubtitle: matchBlocks[0]
            ? `${matchBlocks[0].homeSigla} vs ${matchBlocks[0].awaySigla}`
            : "Puntajes",
          matchBlocks,
        };

  const subtitle = unit.kind === "group" ? `Puntajes · Fecha ${unit.roundOrder}` : `Puntajes · ${roundName}`;
  const total = 1 /* portada */ + teams.length + 1 /* leyenda */;

  return { unit, cover, teams, subtitle, total };
}

// ---------- íconos (filas 30px, leyenda 38px) ----------
// Los 4 PNG llegan ya recortados y con fondo TRANSPARENTE (procesados con sharp en
// scoreboard.ts) → sin recuadro blanco detrás. Los derivados (gol recibido, penal
// errado) se grisan con `filter:invert(...)` sobre el ícono negro transparente.

const PAD = (n: number) => String(n).padStart(2, "0");

const imgIcon = (b64: string, size: number, filter = "") =>
  `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;${filter}"><img src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-fit:contain;"></span>`;

const svgFigura = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><polygon points="24,5 29.5,17.8 43,19 32.5,28 35.8,41.5 24,34.2 12.2,41.5 15.5,28 5,19 18.5,17.8" fill="#C8A24B" stroke="#111827" stroke-width="2" stroke-linejoin="round"/></svg>`;
const svgValla = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M24 5 L40 10 V23 C40 33 33 40 24 43 C15 40 8 33 8 23 V10 Z" fill="#16713F" stroke="#111827" stroke-width="2.2" stroke-linejoin="round"/><rect x="18" y="22" width="12" height="10" rx="1.6" fill="#fff"/><path d="M20 22 V18.5 a4 4 0 0 1 8 0 V22" fill="none" stroke="#fff" stroke-width="2.2"/></svg>`;
const svgAmarilla = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect x="15" y="8" width="18" height="32" rx="3" fill="#FFC400" stroke="#111827" stroke-width="2.2"/></svg>`;
const svgRoja = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect x="15" y="8" width="18" height="32" rx="3" fill="#D02B2B" stroke="#111827" stroke-width="2.2"/></svg>`;

/** Glyph del ícono (sin badge ×N) según tipo, al tamaño `size`. */
export function iconGlyph(kind: IconKind, icons: IconAssets, size = 30): string {
  switch (kind) {
    case "gol": return imgIcon(icons.gol, size);
    case "asist": return imgIcon(icons.asist, size);
    case "gol_pen": return imgIcon(icons.golPen, size);
    case "pen_atajado": return imgIcon(icons.penAtajado, size);
    case "figura": return svgFigura(size);
    case "valla": return svgValla(size);
    case "amarilla": return svgAmarilla(size);
    case "roja": return svgRoja(size);
    case "gol_recibido": // arco en GRIS, transparente
      return imgIcon(icons.golPen, size, "filter:invert(0.55);");
    case "pen_errado": // pelota gris + diagonal roja
      return `<span style="position:relative;display:inline-flex;width:${size}px;height:${size}px;"><img src="data:image/png;base64,${icons.gol}" style="width:100%;height:100%;object-fit:contain;filter:invert(0.5);"><svg viewBox="0 0 48 48" style="position:absolute;inset:0;width:100%;height:100%;"><line x1="9" y1="9" x2="39" y2="39" stroke="#D02B2B" stroke-width="4" stroke-linecap="round"/></svg></span>`;
    case "gol_contra": // pelota (transparente) + flecha roja abajo
      return `<span style="position:relative;display:inline-flex;width:${size}px;height:${size}px;"><img src="data:image/png;base64,${icons.gol}" style="width:100%;height:100%;object-fit:contain;"><svg viewBox="0 0 48 48" style="position:absolute;right:-2px;bottom:-2px;width:55%;height:55%;"><circle cx="24" cy="24" r="20" fill="#fff" stroke="#111827" stroke-width="2"/><path d="M24 13 V33 M15 25 L24 34 L33 25" stroke="#B0212B" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
}

/** Concatena los chips de eventos de una fila (con badge ×N para duplicados). */
function eventIconsHtml(events: EventCount[], icons: IconAssets): string {
  return events
    .map((e) => {
      const badge = e.n > 1 ? `<span style="font-weight:800;font-size:17px;color:#374151;margin-left:1px;">×${e.n}</span>` : "";
      return `<span style="display:inline-flex;align-items:center;margin-right:8px;">${iconGlyph(e.kind, icons, 30)}${badge}</span>`;
    })
    .join("");
}

function playerRowHtml(r: PlayerRow, isSub: boolean, icons: IconAssets): string {
  const pos = POS[r.pos];
  const cls = `row${isSub ? " sub" : ""}${r.dim ? " dim" : ""}`;
  const nombre = r.dim
    ? `${r.nombre} <span style="font-size:0.7em;color:#9CA3AF;font-weight:600;">&lt;20'</span>`
    : r.nombre;
  const ptsColor = r.pts < 0 ? "#D02B2B" : "#111827";
  return (
    `<div class="${cls}">` +
    `<div class="bar" style="background:${pos.color};"></div>` +
    `<div class="pos" style="color:${pos.color};">${pos.sigla}</div>` +
    `<div style="flex:1;display:flex;align-items:center;min-width:0;">` +
    `<div class="nm">${nombre}</div><div class="ev">${eventIconsHtml(r.events, icons)}</div></div>` +
    `<div class="rt">${r.rating}</div>` +
    `<div class="pt" style="color:${ptsColor};">${r.pts}</div>` +
    `</div>`
  );
}

// ---------- builders de placeholders (mapas {{KEY}}→valor) ----------

const flagB64 = (flags: FlagMap, code: string) => (flags[code]?.b64 ?? "").replace(/^data:[^;]+;base64,/, "");
const logoStrip = (logoB64: string) => logoB64.replace(/^data:[^;]+;base64,/, "");

/** Bloque de partido de la portada (snippet MATCH_BLOCK de scoreboard-cover.html). */
function matchBlockHtml(b: MatchBlock, flags: FlagMap): string {
  const fig = b.fig ?? { posSigla: "—", posColor: "#6B7280", nombre: "—", pts: 0 };
  return (
    `<div style="background:#fff;border:2px solid #111827;border-radius:14px;box-shadow:6px 6px 0 rgba(17,24,39,0.85);overflow:hidden;margin-bottom:24px;">` +
    `<div style="background:#101726;display:flex;align-items:center;justify-content:space-between;padding:24px 36px;">` +
    `<div style="display:flex;align-items:center;gap:16px;"><span class="flag"><img src="data:image/png;base64,${flagB64(flags, b.homeCode)}" width="72" height="48"></span><span style="color:#fff;font-weight:800;font-size:40px;">${b.homeSigla}</span></div>` +
    `<div style="display:flex;align-items:center;gap:16px;"><span style="color:#fff;font-weight:800;font-size:64px;letter-spacing:-0.04em;">${b.hg}</span><span style="color:#5B86FF;font-weight:800;font-size:34px;">-</span><span style="color:#fff;font-weight:800;font-size:64px;letter-spacing:-0.04em;">${b.ag}</span></div>` +
    `<div style="display:flex;align-items:center;gap:16px;"><span style="color:#fff;font-weight:800;font-size:40px;">${b.awaySigla}</span><span class="flag"><img src="data:image/png;base64,${flagB64(flags, b.awayCode)}" width="72" height="48"></span></div>` +
    `</div>` +
    `<div style="display:flex;align-items:center;padding:32px 36px;gap:20px;">` +
    `<div style="width:64px;height:64px;border-radius:12px;background:${fig.posColor};display:flex;align-items:center;justify-content:center;flex:0 0 64px;box-shadow:3px 3px 0 #111827;"><span style="color:#fff;font-weight:800;font-size:20px;">${fig.posSigla}</span></div>` +
    `<div style="flex:1;"><div style="font-weight:700;font-size:16px;letter-spacing:0.14em;text-transform:uppercase;color:#9CA3AF;">Jugador destacado</div><div style="margin-top:9px;font-weight:800;font-size:38px;text-transform:uppercase;letter-spacing:-0.02em;line-height:1.05;">${fig.nombre}</div></div>` +
    `<div style="text-align:right;"><div style="font-weight:800;font-size:54px;letter-spacing:-0.04em;line-height:1;color:#111827;">${fig.pts}</div><div style="font-weight:700;font-size:16px;letter-spacing:0.14em;text-transform:uppercase;color:#6B7280;">Puntos</div></div>` +
    `</div></div>`
  );
}

/** Placeholders de la portada (slide 1). */
export function buildCoverPlaceholders(
  data: UnitData,
  flags: FlagMap,
  logoB64: string,
  titleFontCss: string,
): Record<string, string> {
  const c = data.cover;
  return {
    TITLE_FONT_CSS: titleFontCss,
    LOGO_B64: logoStrip(logoB64),
    PAGINA: "01",
    TOTAL: PAD(data.total),
    HEADER_CODE: c.headerCode,
    INSTANCE_LABEL: c.instanceLabel,
    INSTANCE_TITLE: c.instanceTitle,
    INSTANCE_TITLE_SIZE: c.instanceTitleSize,
    INSTANCE_SUBTITLE: c.instanceSubtitle,
    MATCH_BLOCKS: c.matchBlocks.map((b) => matchBlockHtml(b, flags)).join(""),
  };
}

/** Placeholders de una tabla de equipo (slide `pagina`). */
export function buildTeamPlaceholders(
  team: TeamData,
  subtitle: string,
  pagina: number,
  total: number,
  flags: FlagMap,
  logoB64: string,
  icons: IconAssets,
): Record<string, string> {
  const n = team.titulares.length + team.suplentes.length;
  return {
    LOGO_B64: logoStrip(logoB64),
    PAGINA: PAD(pagina),
    TOTAL: PAD(total),
    TEAM_FLAG_B64: flagB64(flags, team.code),
    TEAM_SIGLA: team.code,
    SUBTITLE: subtitle,
    ROW_CLASS: n >= 17 ? " compact" : "",
    ROWS_TITULARES: team.titulares.map((r) => playerRowHtml(r, false, icons)).join(""),
    ROWS_SUPLENTES: team.suplentes.map((r) => playerRowHtml(r, true, icons)).join(""),
    DT_NOMBRE: team.dt.nombre,
    DT_RESULTADO: team.dt.resultado,
    DT_SIGNO: team.dt.signo,
    DT_COLOR: team.dt.color,
  };
}

/** Placeholders de la leyenda (último slide). Los íconos (38px) salen del MISMO
 *  builder que las filas → leyenda y tablas siempre coinciden. */
export function buildLegendPlaceholders(
  pagina: number,
  total: number,
  logoB64: string,
  icons: IconAssets,
  titleFontCss: string,
): Record<string, string> {
  const ic = (k: IconKind) => iconGlyph(k, icons, 38);
  return {
    TITLE_FONT_CSS: titleFontCss,
    LOGO_B64: logoStrip(logoB64),
    PAGINA: PAD(pagina),
    TOTAL: PAD(total),
    IC_GOL: ic("gol"),
    IC_ASIST: ic("asist"),
    IC_GOLPEN: ic("gol_pen"),
    IC_PENATAJADO: ic("pen_atajado"),
    IC_FIGURA: ic("figura"),
    IC_VALLA: ic("valla"),
    IC_AMARILLA: ic("amarilla"),
    IC_ROJA: ic("roja"),
    IC_PENERRADO: ic("pen_errado"),
    IC_GOLRECIBIDO: ic("gol_recibido"),
    IC_GOLCONTRA: ic("gol_contra"),
  };
}

export { fillTemplate };

// ---------- demo (sin DB) para calibrar layout ----------

/** Unidad de prueba (sin DB): 1 partido, un equipo con 17 jugadores (caso compact). */
export function demoUnitData(): UnitData {
  const row = (pos: Pos, nombre: string, rating: number, pts: number, events: EventCount[] = [], dim = false): PlayerRow => ({
    pos, nombre, events, rating: dim ? "-" : String(rating), pts: dim ? 0 : pts, dim,
  });

  const titulares: PlayerRow[] = [
    row("GK", "Neuer", 7, 5, [{ kind: "valla", n: 1 }]),
    row("DEF", "Rüdiger", 7, 11, [{ kind: "gol", n: 1 }, { kind: "valla", n: 1 }]),
    row("DEF", "Kimmich", 8, 9, [{ kind: "asist", n: 1 }, { kind: "amarilla", n: 1 }]),
    row("DEF", "Tah", 6, 4, [{ kind: "valla", n: 1 }]),
    row("DEF", "Raum", 6, 2),
    row("MID", "Wirtz", 9, 21, [{ kind: "gol", n: 1 }, { kind: "asist", n: 2 }, { kind: "figura", n: 1 }]),
    row("MID", "Musiala", 8, 12, [{ kind: "gol", n: 1 }]),
    row("MID", "Andrich", 5, -2, [{ kind: "roja", n: 1 }]),
    row("FWD", "Havertz", 7, 7, [{ kind: "gol_pen", n: 1 }]),
    row("FWD", "Füllkrug", 6, 3, [{ kind: "pen_errado", n: 1 }, { kind: "gol", n: 1 }]),
    row("FWD", "Sané", 6, 0, [{ kind: "gol_contra", n: 1 }]),
  ];
  const suplentes: PlayerRow[] = [
    row("GK", "ter Stegen", 0, 0, [], true),
    row("DEF", "Schlotterbeck", 6, 1),
    row("MID", "Gündoğan", 7, 6, [{ kind: "asist", n: 1 }]),
    row("MID", "Groß", 0, 0, [], true),
    row("FWD", "Adeyemi", 6, 4, [{ kind: "gol", n: 1 }]),
    row("FWD", "Undav", 0, 0, [], true),
  ];

  const team: TeamData = {
    code: "GER",
    titulares,
    suplentes,
    dt: { nombre: "J. Nagelsmann", resultado: "victoria", signo: "+2", color: "#16713F" },
  };
  const teamB: TeamData = {
    code: "SCO",
    titulares: titulares.slice(0, 11).map((r) => ({ ...r, nombre: r.nombre + " (SCO)" })),
    suplentes: suplentes.slice(0, 4),
    dt: { nombre: "S. Clarke", resultado: "derrota", signo: "−2", color: "#D02B2B" },
  };

  const unit: CarouselUnit = { kind: "group", bucket: "group:A", roundId: 0, roundOrder: 1, groupLetter: "A", matchIds: [0] };
  const teams = [team, teamB];
  return {
    unit,
    cover: {
      headerCode: "A",
      instanceLabel: "Grupo A",
      instanceTitle: "FECHA 1",
      instanceTitleSize: "118px",
      instanceSubtitle: "Puntajes de la jornada",
      matchBlocks: [
        { homeSigla: "GER", homeCode: "GER", awaySigla: "SCO", awayCode: "SCO", hg: 3, ag: 1, fig: { posSigla: "MED", posColor: POS.MID.color, nombre: "Wirtz", pts: 21 } },
      ],
    },
    teams,
    subtitle: "Puntajes · Fecha 1",
    total: 1 + teams.length + 1,
  };
}
