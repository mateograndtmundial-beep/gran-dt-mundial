import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderStoryPng } from "../lib/stories/render";

/*
 * Story 1080×1920 para FACEBOOK — pensada para la página "PLANETA GRAN DT" (foro de jugadores
 * de Gran DT). Ángulo a medida del público: "el Gran DT del Mundial" — lo mismo que ya saben
 * hacer (armar plantel + presupuesto, dirigir fecha a fecha) pero por premios de verdad.
 * Énfasis: ARRANCA EL DOMINGO (16vos) y todavía estás a tiempo de jugar por $400.000.
 * Misma familia visual que generate-copa-*.ts (Archivo Black + Poppins, acento DORADO premium,
 * cards con sombra dura). Datos exactos (docs/social/LANZAMIENTO-COPA.md + MONETIZACION.md):
 * premio $400.000 garantizado al top 10, entrada $5.000, cupo 100, rankea desde 16vos.
 * Voz en primera persona (premiamos / repartimos). Guía: docs/social/PLACAS-GUIDELINES.md.
 *
 *   npx tsx scripts/generate-story-planeta.ts          # → out/story-planeta/story-planeta.png
 */

const ROOT = process.cwd();
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// Íconos: paths OFICIALES de Lucide (node_modules/lucide-react), no dibujados a mano.
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const ICON = {
  trophy: (s = 46, c = "#7A5C10") => lucide('<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>', s, c),
  calendar: (s = 40, c = "#7A5C10") => lucide('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>', s, c),
  shield: (s = 40, c = "#7A5C10") => lucide('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', s, c),
};

function doc(logoB64: string, titleFontCss: string, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--dark:#101726;}
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  .title,.title *,.num,.num *{font-family:'TitleHeavy',sans-serif !important;}
  .wrap{position:relative;width:1080px;height:1920px;background:var(--bg);overflow:hidden;padding:0 72px;}
  .texture{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");}
  .ghost{position:absolute;right:30px;bottom:300px;font-family:'TitleHeavy',sans-serif;font-size:440px;color:#111827;opacity:0.04;letter-spacing:-0.06em;line-height:1;}
  .hd{display:flex;align-items:center;gap:16px;padding-top:64px;position:relative;z-index:3;}
  .hd .lg{width:68px;height:68px;border-radius:50%;border:3px solid var(--blue);overflow:hidden;background:#fff;box-shadow:3px 3px 0 rgba(17,24,39,0.18);}
  .hd .lg img{width:100%;height:100%;display:block;}
  .hd .wm{font-weight:800;font-size:29px;text-transform:uppercase;letter-spacing:0.01em;}
  .hd .wm span{color:var(--blue);}
  .eyebrow{font-weight:800;font-size:24px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold-ink);}
  .title{line-height:0.94;letter-spacing:0.005em;color:var(--ink);text-transform:uppercase;}
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);}
  .body{font-weight:500;color:var(--ink2);} .body b{font-weight:800;color:var(--ink);}
  .card{background:var(--surf);border:2px solid var(--ink);border-radius:16px;box-shadow:8px 8px 0 rgba(17,24,39,0.85);}
  .num{letter-spacing:-0.02em;line-height:1;color:var(--ink);}
  .content{position:relative;z-index:2;margin-top:40px;}
  ${titleFontCss}
  </style></head><body>
  <div class="wrap">
    <div class="texture"></div><div class="ghost">DT</div>
    <div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div></div>
    ${body}
  </div></body></html>`;
}

function story() {
  const stat = (icon: string, big: string, label: string) =>
    `<div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:22px 8px;">
      <div style="min-width:96px;height:54px;padding:0 22px;border-radius:13px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
      <span class="num" style="font-size:40px;color:var(--ink);">${big}</span>
      <span class="eyebrow" style="font-size:15px;color:var(--ink3);">${label}</span></div>`;

  return `<div class="content">
    <div class="eyebrow">Para los que la rompían en el Gran DT</div>
    <div class="title" style="font-size:104px;margin-top:18px;">LLEGÓ EL<br><span class="g">GRAN DT</span><br>DEL MUNDIAL.</div>
    <div style="height:6px;width:180px;background:var(--gold);border-radius:3px;margin-top:26px;"></div>
    <p class="body" style="font-size:31px;line-height:1.34;margin-top:24px;max-width:940px;">Armás <b>15 figuras + DT</b> con un presupuesto y <b>dirigís fecha a fecha</b>. Lo de siempre… pero ahora por <b>plata de verdad</b>.</p>

    <div style="margin-top:32px;background:var(--dark);border:2px solid var(--gold);border-radius:20px;padding:36px 46px;box-shadow:10px 10px 0 rgba(17,24,39,.55);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="eyebrow" style="font-size:20px;color:var(--gold);">Premio garantizado · al top 10</div>
        <div style="flex:0 0 auto;width:74px;height:74px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(17,24,39,.4);">${ICON.trophy(48)}</div>
      </div>
      <div class="num" style="color:#fff;font-size:132px;line-height:0.9;margin-top:12px;">$400.000</div>
      <div class="body" style="font-size:26px;color:#C7CFE0;margin-top:16px;">Los repartimos <b style="color:#fff;">sí o sí</b>, aunque no se llenen los 100.</div>
    </div>

    <div style="display:flex;gap:18px;margin-top:28px;">
      ${stat(ICON.calendar(30), "28/06", "Arranca (16vos)")}
      ${stat(`<span class="num" style="font-size:30px;color:var(--gold-ink);">$5.000</span>`, "Entrada", "Por única vez")}
      ${stat(`<span class="num" style="font-size:30px;color:var(--gold-ink);">100</span>`, "Cupo", "Y se cierra")}
    </div>

    <div class="card" style="margin-top:28px;padding:30px 38px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:8px 8px 0 var(--gold-border);">
      <div class="title" style="font-size:48px;color:var(--gold-ink);line-height:1.0;">ARRANCA EL DOMINGO.<br>ESTÁS A TIEMPO.</div>
      <p class="body" style="font-size:27px;line-height:1.34;margin-top:14px;">Rankea <b>desde los 16vos hasta la final</b>. Todavía entrás — cuando se llenan los <b>100 lugares</b>, se cierra.</p>
    </div>

    <div style="margin-top:28px;background:var(--dark);border:2px solid var(--gold);border-radius:20px;box-shadow:10px 10px 0 rgba(17,24,39,.6);padding:40px 46px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:30px;">Tocá el link de arriba para anotarte 👆</div>
      <div class="num" style="color:var(--gold);font-size:54px;margin-top:14px;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:22px;margin-top:14px;">Premio garantizado · con Bases y Condiciones</div>
    </div>
  </div>`;
}

async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/story-planeta");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const html = doc(logoB64, titleFontCss, story());
  const buf = await renderStoryPng(html);
  const file = path.join(outDir, "story-planeta.png");
  await writeFile(file, buf);
  console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
