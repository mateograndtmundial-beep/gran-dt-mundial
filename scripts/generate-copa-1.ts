import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #1 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"1 · D-8").
 * Carrusel HERO de 4 placas 1080×1350. Ángulo "LANZAMIENTO": hasta ahora se jugaba gratis entre
 * amigos; ahora llega la Liga Premium para competir por premios y demostrar quién sabe de verdad.
 * Voz en primera persona (premiamos / repartimos). Misma familia visual que generate-que-es.ts
 * (chrome, Archivo Black + Poppins, cards con sombra dura). Acento DORADO (premium). Datos exactos:
 * premio $400.000 al top 10, entrada $5.000, cupo 100, rankea desde 16vos, te sumás hasta 28/06.
 * Guía: docs/social/PLACAS-GUIDELINES.md + VISUAL-SYSTEM.md.
 *
 *   npx tsx scripts/generate-copa-1.ts          # → out/copa-1/copa-1_01..04.png
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 4;
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ---- chrome común (igual familia que generate-que-es.ts) -------------------
function doc(logoB64: string, titleFontCss: string, pagina: number, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--danger-bg:#FEE2E2;--green:#16713F;}
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
  shield: (s = 40, c = "#7A5C10") => lucide('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', s, c),
  doc: (s = 40, c = "#7A5C10") => lucide('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>', s, c),
  clock: (s = 40, c = "#7A5C10") => lucide('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', s, c),
};

// ---- slides ----------------------------------------------------------------

// 1 · Portada / lanzamiento: llegó la Liga Premium. Antes gratis entre amigos → ahora por premios.
//     Destaca fuerte que rankea DESDE 16vos → por eso hay tiempo HASTA el 28/06 (panel grande).
function slide1() {
  return `<div class="content" style="margin-top:50px;">
    <div class="eyebrow" style="font-size:23px;color:var(--gold-ink);">Nuevo · Mundial 2026</div>
    <div class="title" style="font-size:94px;margin-top:18px;">LLEGÓ LA<br><span class="g">LIGA PREMIUM.</span></div>
    <div style="height:5px;width:170px;background:var(--gold);border-radius:3px;margin-top:28px;"></div>
    <p class="body" style="font-size:29px;line-height:1.38;margin-top:22px;max-width:920px;">Hasta ahora jugabas <b>gratis con tus amigos</b>. Ahora competís <b>por premios de verdad</b> y demostrás quién sabe más de fútbol.</p>

    <p class="body" style="font-size:25px;line-height:1.32;margin-top:22px;max-width:920px;">Aunque el Mundial ya arrancó, la Liga Premium <b>rankea recién desde los 16vos</b>: por eso todavía estás a tiempo.</p>
    <div class="card" style="margin-top:18px;padding:24px 32px;background:var(--blue-light);border-color:var(--blue);box-shadow:6px 6px 0 var(--blue-border);display:flex;align-items:center;justify-content:center;gap:32px;">
      <div style="display:flex;align-items:baseline;gap:12px;">
        <span class="eyebrow" style="font-size:16px;color:var(--ink3);">Arranca en</span>
        <span class="title" style="font-size:60px;color:var(--blue);">16VOS</span>
      </div>
      <div style="width:2px;height:48px;background:var(--blue-border);"></div>
      <div style="display:flex;align-items:baseline;gap:12px;">
        <span class="eyebrow" style="font-size:16px;color:var(--ink3);">Te anotás hasta el</span>
        <span class="title" style="font-size:60px;color:var(--gold-ink);">28/06</span>
      </div>
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:130px;z-index:2;background:var(--dark);border:2px solid var(--gold);border-radius:18px;padding:38px 44px;box-shadow:9px 9px 0 rgba(17,24,39,.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div class="eyebrow" style="font-size:19px;color:var(--gold);">Premio garantizado · al top 10</div>
      <div style="flex:0 0 auto;width:66px;height:66px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 rgba(17,24,39,.4);">${ICON.trophy(42)}</div>
    </div>
    <div class="num" style="color:#fff;font-size:120px;line-height:0.92;margin-top:10px;">$400.000</div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:16px;">
      <div class="body" style="font-size:22px;color:#C7CFE0;max-width:560px;">Se reparte <b style="color:#fff;">sí o sí</b>, aunque no se llenen los 100.</div>
      <div style="display:flex;align-items:center;gap:9px;"><span style="color:#9AA6BF;font-weight:800;font-size:15px;letter-spacing:0.2em;">DESLIZÁ</span><span style="color:var(--gold);font-weight:800;font-size:36px;line-height:0.6;">&raquo;&raquo;</span></div>
    </div>
  </div>`;
}

