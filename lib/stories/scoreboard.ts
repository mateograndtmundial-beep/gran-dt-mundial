import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, rounds, scoreboardPosts } from "@/lib/db/schema";
import { SOCIAL_MIN_ROUND_ORDER } from "@/lib/game/config";
import {
  getCarouselUnits,
  getUnitData,
  buildCoverPlaceholders,
  buildTeamPlaceholders,
  buildLegendPlaceholders,
  fillTemplate,
  type CarouselUnit,
  type UnitData,
  type IconAssets,
} from "./scoreboard-data";
import type { FlagMap } from "./recap-data";
import { renderPng } from "./render";
import { uploadCarouselToSlack } from "./slack";

// Orquestación del carrusel de puntajes. Mismos módulos para el script
// (npm run scoreboards), el cron y el botón de /admin → mismo resultado.
// Solo el motor de browser cambia por entorno (ver render.ts). Assets en memoria.

const SIZE = { width: 1080, height: 1350 };
const ROOT = process.cwd();

type Assets = {
  cover: string;
  team: string;
  legend: string;
  flags: FlagMap;
  logoB64: string;
  icons: IconAssets;
  titleFontCss: string; // @font-face de Archivo Black embebido para los títulos
};
let cache: Assets | null = null;

/**
 * Normaliza un ícono PNG para usarlo sobre el fondo claro de las filas:
 *  1) recorta el padding (trim),
 *  2) saca una eventual marca de agua al pie (banda de contenido corta separada
 *     del ícono por un espacio en blanco — típico watermark de banco de imágenes),
 *  3) convierte el blanco en transparente (alpha = luminancia invertida), dejando
 *     el ícono negro sin recuadro blanco detrás.
 */
async function processIcon(src: Buffer): Promise<string> {
  const trimmed = await sharp(src).trim().removeAlpha().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const grey = await sharp(trimmed).greyscale().raw().toBuffer();

  // Pixeles "con contenido" (< 230) por fila — detecta hasta watermarks gris claro.
  const dark = new Array<number>(H).fill(0);
  for (let y = 0; y < H; y++) {
    let c = 0;
    const off = y * W;
    for (let x = 0; x < W; x++) if (grey[off + x] < 230) c++;
    dark[y] = c;
  }

  // ¿Banda de contenido CORTA al pie, con un gap blanco que la separa del ícono? → watermark.
  let cropH = H;
  let yb = H - 1;
  while (yb >= 0 && dark[yb] === 0) yb--;
  if (yb >= 0) {
    let yt = yb;
    while (yt > 0 && dark[yt - 1] > 0) yt--;
    const bandH = yb - yt + 1;
    let g = yt - 1;
    let gap = 0;
    while (g >= 0 && dark[g] === 0) {
      gap++;
      g--;
    }
    if (g >= 0 && gap >= 3 && bandH <= Math.round(0.14 * H)) cropH = g + 1; // hay ícono arriba del gap
  }

  const cropped =
    cropH < H ? await sharp(trimmed).extract({ left: 0, top: 0, width: W, height: cropH }).toBuffer() : trimmed;

  // Re-trim (por si el recorte dejó borde) y armar alpha desde la luminancia invertida.
  const reTrimmed = await sharp(cropped).trim().removeAlpha().toBuffer();
  const { data: mask, info } = await sharp(reTrimmed)
    .greyscale()
    .toColourspace("b-w")
    .negate()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const png = await sharp(reTrimmed)
    .joinChannel(mask, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toBuffer();
  return png.toString("base64");
}

async function assets(): Promise<Assets> {
  if (cache) return cache;
  const A = "assets/stories";
  const [cover, team, legend, flagsRaw, logoBuf, gol, asist, golPen, penAtajado, titleFont] = await Promise.all([
    readFile(path.join(ROOT, A, "scoreboard-cover.html"), "utf8"),
    readFile(path.join(ROOT, A, "scoreboard-team.html"), "utf8"),
    readFile(path.join(ROOT, A, "scoreboard-legend.html"), "utf8"),
    readFile(path.join(ROOT, A, "flags.json"), "utf8"),
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, A, "icons/gol_pelota.png")),
    readFile(path.join(ROOT, A, "icons/asistencia_botin.png")),
    readFile(path.join(ROOT, A, "icons/gol_penal_arco.png")),
    readFile(path.join(ROOT, A, "icons/penal_atajado_guante.png")),
    readFile(path.join(ROOT, A, "fonts/archivo-black-latin.woff2")),
  ]);
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;
  const [golP, asistP, golPenP, penAtajadoP] = await Promise.all([
    processIcon(gol),
    processIcon(asist),
    processIcon(golPen),
    processIcon(penAtajado),
  ]);
  cache = {
    cover,
    team,
    legend,
    flags: JSON.parse(flagsRaw) as FlagMap,
    logoB64: logoBuf.toString("base64"),
    icons: { gol: golP, asist: asistP, golPen: golPenP, penAtajado: penAtajadoP },
    titleFontCss,
  };
  return cache;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Nombre base del carrusel: "grupo-a_fecha1" | "match-123". */
