import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCarouselUnits, getUnitData, demoUnitData } from "../lib/stories/scoreboard-data";
import {
  generateUnitPngs,
  postCarousel,
  postPendingScoreboards,
  roundIdByOrder,
} from "../lib/stories/scoreboard";

/*
 * Generador del CARRUSEL de puntajes por grupo/fecha. Usa los MISMOS módulos que
 * el cron y el botón de /admin (lib/stories/scoreboard) → mismo resultado.
 *
 *   npm run scoreboards -- --demo                # ejemplo (sin DB) → out/scoreboards
 *   npm run scoreboards -- --round 1             # unidades de la fecha 1 → out/scoreboards
 *   npm run scoreboards -- --round 1 --slack     # postea esas unidades a #SOCIAL (idempotente)
 *   npm run scoreboards -- --pending             # = el cron: postea lo pendiente
 *   npm run scoreboards -- --out ./tmp --demo    # cambia carpeta de salida
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function unitToDisk(data: Awaited<ReturnType<typeof getUnitData>>, outDir: string) {
  const pngs = await generateUnitPngs(data);
  for (const { buf, filename } of pngs) {
    const out = path.join(outDir, filename);
    await writeFile(out, buf);
    console.log(`✓ ${path.relative(process.cwd(), out)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  return pngs.length;
}

async function main() {
  // --pending: idéntico al cron.
  if (has("pending")) {
    const r = await postPendingScoreboards();
    console.log(`Pendientes → #SOCIAL: ${r.posted} carrusel(es), ${r.skipped} omitido(s).`);
    return;
  }

  const outDir = path.join(process.cwd(), arg("out") ?? "out/scoreboards");

  // --demo: data de prueba (sin DB). SIEMPRE a disco (no postea a Slack).
  if (has("demo")) {
    if (has("slack")) console.warn("⚠ --demo no postea a Slack (data de prueba). Generando a disco.");
    await mkdir(outDir, { recursive: true });
    const n = await unitToDisk(demoUnitData(), outDir);
    console.log(`\nListo: 1 carrusel demo (${n} slides) → ${path.relative(process.cwd(), outDir)}`);
    return;
  }

  const order = arg("round");
  if (!order) {
    console.error("Usá: --demo | --round <order> [--slack] | --pending");
    process.exit(1);
  }
  const roundId = await roundIdByOrder(Number(order));
  if (!roundId) {
    console.error(`No existe la fecha con order=${order}.`);
    process.exit(1);
  }

  const units = await getCarouselUnits(roundId);
  if (!units.length) {
    console.log("No hay unidades listas para esta fecha (¿faltan partidos por terminar?).");
    return;
  }

  if (has("slack")) {
    let posted = 0;
    let skipped = 0;
    for (const unit of units) {
      try {
        if (await postCarousel(unit)) {
          posted++;
          console.log(`→ #SOCIAL: ${unit.bucket}`);
        } else {
          skipped++;
          console.warn(`⚠ ${unit.bucket}: sin stats todavía`);
        }
      } catch (e) {
        skipped++;
        console.error(`✗ ${unit.bucket}: ${(e as Error).message}`);
      }
    }
    console.log(`→ #SOCIAL: ${posted} carrusel(es), ${skipped} omitido(s).`);
    return;
  }

  await mkdir(outDir, { recursive: true });
  let total = 0;
  for (const unit of units) {
    const data = await getUnitData(unit);
    if (!data.teams.length) {
      console.warn(`⚠ ${unit.bucket}: sin stats, se saltea`);
      continue;
    }
    total += await unitToDisk(data, outDir);
  }
  console.log(`\nListo: ${units.length} unidad(es), ${total} slides → ${path.relative(process.cwd(), outDir)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