// 2 · La oferta: $400.000 al top 10, entrada $5.000, cupo 100, abre HOY.
function slide2() {
  const stat = (big: string, label: string) =>
    `<div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:26px 8px;">
      <span class="num" style="font-size:52px;color:var(--ink);">${big}</span>
      <span class="eyebrow" style="font-size:17px;">${label}</span></div>`;
  return `<div class="content" style="margin-top:34px;">
    <div class="eyebrow">La oferta</div>
    <div class="title" style="font-size:60px;margin-top:10px;">JUGÁS POR <span class="g">$400.000</span><br>GARANTIZADOS.</div>

    <div style="margin-top:30px;background:var(--dark);border:2px solid var(--gold);border-radius:16px;padding:32px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 rgba(17,24,39,.55);">
      <div><div class="eyebrow" style="font-size:17px;color:var(--gold);">Premio total · al top 10</div>
      <div class="num" style="font-size:98px;color:#fff;margin-top:8px;">$400.000</div></div>
      <div style="flex:0 0 auto;width:108px;height:108px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(17,24,39,.4);">${ICON.trophy(66)}</div>
    </div>

    <div style="display:flex;gap:16px;margin-top:22px;">
      ${stat("$5.000", "Entrada")}
      ${stat("100", "Cupo")}
      ${stat("HOY", "Abre")}
    </div>

    <div class="card" style="margin-top:22px;padding:26px 30px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:7px 7px 0 var(--gold-border);">
      <p class="body" style="font-size:28px;line-height:1.35;">No es "el ganador se lleva todo": <b>premiamos al top 10</b>, desde <b>$120.000</b> el 1°. Y es <b>fijo</b>: repartimos los $400.000 completos <b>aunque no se llenen los 100</b>.</p>
    </div>
  </div>`;
}

// 3 · Cómo se juega: sos el DT, armás y dirigís (con cambios cada fecha). Rankea desde 16vos.
function slide3() {
  const col = (eyebrow: string, word: string, desc: string) =>
    `<div class="card" style="flex:1;padding:28px 26px;">
      <div class="eyebrow" style="font-size:17px;color:var(--ink3);">${eyebrow}</div>
      <div class="title" style="font-size:46px;margin-top:8px;color:var(--blue);">${word}</div>
      <p class="body" style="font-size:24px;line-height:1.32;margin-top:14px;">${desc}</p></div>`;
  return `<div class="content" style="margin-top:34px;">
    <div class="eyebrow">Cómo se juega</div>
    <div class="title" style="font-size:58px;margin-top:10px;">SOS EL <span class="b">DT</span>.<br>VOS ARMÁS Y DIRIGÍS.</div>

    <div style="display:flex;gap:18px;margin-top:30px;">
      ${col("Paso 1", "ARMÁS", "Elegís tus 15 figuras + DT con un presupuesto. Tu estrategia.")}
      ${col("Paso 2", "DIRIGÍS", "Cada fecha hacés cambios y movés tu equipo. No es fijo: lo ajustás vos.")}
    </div>

    <div class="card" style="margin-top:22px;padding:30px 34px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:7px 7px 0 var(--gold-border);">
      <div class="title" style="font-size:42px;color:var(--gold-ink);line-height:1.0;">RANKEA DESDE LOS 16VOS,<br>HASTA LA FINAL.</div>
      <p class="body" style="font-size:28px;line-height:1.38;margin-top:16px;">El que mejor <b>arma y dirige</b> su equipo, gana. Acá no adivinás: se ve <b>quién sabe de verdad</b>.</p>
    </div>
  </div>`;
}

// 4 · CTA + confianza: premio garantizado, se reparte sí o sí aunque no se llenen los 100.
function slide4() {
  const conf = (icon: string, title: string, desc: string) =>
    `<div class="card" style="display:flex;align-items:center;gap:22px;padding:22px 26px;">
      <div style="flex:0 0 auto;width:62px;height:62px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
      <div><div style="font-weight:800;font-size:27px;color:var(--ink);">${title}</div><p class="body" style="font-size:22px;line-height:1.28;margin-top:2px;">${desc}</p></div></div>`;
  return `<div class="content">
    <div class="eyebrow">Sumate</div>
    <div class="title" style="font-size:64px;margin-top:10px;">EL PREMIO SE<br>REPARTE <span class="g">SÍ O SÍ.</span></div>

    <div style="display:flex;flex-direction:column;gap:14px;margin-top:32px;">
      ${conf(ICON.shield(38), "Premio garantizado", "Repartimos los $400.000 al top 10, aunque no se llenen los 100.")}
      ${conf(ICON.doc(38), "Con Bases y Condiciones", "Reglas claras y públicas. Sin letra chica.")}
      ${conf(ICON.clock(38), "Cierra el 28/06", "Antes del primer partido de 16vos, o al llenar los 100.")}
    </div>

    <div style="margin-top:40px;background:var(--dark);border:2px solid var(--gold);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:48px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:30px;">Entrada $5.000 · Cupo 100</div>
      <div class="num" style="color:var(--gold);font-size:54px;margin-top:14px;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:21px;margin-top:16px;">Link y Bases y Condiciones en la bio</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-1");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides = [slide1, slide2, slide3, slide4];
  for (let i = 0; i < slides.length; i++) {
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!());
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `copa-1_${String(i + 1).padStart(2, "0")}.png`);
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