function unitSlug(unit: CarouselUnit): string {
  if (unit.kind === "group") return `grupo-${slug(unit.groupLetter)}_fecha${unit.roundOrder}`;
  return `${unit.bucket.replace(":", "-")}_fecha${unit.roundOrder}`;
}

/** Genera los PNGs del carrusel en orden: portada → tablas → leyenda. */
export async function generateUnitPngs(data: UnitData): Promise<{ buf: Buffer; filename: string }[]> {
  const { cover, team, legend, flags, logoB64, icons, titleFontCss } = await assets();
  const base = unitSlug(data.unit);
  const out: { buf: Buffer; filename: string }[] = [];

  // 1) Portada.
  out.push({
    buf: await renderPng(fillTemplate(cover, buildCoverPlaceholders(data, flags, logoB64, titleFontCss)), SIZE),
    filename: `${base}_01.png`,
  });

  // 2) Una tabla por equipo (paginas 2..N-1).
  for (let i = 0; i < data.teams.length; i++) {
    const pagina = i + 2;
    const ph = buildTeamPlaceholders(data.teams[i]!, data.subtitle, pagina, data.total, flags, logoB64, icons);
    out.push({
      buf: await renderPng(fillTemplate(team, ph), SIZE),
      filename: `${base}_${String(pagina).padStart(2, "0")}_${slug(data.teams[i]!.code)}.png`,
    });
  }

  // 3) Leyenda (último slide).
  out.push({
    buf: await renderPng(fillTemplate(legend, buildLegendPlaceholders(data.total, data.total, logoB64, icons, titleFontCss)), SIZE),
    filename: `${base}_${String(data.total).padStart(2, "0")}_leyenda.png`,
  });

  return out;
}

function unitComment(data: UnitData): string {
  const c = data.cover;
  const header = data.unit.kind === "group" ? `Grupo ${c.headerCode} · Fecha ${data.unit.roundOrder}` : c.instanceTitle;
  const games = c.matchBlocks.map((b) => `${b.homeSigla} ${b.hg}-${b.ag} ${b.awaySigla}`).join(" · ");
  return `📊 Puntajes — ${header}${games ? `\n${games}` : ""}`;
}

/** Genera y postea un carrusel a #SOCIAL, marcándolo en scoreboard_posts (idempotente). */
export async function postCarousel(unit: CarouselUnit): Promise<boolean> {
  const data = await getUnitData(unit);
  if (!data.teams.length) return false; // sin stats todavía
  const pngs = await generateUnitPngs(data);
  await uploadCarouselToSlack(pngs, unitComment(data));
  await db.insert(scoreboardPosts).values({ roundId: unit.roundId, bucket: unit.bucket }).onConflictDoNothing();
  return true;
}

/**
 * Postea los carruseles pendientes: para cada fecha con partidos terminados arma
 * sus unidades y postea las que no estén en scoreboard_posts (roundId, bucket).
 * Best-effort por unidad (try/catch). Es lo que corre el cron y el botón de admin.
 */
export async function postPendingScoreboards(): Promise<{ posted: number; skipped: number }> {
  // Fechas (desde SOCIAL_MIN_ROUND_ORDER) con al menos un partido terminado. Las
  // fechas anteriores ya pasaron y no se re-postean (ver config).
  const roundsWithFinished = await db
    .selectDistinct({ roundId: matches.roundId })
    .from(matches)
    .innerJoin(rounds, eq(matches.roundId, rounds.id))
    .where(and(eq(matches.status, "finished"), gte(rounds.order, SOCIAL_MIN_ROUND_ORDER)));

  let posted = 0;
  let skipped = 0;
  for (const { roundId } of roundsWithFinished) {
    const units = await getCarouselUnits(roundId);
    const done = new Set(
      (await db.select({ bucket: scoreboardPosts.bucket }).from(scoreboardPosts).where(eq(scoreboardPosts.roundId, roundId))).map(
        (r) => r.bucket,
      ),
    );
    for (const unit of units) {
      if (done.has(unit.bucket)) continue;
      try {
        if (await postCarousel(unit)) posted++;
        else skipped++;
      } catch (e) {
        skipped++;
        console.error(`[scoreboards] ${unit.bucket} (round ${roundId}): ${(e as Error).message}`);
      }
    }
  }
  return { posted, skipped };
}

/** Resuelve el id de una fecha por su `order` (para el CLI --round). */
export async function roundIdByOrder(order: number): Promise<number | null> {
  const r = (await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.order, order)).limit(1))[0];
  return r?.id ?? null;
}
