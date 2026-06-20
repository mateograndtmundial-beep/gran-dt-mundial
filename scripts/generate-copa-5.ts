import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #5 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"5 · D-4").
 * "Escasez: cupo en vivo." Carrusel 2 placas 1080×1350.
 * Figura hero: GRILLA de 100 lugares (ocupados en dorado / libres en blanco) → el cupo finito se ve.
 * Familia visual copa (Lucide, cards borde negro + sombra dura, acento dorado, footer /COPA).
 *
 * ⚠️ EL NÚMERO ES REAL: sacalo de getCopasStatus al momento de publicar y pasalo por --enrolled.
 *    El default es SOLO un placeholder para previsualizar; NO publicar con él.
 *
 *   npx tsx scripts/generate-copa-5.ts --enrolled 72     # 72 anotados → quedan 28
 *   npx tsx scripts/generate-copa-5.ts                   # placeholder (avisa por consola)
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 2;
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const CAPACITY = Number(arg("capacity") ?? 100);
const ENROLLED_RAW = arg("enrolled");
const ENROLLED = Math.max(0, Math.min(CAPACITY, Number(ENROLLED_RAW ?? 68)));
const LEFT = CAPACITY - ENROLLED;

// ---- chrome común (familia copa: footer /COPA + tag Liga Premium) ----------
function doc(logoB64: string, titleFontCss: string, pagina: number, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--green:#16713F;}
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  .title,.title *,.num,.num *{font-family:'TitleHeavy',sans-serif !important;}
  .wrap{position:relative;width:1080px;height:1350px;background:var(--bg);overflow:hidden;padding:0 60px;}
  .texture{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");}
  .ghost{position:absolute;right:40px;bottom:56px;font-family:'TitleHeavy',sans-serif;font-size:320px;color:#111827;opacity:0.04;letter-spacing:-0.06em;line-height:1;}
  .hd{display:flex;align-items:center;gap:14px;padding-top:50px;position:relative;z-index:3;}
  .hd .lg{width:60px;height:60px;border-radius:50%;border:3px solid var(--blue);overflow:hidden;background:#fff;box-shadow:3px 3px 0 rgba(17,24,39,0.18);}
  .hd .lg img{width:100%;height:100%;display:block;}
  .hd .wm{font-weight:800;font-size:26px;text-transform:uppercase;letter-spacing:0.01em;}
  .hd .wm span{color:var(--blue);}
  .page{position:absolute;right:60px;top:54px;font-weight:800;font-size:15px;letter-spacing:0.1em;color:#9CA3AF;background:#fff;border:2px solid var(--ink);border-radius:6px;padding:7px 12px;box-shadow:3px 3px 0 rgba(17,24,39,0.2);z-index:3;}
  .page b{color:var(--ink);}
  .eyebrow{font-weight:800;font-size:22px;letter-spacing:0.16em;text-transform:uppercase;color:#9CA3AF;}
  .title{line-height:0.95;letter-spacing:0.005em;color:var(--ink);text-transform:uppercase;}
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);}
  .body{font-weight:500;color:var(--ink2);} .body b{font-weight:800;color:var(--ink);}
  .card{background:var(--surf);border:2px solid var(--ink);border-radius:14px;box-shadow:7px 7px 0 rgba(17,24,39,0.85);}
  .num{letter-spacing:-0.02em;line-height:1;color:var(--ink);}
  .content{position:relative;z-index:2;margin-top:40px;}
  .foot{position:absolute;left:60px;right:60px;bottom:46px;display:flex;align-items:center;justify-content:space-between;z-index:2;}
  .url{background:var(--ink);color:#fff;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:6px;padding:13px 20px;font-size:19px;}
  .foot .tag{font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-size:17px;color:#9CA3AF;}
  ${titleFontCss}
  </style></head><body>
  <div class="wrap">
    <div class="texture"></div><div class="ghost">11</div>
    <div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div></div>
    <div class="page"><b>${String(pagina).padStart(2, "0")}</b> / ${String(TOTAL).padStart(2, "0")}</div>
    ${body}
    <div class="foot"><div class="url">LOS11DESAMPA.COM/COPA</div><div class="tag">Liga Premium</div></div>
  </div></body></html>`;
}

// Íconos: paths OFICIALES de Lucide (node_modules/lucide-react), no dibujados a mano.
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const ICON = {
  trophy: (s = 46, c = "#7A5C10") => lucide('<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>', s, c),
  lock: (s = 40, c = "#7A5C10") => lucide('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s, c),
  clock: (s = 40, c = "#7A5C10") => lucide('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', s, c),
  flame: (s = 40, c = "#7A5C10") => lucide('<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>', s, c),
};

// figura hero: grilla de `capacity` lugares (ocupados dorado / libres blanco)
function seatGrid(enrolled: number, capacity: number): string {
  const cells = Array.from({ length: capacity }, (_, i) =>
    i < enrolled
      ? `<div style="aspect-ratio:1;border-radius:6px;background:linear-gradient(135deg,#DDBB60,#C8A24B);border:2px solid var(--gold-ink);"></div>`
      : `<div style="aspect-ratio:1;border-radius:6px;background:#fff;border:2px solid #D6DBE0;"></div>`
  ).join("");
  return `<div style="max-width:560px;margin:0 auto;display:grid;grid-template-columns:repeat(10,1fr);gap:7px;">${cells}</div>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Cupo en vivo: quedan [LEFT] de [CAPACITY] (grilla de 100)
function slide1() {
  return `<div class="content" style="margin-top:30px;">
    <div style="display:flex;align-items:center;gap:10px;">${ICON.flame(26, "#7A5C10")}<span class="eyebrow" style="color:var(--gold-ink);">Cupo en vivo · escasez</span></div>
    <div class="title" style="font-size:88px;margin-top:12px;">QUEDAN <span class="g">${LEFT}</span><br>DE ${CAPACITY}.</div>
    <p class="body" style="font-size:27px;line-height:1.34;margin-top:16px;max-width:940px;">Ya entraron <b>${ENROLLED}</b>. Son <b>${CAPACITY} y nada más</b>: cuando se llena, se cierra y no hay repechaje.</p>
    <div style="margin-top:26px;">${seatGrid(ENROLLED, CAPACITY)}</div>
    <div style="display:flex;justify-content:center;gap:28px;margin-top:18px;">
      <span style="display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:20px;color:var(--ink2);"><span style="width:18px;height:18px;border-radius:5px;background:var(--gold);border:2px solid var(--gold-ink);"></span>Ocupados (${ENROLLED})</span>
      <span style="display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:20px;color:var(--ink2);"><span style="width:18px;height:18px;border-radius:5px;background:#fff;border:2px solid #D6DBE0;"></span>Libres (${LEFT})</span>
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:128px;z-index:2;background:var(--dark);border:2px solid var(--gold);border-radius:16px;padding:24px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 rgba(17,24,39,.5);">
    <div><div class="eyebrow" style="font-size:15px;color:var(--gold);">Si lo pensás mucho…</div>
    <div style="color:#fff;font-weight:800;font-size:30px;line-height:1.05;margin-top:4px;">Te quedás afuera</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="color:#9AA6BF;font-weight:800;font-size:16px;letter-spacing:0.2em;">DESLIZÁ</div><div style="color:var(--gold);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · CTA: el que entra, juega por $400.000
function slide2() {
  const conf = (icon: string, title: string, desc: string) =>
    `<div class="card" style="display:flex;align-items:center;gap:22px;padding:24px 28px;">
      <div style="flex:0 0 auto;width:64px;height:64px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
      <div><div style="font-weight:800;font-size:28px;color:var(--ink);">${title}</div><p class="body" style="font-size:22px;line-height:1.28;margin-top:2px;">${desc}</p></div></div>`;
  return `<div class="content">
    <div class="eyebrow">El que entra</div>
    <div class="title" style="font-size:62px;margin-top:10px;">JUGÁS POR<br><span class="g">$400.000</span>.</div>
    <p class="body" style="font-size:28px;line-height:1.36;margin-top:18px;max-width:920px;">No es marketing de humo: son <b>${CAPACITY} lugares y nada más</b>. Los que entran juegan por el premio, repartido al top 10.</p>

    <div style="display:flex;flex-direction:column;gap:14px;margin-top:28px;">
      ${conf(ICON.lock(38), "Cuando se llena, se cierra", "Quedan " + LEFT + " lugares. No hay lista de espera ni repechaje.")}
      ${conf(ICON.clock(38), "Y cierra el 28/06", "Kickoff de 16vos. Lo que pase primero: cupo lleno o deadline.")}
      ${conf(ICON.trophy(38), "Entrada $5.000", "Una vez. Después jugás por $400.000 hasta la final.")}
    </div>

    <div style="margin-top:34px;background:var(--dark);border:2px solid var(--gold);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:44px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:29px;">¿Entrás o te lo vas a perder?</div>
      <div class="num" style="color:var(--gold);font-size:54px;margin-top:14px;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:20px;margin-top:14px;">Link y Bases y Condiciones en la bio</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  if (ENROLLED_RAW === undefined) {
    console.warn(`⚠️  Sin --enrolled: usando PLACEHOLDER ${ENROLLED}/${CAPACITY}. ` +
      `Antes de publicar, pasá el número real de getCopasStatus: --enrolled <N>.`);
  }
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-5");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides = [slide1, slide2];
  for (let i = 0; i < slides.length; i++) {
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!());
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `copa-5_${String(i + 1).padStart(2, "0")}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\nListo: ${TOTAL} slides (${ENROLLED}/${CAPACITY} ocupados) → ${path.relative(ROOT, outDir)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
