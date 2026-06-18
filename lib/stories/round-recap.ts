import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FlagMap } from "./recap-data";
import { getRoundRecapData, coverHtml, podiumHtml, xiHtml, type RoundRecapData } from "./round-recap-data";
import { renderPng } from "./render";
import { uploadCarouselToSlack } from "./slack";

// Carrusel "resumen de fecha" → #SOCIAL. Mismos módulos para el script, el botón
// de /admin y el auto-posteo tras publicar (publishRoundAction). Carrusel = post
// 1080×1350 (como el scoreboard), no story.

const SIZE = { width: 1080, height: 1350 };
const ROOT = process.cwd();
let cache: { flags: FlagMap; logoB64: string } | null = null;

async function assets() {
  if (cache) return cache;
  const [flagsRaw, logo] = await Promise.all([
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf8"),
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
  ]);
  cache = { flags: JSON.parse(flagsRaw) as FlagMap, logoB64: logo.toString("base64") };
  return cache;
}

/** Renderiza las 3 imágenes del resumen a partir de los datos ya resueltos. */
export async function renderRoundRecap(data: RoundRecapData): Promise<{ buf: Buffer; filename: string }[]> {
  const { flags, logoB64 } = await assets();
  const base = `fecha${data.roundOrder}_resumen`;
  return [
    { buf: await renderPng(coverHtml(data, logoB64), SIZE), filename: `${base}_01_aviso.png` },
    { buf: await renderPng(podiumHtml(data, logoB64), SIZE), filename: `${base}_02_top3.png` },
    { buf: await renderPng(xiHtml(data, flags, logoB64), SIZE), filename: `${base}_03_xi.png` },
  ];
}

export function roundRecapComment(data: RoundRecapData): string {
  const top = data.topFecha[0];
  const lider = top ? ` Puntero: ${top.name} (${top.points} pts).` : "";
  return `🏆 ¡Puntos de la Fecha ${data.roundOrder} disponibles!${lider} Entrá a ver tu puntaje y el Mejor XI 👇`;
}

/**
 * Genera y postea el carrusel de resumen de una fecha a #SOCIAL. Devuelve false si
 * la fecha todavía no tiene puntos (no publicada). No es idempotente por diseño: el
 * auto-posteo corre una sola vez (al publicar) y el botón de admin es re-posteo explícito.
 */
export async function postRoundRecap(roundId: number): Promise<boolean> {
  const data = await getRoundRecapData(roundId);
  if (!data) return false;
  const pngs = await renderRoundRecap(data);
  await uploadCarouselToSlack(pngs, roundRecapComment(data));
  return true;
}
