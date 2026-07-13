import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Story 9:16 (1080×1920) — RECORDATORIO sensible al tiempo (no evergreen):
 *   "HOY 14:00 (ARG) arrancan los 8VOS del Mundial y se cierra la ventana
 *    de cambios". Es HOY → acento rojo (urgencia máxima).
 *
 * Misma familia visual que generate-reminders.ts / generate-highlights.ts:
 * chrome con header badge + wordmark, ghost "11", textura, sombras duras,
 * Archivo Black en títulos, Poppins en el cuerpo, íconos Lucide oficiales,
 * zonas seguras de Story, UN solo acento de color (rojo = urgencia/cierre).
 *
 * No toca la DB: el copy/horario se cablea acá. Si cambia el deadline, editar abajo.
 *
 *   npx tsx scripts/generate-story-8vos.ts   # → out/reminders/
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1920 };

// ─── Íconos: paths OFICIALES de Lucide ───
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const P = {
  alarm:
    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  trophy:
    '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
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

type Tones = { accent: string; accentBg: string; accentBorder: string };
function heroNumeralCard(iconPaths: string, labelText: string, bigHtml: string, subHtml: string, t: Tones): string {
  return `<div class="card" style="margin-top:40px;padding:0;overflow:hidden;">
    <div style="background:${t.accentBg};border-bottom:2px solid var(--ink);padding:24px 0;display:flex;align-items:center;justify-content:center;gap:14px;">
      ${lucide(iconPaths, 34, t.accent)}
      <span style="font-weight:800;font-size:33px;letter-spacing:0.14em;text-transform:uppercase;color:${t.accent};">${labelText}</span>
    </div>
    <div style="padding:40px 40px 44px;text-align:center;">
      <div style="display:flex;align-items:flex-start;justify-content:center;gap:16px;">${bigHtml}</div>
      <div style="width:330px;height:11px;background:${t.accent};border-radius:6px;margin:24px auto 0;box-shadow:5px 5px 0 ${t.accentBorder};"></div>
      <div class="title" style="font-size:50px;margin-top:24px;">${subHtml}</div>
    </div>
  </div>`;
}

// card horizontal (ícono + título + desc)
function iconCard(icon: string, title: string, desc: string, accBg: string, accBorder: string): string {
  return `<div class="card" style="display:flex;align-items:center;gap:24px;padding:26px 32px;">
    <div style="flex:0 0 auto;width:84px;height:84px;border-radius:16px;background:${accBg};border:2px solid ${accBorder};display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:31px;color:var(--ink);line-height:1.08;">${title}</div><p class="body" style="font-size:24px;line-height:1.3;margin-top:5px;">${desc}</p></div></div>`;
}

const RED: Tones = { accent: "#D02B2B", accentBg: "var(--danger-bg)", accentBorder: "var(--danger-border)" };

const html = `
  ${eyebrow(ic(P.alarm, "#D02B2B", 30), "Última oportunidad · HOY", "#D02B2B")}
  <div class="title" style="font-size:100px;margin-top:16px;">HACÉ TUS<br><span class="r">CAMBIOS</span><br>ANTES DE LAS 14</div>
  <p class="body" style="font-size:32px;line-height:1.36;margin-top:24px;"><b>HOY</b> arrancan los 8vos y <b>se cierra la edición</b>. Ajustá tu 11 y elegí capitán antes de que empiece la fecha.</p>
  ${heroNumeralCard(
    P.lock,
    "Cierra HOY a las",
    `<span class="num" style="font-size:200px;color:var(--ink);line-height:0.82;">14:00</span>`,
    `HORA DE <span class="r">ARGENTINA</span>`,
    RED,
  )}
  <div style="display:flex;flex-direction:column;gap:16px;margin-top:34px;">
    ${iconCard(ic(P.swap, "#D02B2B"), "Es tu ventana de cambios", "Ajustá el 11 y los suplentes para los 8vos.", "var(--danger-bg)", "var(--danger-border)")}
    ${iconCard(ic(P.lock, "#D02B2B"), "Cierra en pocas horas", "Después del pitazo inicial no se toca nada más.", "var(--danger-bg)", "var(--danger-border)")}
  </div>
  <p class="body" style="font-size:30px;line-height:1.32;margin-top:34px;text-align:center;">Dejá tu equipo listo en <b>los11desampa.com</b></p>`;

const foot: Foot = { url: "LOS11DESAMPA.COM", tag: "8vos · Mundial" };

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
  const outDir = path.join(ROOT, "out/reminders");
  await mkdir(outDir, { recursive: true });
  const buf = await renderPng(doc(logoB64, titleFontCss, html, foot), SIZE);
  const file = path.join(outDir, "story_8vos_cierre.png");
  await writeFile(file, buf);
  console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log("\nListo → out/reminders/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
