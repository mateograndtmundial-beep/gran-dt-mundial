import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Story 9:16 (1080×1920) — NOVEDAD (buena noticia, evergreen de playoffs):
 *   "Desde los 8VOS ahora tenés 2 CAMBIOS GRATIS por fecha (antes 1)".
 *   Paleta editorial: DORADO (el numeral/beneficio) + AZUL (estructura) + NEGRO
 *   (tinta/bordes). El hero es un comparativo 1 → 2 (comunica el "duplicamos"
 *   mejor que un solo número grande).
 *
 * Misma familia visual que generate-story-8vos.ts / generate-highlights.ts:
 * chrome con header badge + wordmark, ghost "11", textura, sombras duras,
 * Archivo Black en títulos, Poppins en el cuerpo, íconos Lucide oficiales,
 * zonas seguras de Story.
 *
 * No toca la DB: el copy se cablea acá.
 *
 *   npx tsx scripts/generate-story-cambios.ts   # → out/novedades/
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1920 };

// ─── Íconos: paths OFICIALES de Lucide ───
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const P = {
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  users:
    '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
};
const ic = (paths: string, c: string, s = 40) => lucide(paths, s, c);

// ─── Chrome 9:16 ───
type Foot = { url: string; tag: string };
function doc(logoB64: string, titleFontCss: string, inner: string, foot: Foot): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--danger-bg:#FDECEC;--danger-border:#F2C2C2;--green:#16713F;--green-bg:#E7F4ED;--green-border:#B8DEC8;}
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  .title,.title *,.num,.num *{font-family:'TitleHeavy',sans-serif !important;}
  .wrap{position:relative;width:1080px;height:1920px;background:var(--bg);overflow:hidden;padding:150px 70px 230px;display:flex;flex-direction:column;}
  .texture{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");}
  .ghost{position:absolute;right:-60px;bottom:-150px;font-family:'TitleHeavy',sans-serif;font-size:720px;color:#111827;opacity:0.04;letter-spacing:-0.06em;line-height:1;pointer-events:none;}
  .hd{display:flex;align-items:center;gap:18px;position:relative;z-index:3;}
  .hd .lg{width:80px;height:80px;border-radius:50%;border:3px solid var(--blue);overflow:hidden;background:#fff;box-shadow:3px 3px 0 rgba(17,24,39,0.18);flex:0 0 80px;}
  .hd .lg img{width:100%;height:100%;display:block;}
  .hd .wm{font-weight:800;font-size:33px;text-transform:uppercase;letter-spacing:0.01em;}
  .hd .wm span{color:var(--blue);}
  .eyebrow{display:flex;align-items:center;gap:12px;font-weight:800;font-size:26px;letter-spacing:0.14em;text-transform:uppercase;color:#9CA3AF;}
  .title{line-height:0.94;letter-spacing:0.005em;color:var(--ink);text-transform:uppercase;}
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);} .title .r{color:var(--danger);} .title .gr{color:var(--green);}
  .body{font-weight:500;color:var(--ink2);} .body b{font-weight:800;color:var(--ink);}
  .card{background:var(--surf);border:2px solid var(--ink);border-radius:16px;box-shadow:8px 8px 0 rgba(17,24,39,0.85);}
  .num{letter-spacing:-0.02em;line-height:1;color:var(--ink);}
  .content{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center;}
  .foot{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;margin-top:40px;}
  .url{background:var(--ink);color:#fff;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:8px;padding:18px 26px;font-size:24px;}
  .foot .tag{font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-size:21px;color:#9CA3AF;}
  ${titleFontCss}
  </style></head><body>
  <div class="wrap">
    <div class="texture"></div><div class="ghost">11</div>
    <div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div></div>
    <div class="content">${inner}</div>
    <div class="foot"><div class="url">${foot.url}</div><div class="tag">${foot.tag}</div></div>
  </div></body></html>`;
}

const eyebrow = (icon: string, text: string, color = "#9CA3AF") =>
  `<div class="eyebrow" style="color:${color};">${icon}<span>${text}</span></div>`;

// Hero comparativo ANTES 1 → AHORA 2. Header azul, numeral "antes" en gris apagado,
// numeral "ahora" en dorado dentro de un chip con sombra dura (protagonista).
function heroCompareCard(iconPaths: string, labelText: string): string {
  const col = (numHtml: string, label: string, labelColor: string) =>
    `<div style="text-align:center;">${numHtml}
      <div style="font-weight:800;font-size:29px;letter-spacing:0.14em;text-transform:uppercase;color:${labelColor};margin-top:16px;">${label}</div>
    </div>`;
  return `<div class="card" style="margin-top:40px;padding:0;overflow:hidden;">
    <div style="background:var(--blue-light);border-bottom:2px solid var(--ink);padding:24px 0;display:flex;align-items:center;justify-content:center;gap:14px;">
      ${lucide(iconPaths, 34, "#1B4FD8")}
      <span style="font-weight:800;font-size:33px;letter-spacing:0.14em;text-transform:uppercase;color:#1B4FD8;">${labelText}</span>
    </div>
    <div style="padding:48px 40px 50px;display:flex;align-items:center;justify-content:center;gap:30px;">
      ${col(
        `<div class="num" style="font-size:150px;color:var(--ink3);line-height:0.82;">1</div>`,
        "Antes",
        "var(--ink3)",
      )}
      <div style="flex:0 0 auto;margin-top:-38px;">${lucide(P.arrow, 84, "#111827", 2.5)}</div>
      ${col(
        `<div style="background:var(--gold-bg);border:3px solid var(--gold-border);border-radius:26px;padding:14px 46px;box-shadow:7px 7px 0 rgba(17,24,39,0.85);"><div class="num" style="font-size:178px;color:var(--gold-ink);line-height:0.9;">2</div></div>`,
        "Ahora",
        "var(--gold-ink)",
      )}
    </div>
  </div>`;
}

// card horizontal (ícono + título + desc)
function iconCard(icon: string, title: string, desc: string, accBg: string, accBorder: string): string {
  return `<div class="card" style="display:flex;align-items:center;gap:24px;padding:26px 32px;">
    <div style="flex:0 0 auto;width:84px;height:84px;border-radius:16px;background:${accBg};border:2px solid ${accBorder};display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:31px;color:var(--ink);line-height:1.08;">${title}</div><p class="body" style="font-size:24px;line-height:1.3;margin-top:5px;">${desc}</p></div></div>`;
}

const html = `
  ${eyebrow(ic(P.sparkles, "#7A5C10", 30), "Novedad · desde 8vos", "#7A5C10")}
  <div class="title" style="font-size:100px;margin-top:16px;">AHORA<br><span class="b">2 CAMBIOS</span><br>GRATIS</div>
  <p class="body" style="font-size:32px;line-height:1.36;margin-top:24px;">Desde los <b>8vos de Final</b> duplicamos los cambios sin costo: ahora movés <b>2 jugadores gratis</b> por fecha (antes era 1).</p>
  ${heroCompareCard(P.swap, "Cambios gratis por fecha")}
  <div style="display:flex;flex-direction:column;gap:16px;margin-top:34px;">
    ${iconCard(ic(P.users, "#1B4FD8"), "Para todos los DTs", "El cambio extra es para todos los equipos.", "var(--blue-light)", "var(--blue-border)")}
    ${iconCard(ic(P.refresh, "#1B4FD8"), "Rearmá tras las eliminaciones", "Reemplazá a los que quedaron afuera sin gastar pines.", "var(--blue-light)", "var(--blue-border)")}
  </div>
  <p class="body" style="font-size:30px;line-height:1.32;margin-top:34px;text-align:center;">Aprovechalo en <b>los11desampa.com</b></p>`;

const foot: Foot = { url: "LOS11DESAMPA.COM", tag: "Novedad · Playoffs" };

async function loadAssets() {
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;
  return { logoB64, titleFontCss };
}

async function main() {
  const { logoB64, titleFontCss } = await loadAssets();
  const outDir = path.join(ROOT, "out/novedades");
  await mkdir(outDir, { recursive: true });
  const buf = await renderPng(doc(logoB64, titleFontCss, html, foot), SIZE);
  const file = path.join(outDir, "story_cambios_2gratis.png");
  await writeFile(file, buf);
  console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log("\nListo → out/novedades/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
