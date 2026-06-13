import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { asc } from "drizzle-orm";
import { db } from "../lib/db";
import { countries } from "../lib/db/schema";

// Genera assets/stories/flags.json: banderas REALES precargadas (base64) por código
// de país (ARG, MEX, RSA, KOR…), tomadas de countries.flagUrl — las mismas que ya
// usa el sitio (API-Football). Versionado en el repo para que el generador de
// stories NUNCA dependa de la red ni adivine/dibuje banderas (causa de error en la
// SPEC §6). Re-correr solo si cambian los países:
//   npx tsx scripts/build-stories-flags.ts

async function main() {
  const rows = await db
    .select({ name: countries.name, code: countries.code, group: countries.groupLetter, flagUrl: countries.flagUrl })
    .from(countries)
    .orderBy(asc(countries.name));

  const out: Record<string, { name: string; group: string | null; b64: string }> = {};
  let ok = 0;
  let fail = 0;
  for (const c of rows) {
    if (!c.code || !c.flagUrl) {
      console.warn(`⚠ ${c.name}: falta ${!c.code ? "code" : "flagUrl"}`);
      fail++;
      continue;
    }
    try {
      const res = await fetch(c.flagUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = Buffer.from(await res.arrayBuffer());
      // Las PNG de API-Football vienen 150×150 sin optimizar (~88 KB). Las achico a
      // 256px de ancho y re-codifico como PNG con paleta (las banderas tienen pocos
      // colores) → de ~88 KB a unos pocos KB, sin perder nitidez al render (132×88).
      const buf = await sharp(raw)
        .resize({ width: 256, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
      out[c.code] = { name: c.name, group: c.group, b64: `data:image/png;base64,${buf.toString("base64")}` };
      ok++;
      console.log(`✓ ${c.code.padEnd(4)} ${c.name} (${(raw.length / 1024).toFixed(0)}→${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.warn(`✗ ${c.code} ${c.name}: ${(e as Error).message}`);
      fail++;
    }
  }

  const dir = path.join(process.cwd(), "assets", "stories");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "flags.json");
  await writeFile(file, JSON.stringify(out, null, 0));
  console.log(`\nListo: ${ok} banderas, ${fail} fallidas → ${path.relative(process.cwd(), file)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
