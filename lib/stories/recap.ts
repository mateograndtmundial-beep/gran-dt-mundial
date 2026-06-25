import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, rounds } from "@/lib/db/schema";
import { SOCIAL_MIN_ROUND_ORDER } from "@/lib/game/config";
import {
  getMatchRecap,
  buildPlaceholders,
  fillTemplate,
  type StoryData,
  type FlagMap,
} from "./recap-data";
import { matchesWithCompleteStats } from "@/lib/scoring/stats-quality";
import { renderStoryPng } from "./render";
import { uploadStoryToSlack } from "./slack";

// Orquestación compartida por el script (npm run stories), el cron y el botón de
// admin → "el mismo resultado" en todos lados. Solo el motor de browser cambia por
// entorno (ver render.ts). Assets cacheados en memoria por proceso.

const ROOT = process.cwd();
let cache: { template: string; flags: FlagMap; logoB64: string } | null = null;

async function assets() {
  if (cache) return cache;
  const [template, flagsRaw, logoBuf] = await Promise.all([
    readFile(path.join(ROOT, "assets/stories/template.html"), "utf8"),
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf8"),
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
  ]);
  cache = { template, flags: JSON.parse(flagsRaw) as FlagMap, logoB64: logoBuf.toString("base64") };
  return cache;
}

export const storyFileName = (d: StoryData) =>
  `fecha${d.fechaTorneo}_${d.local.code}_${d.visitante.code}.png`.toLowerCase();

export const storyComment = (d: StoryData) =>
  `${d.local.sigla} ${d.golesLocal}-${d.golesVisitante} ${d.visitante.sigla} · mejor: ${d.jugador.nombre} (${d.jugador.puntos} pts)`;

/** Rellena el template con los datos y rasteriza a PNG. */
export async function generateStoryPng(data: StoryData): Promise<Buffer> {
  const { template, flags, logoB64 } = await assets();
  return renderStoryPng(fillTemplate(template, buildPlaceholders(data, flags, logoB64)));
}

/** Genera y postea la story de un partido a #SOCIAL, marcándolo (idempotente). false si aún no hay stats. */
export async function postMatchRecap(matchId: number): Promise<boolean> {
  const data = await getMatchRecap(matchId);
  if (!data) return false;
  const png = await generateStoryPng(data);
  await uploadStoryToSlack(png, storyFileName(data), storyComment(data));
  await db.update(matches).set({ recapPostedAt: new Date() }).where(eq(matches.id, matchId));
  return true;
}

/**
 * Postea las stories de todos los partidos TERMINADOS con stats cargadas que
 * todavía no se postearon (recap_posted_at IS NULL). Idempotente: lo que ya se
 * posteó no se repite; lo que aún no tiene stats se saltea y se reintenta luego.
 * Es lo que corre el cron y lo que dispara el botón de admin.
 */
export async function postPendingRecaps(): Promise<{ posted: number; skipped: number }> {
  const pend = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(rounds, eq(matches.roundId, rounds.id))
    .where(
      and(
        eq(matches.status, "finished"),
        isNull(matches.recapPostedAt),
        gte(rounds.order, SOCIAL_MIN_ROUND_ORDER),
      ),
    );
  // Solo posteamos partidos con stats COMPLETAS: API-Football marca FT antes de
  // tener todas las stats de jugadores; si posteamos antes sale la story con la
  // figura mal/vacía (e idempotente → queda así). Los incompletos se reintentan luego.
  const ready = await matchesWithCompleteStats(pend.map((m) => m.id));
  let posted = 0;
  let skipped = 0;
  for (const m of pend) {
    if (!ready.has(m.id)) {
      skipped++;
      continue;
    }
    try {
      if (await postMatchRecap(m.id)) posted++;
      else skipped++;
    } catch (e) {
      skipped++;
      console.error(`[stories] partido ${m.id}: ${(e as Error).message}`);
    }
  }
  return { posted, skipped };
}
