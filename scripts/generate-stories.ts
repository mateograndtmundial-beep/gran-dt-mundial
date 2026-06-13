import "dotenv/config";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import {
  getMatchRecap,
  listFinishedMatchIds,
  buildPlaceholders,
  fillTemplate,
  DEMO,
  type StoryData,
  type FlagMap,
} from "../lib/stories/recap-data";

/*
 * Generador de stories "Resumen de partido" → PNG 1080×1920 → Slack #SOCIAL.
 *
 * Uso (local, para testear):
 *   npm run stories -- --demo                 # 4 ejemplos (sin DB) → ./out/stories
 *   npm run stories -- --match 123            # un partido de la DB → ./out/stories
 *   npm run stories -- --round 1              # todos los partidos terminados de la fecha 1
 *   npm run stories -- --match 123 --slack    # + sube el PNG a #SOCIAL
 *   npm run stories -- --out ./tmp --demo     # cambia carpeta de salida
 *
 * Objetivo final: tras el sync de un partido terminado, generar la imagen y que
 * llegue lista a Slack. Este script es el motor; el disparo automático (cron/sync)
 * lo reusa llamando a renderStory()+uploadToSlack().
 */

const ROOT = process.cwd();
const TEMPLATE = path.join(ROOT, "assets", "stories", "template.html");
const FLAGS = path.join(ROOT, "assets", "stories", "flags.json");
const LOGO = path.join(ROOT, "public", "images", "logo", "logo-badge-192.png");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

/** Rellena el template y rasteriza a PNG 1080×1920 (render 2x + downscale LANCZOS, SPEC §0). */
async function renderStory(
  data: StoryData,
  ctx: { template: string; flags: FlagMap; logoB64: string },
): Promise<Buffer> {
  const html = fillTemplate(ctx.template, buildPlaceholders(data, ctx.flags, ctx.logoB64));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    return await sharp(shot).resize(1080, 1920, { kernel: "lanczos3" }).png().toBuffer();
  } finally {
    await browser.close();
  }
}

/** Sube un PNG a Slack (#SOCIAL) con files.uploadV2 (requiere scope files:write + SLACK_CHANNEL_SOCIAL = ID del canal). */
async function uploadToSlack(buf: Buffer, filename: string, comment: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_SOCIAL;
  if (!token) throw new Error("Falta SLACK_BOT_TOKEN");
  if (!channel) throw new Error("Falta SLACK_CHANNEL_SOCIAL (ID del canal, ej C0123ABC)");

  const r1 = await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ filename, length: String(buf.length) }),
  }).then((r) => r.json());
  if (!r1.ok) throw new Error(`getUploadURLExternal: ${r1.error}`);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "image/png" }), filename);
  const up = await fetch(r1.upload_url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`upload: HTTP ${up.status}`);

  const r3 = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ files: [{ id: r1.file_id, title: filename }], channel_id: channel, initial_comment: comment }),
  }).then((r) => r.json());
  if (!r3.ok) throw new Error(`completeUploadExternal: ${r3.error}`);
}

const fileName = (d: StoryData) => `fecha${d.fechaTorneo}_${d.local.code}_${d.visitante.code}.png`.toLowerCase();

async function main() {
  // 1) Resolver qué partidos renderizar.
  let items: StoryData[] = [];
  if (has("demo")) {
    items = DEMO;
  } else if (arg("match")) {
    const d = await getMatchRecap(Number(arg("match")));
    if (!d) throw new Error(`Partido ${arg("match")}: sin datos/stats cargadas todavía.`);
    items = [d];
  } else if (arg("round")) {
    const ids = await listFinishedMatchIds(Number(arg("round")));
    for (const id of ids) {
      const d = await getMatchRecap(id);
      if (d) items.push(d);
      else console.warn(`⚠ partido ${id}: sin stats, se saltea.`);
    }
  } else {
    console.error("Indicá qué generar: --demo | --match <id> | --round <order>");
    process.exit(1);
  }
  if (!items.length) {
    console.log("No hay partidos para generar.");
    return;
  }

  // 2) Cargar assets (template + banderas + logo).
  const [template, flagsRaw, logoBuf] = await Promise.all([
    readFile(TEMPLATE, "utf8"),
    readFile(FLAGS, "utf8"),
    readFile(LOGO),
  ]);
  const ctx = { template, flags: JSON.parse(flagsRaw) as FlagMap, logoB64: logoBuf.toString("base64") };

  const toSlack = has("slack");
  const outDir = path.join(ROOT, arg("out") ?? "out/stories");
  if (!toSlack) await mkdir(outDir, { recursive: true });

  // 3) Renderizar + entregar.
  for (const d of items) {
    const name = fileName(d);
    const png = await renderStory(d, ctx);
    if (toSlack) {
      const comment = `${d.local.sigla} ${d.golesLocal}-${d.golesVisitante} ${d.visitante.sigla} · mejor: ${d.jugador.nombre} (${d.jugador.puntos} pts)`;
      await uploadToSlack(png, name, comment);
      console.log(`✓ Slack #SOCIAL ← ${name}`);
    } else {
      const out = path.join(outDir, name);
      await writeFile(out, png);
      console.log(`✓ ${path.relative(ROOT, out)} (${(png.length / 1024).toFixed(0)} KB)`);
    }
  }
  console.log(`\nListo: ${items.length} story(s)${toSlack ? " → Slack" : ` → ${path.relative(ROOT, outDir)}`}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
