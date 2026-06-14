import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMatchRecap, listFinishedMatchIds, DEMO, type StoryData } from "../lib/stories/recap-data";
import {
  generateStoryPng,
  postMatchRecap,
  postPendingRecaps,
  storyFileName,
} from "../lib/stories/recap";

/*
 * Generador de stories "Resumen de partido". Usa los MISMOS módulos que el cron y
 * el botón de /admin (lib/stories/recap) → mismo resultado en todos lados.
 *
 *   npm run stories -- --demo                 # 4 ejemplos (sin DB) → out/stories
 *   npm run stories -- --match 123            # un partido de la DB → out/stories
 *   npm run stories -- --round 1              # terminados de la fecha 1 → out/stories
 *   npm run stories -- --pending              # = el cron: postea a #SOCIAL lo pendiente
 *   npm run stories -- --match 123 --slack    # postea ese partido a #SOCIAL (y lo marca)
 *   npm run stories -- --demo --slack         # sube los ejemplos a #SOCIAL (no marca)
 *   npm run stories -- --out ./tmp --demo     # cambia carpeta de salida
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function toDisk(items: StoryData[]) {
  const outDir = path.join(process.cwd(), arg("out") ?? "out/stories");
  await mkdir(outDir, { recursive: true });
  for (const d of items) {
    const png = await generateStoryPng(d);
    const out = path.join(outDir, storyFileName(d));
    await writeFile(out, png);
    console.log(`✓ ${path.relative(process.cwd(), out)} (${(png.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\nListo: ${items.length} story(s) → ${path.relative(process.cwd(), outDir)}`);
}

async function main() {
  // --pending: idéntico al cron (postea a #SOCIAL todo lo terminado no posteado).
  if (has("pending")) {
    const r = await postPendingRecaps();
    console.log(`Pendientes → #SOCIAL: ${r.posted} posteada(s), ${r.skipped} omitida(s).`);
    return;
  }

  const toSlack = has("slack");

  // --demo: data de prueba (sin DB). SIEMPRE a disco — no postea a Slack para no
  // ensuciar #SOCIAL con data falsa (los nombres de archivo colisionan con los
  // partidos reales y confunden con "duplicados"). Para probar el upload real usá
  // --match <id> (que además marca recapPostedAt).
  if (has("demo")) {
    if (toSlack) console.warn("⚠ --demo no postea a Slack (data de prueba). Generando a disco. Para probar el upload usá --match <id>.");
    await toDisk(DEMO);
    return;
  }

  // Partidos reales por id o por fecha.
  let ids: number[] = [];
  if (arg("match")) ids = [Number(arg("match"))];
  else if (arg("round")) ids = await listFinishedMatchIds(Number(arg("round")));
  else {
    console.error("Usá: --demo | --match <id> | --round <order> | --pending   [--slack]");
    process.exit(1);
  }

  if (toSlack) {
    let posted = 0;
    let skipped = 0;
    for (const id of ids) {
      try {
        if (await postMatchRecap(id)) posted++;
        else { skipped++; console.warn(`⚠ partido ${id}: sin stats todavía`); }
      } catch (e) {
        skipped++;
        console.error(`✗ partido ${id}: ${(e as Error).message}`);
      }
    }
    console.log(`→ #SOCIAL: ${posted} posteada(s), ${skipped} omitida(s).`);
    return;
  }

  const items: StoryData[] = [];
  for (const id of ids) {
    const d = await getMatchRecap(id);
    if (d) items.push(d);
    else console.warn(`⚠ partido ${id}: sin stats, se saltea`);
  }
  if (!items.length) {
    console.log("No hay partidos con stats para generar.");
    return;
  }
  await toDisk(items);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
