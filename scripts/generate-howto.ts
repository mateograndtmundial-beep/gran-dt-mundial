import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Generador del carrusel "CÓMO SE JUEGA (gratis)" — la 1ª publicación anclada de IG.
 * 6 slides 1080×1350. Reusa el render de los scoreboards (lib/stories/render.ts) y el
 * "chrome" de marca (assets/social/howto-slide.html). Las imágenes reales de la app se
 * capturan aparte con Playwright MCP y se dejan en out/howto/shots/ (ver el plan).
 *
 *   npx tsx scripts/generate-howto.ts          # → out/howto/howto_01..06.png
 *   npx tsx scripts/generate-howto.ts --out X  # cambia carpeta de salida
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SHOTS = "out/howto/shots";

type Slide = {
  kind: "cover" | "shot" | "cta";
  pagina: number;
  eyebrow?: string;
  titleHtml: string;
  titleSize: number;
  bodyHtml?: string;
  badge?: string;
  shot?: string; // filename dentro de SHOTS
};

const SLIDES: Slide[] = [
  {
    kind: "cover",
    pagina: 1,
    badge: "GRATIS",
    titleHtml: "CÓMO SE<br>JUEGA<span>.</span>",
    titleSize: 130,
    bodyHtml:
      "El fantasy del <b>Mundial 2026</b>. Armás tu equipo y ganás por <b>saber de fútbol</b> — no por adivinar resultados.",
  },
  {
    kind: "shot",
    pagina: 2,
    eyebrow: "Paso 1",
    titleHtml: "ARMÁ TU EQUIPO",
    titleSize: 82,
    bodyHtml: "Elegís <b>15 jugadores + DT</b> con un presupuesto. Tu 11, tu estrategia, tu capitán.",
    shot: "shot-equipo.png",
  },
  {
    kind: "shot",
    pagina: 3,
    eyebrow: "Paso 2",
    titleHtml: "ELEGÍ ENTRE<br>LAS ESTRELLAS",
    titleSize: 70,
    bodyHtml: "Cracks de las <b>48 selecciones</b>. Cada uno cuesta según su valor real. ¿Te alcanza el presupuesto?",
    shot: "shot-jugadores.png",
  },
  {
    kind: "shot",
    pagina: 4,
    eyebrow: "Paso 3",
    titleHtml: "SUMÁS PUNTOS<br>REALES",
    titleSize: 70,
    bodyHtml:
      "Gol, asistencia, valla invicta, figura… puntuás por lo que pasa <b>de verdad</b> en la cancha.",
    shot: "shot-puntaje.png",
  },
  {
    kind: "shot",
    pagina: 5,
    eyebrow: "Paso 4",
    titleHtml: "COMPETÍ GRATIS",
    titleSize: 78,
    bodyHtml: "Ranking global + <b>ligas privadas</b> con tus amigos. Todo gratis, hasta la final.",
    shot: "shot-ligas.png",
  },
  {
    kind: "cta",
    pagina: 6,
    titleHtml: "¿ARRANCAMOS?",
    titleSize: 104,
    bodyHtml: "Armá tu equipo del Mundial en menos de 5 minutos. Es gratis.",
  },
];

const TOTAL = SLIDES.length;

function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/{{(\w+)}}/g, (_, k) => vars[k] ?? "");
}

async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/howto");
  await mkdir(outDir, { recursive: true });

  const A = "assets/social";
  const [tpl, logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, A, "howto-slide.html"), "utf8"),
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  for (const s of SLIDES) {
    let shotB64 = "";
    if (s.kind === "shot" && s.shot) {
      try {
        shotB64 = (await readFile(path.join(ROOT, SHOTS, s.shot))).toString("base64");
      } catch {
        console.warn(`⚠ falta el screenshot ${SHOTS}/${s.shot} — el slide ${s.pagina} sale sin imagen.`);
      }
    }

    const vars: Record<string, string> = {
      LOGO_B64: logoB64,
      TITLE_FONT_CSS: titleFontCss,
      PAGINA: String(s.pagina).padStart(2, "0"),
      TOTAL: String(TOTAL).padStart(2, "0"),
      EYEBROW: s.eyebrow ?? "",
      EYEBROW_STYLE: s.eyebrow ? "" : "display:none;",
      TITLE_HTML: s.titleHtml,
      TITLE_SIZE: String(s.titleSize),
      BODY_HTML: s.bodyHtml ?? "",
      BADGE_BLOCK: s.badge
        ? `<div class="badge">${s.badge}</div><div style="height:26px"></div>`
        : "",
      SHOT_B64: shotB64,
      SHOT_WRAP_STYLE:
        s.kind === "shot"
          ? "display:flex;justify-content:center;margin-top:46px;position:relative;z-index:2;"
          : "display:none;",
      DESLIZA_STYLE: s.kind === "cover" ? "" : "display:none;",
      CTA_STYLE: s.kind === "cta" ? "" : "display:none;",
    };

    const html = fill(tpl, vars);
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `howto_${String(s.pagina).padStart(2, "0")}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nListo: ${TOTAL} slides → ${path.relative(ROOT, outDir)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
