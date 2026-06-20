import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #9 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"9 · D-0").
 * "Cierra HOY + rescate al modo gratis." Carrusel 2 placas 1080×1350. Último llamado.
 * Slide 1: cierra la Premium HOY (urgencia máxima, premium, footer /COPA).
 * Slide 2: rescate — el que no llegó igual juega GRATIS (general, footer los11desampa.com).
 * Familia visual copa (Lucide, cards borde negro + sombra dura). Acento dorado/rojo (s1) y verde (s2).
 *
 * ⚠️ EL CUPO ES REAL: sacalo de getCopasStatus y pasalo por --enrolled. El default es placeholder
 *    para previsualizar (el script avisa por consola). Nunca inflar.
 * ⚠️ OPERATIVO: una vez cerrada la inscripción, frenar el CTA de pago (slide 1); queda solo el gratis.
 *
 *   npx tsx scripts/generate-copa-9.ts --enrolled 96   # 96 anotados → quedan 4
 *   npx tsx scripts/generate-copa-9.ts                 # placeholder (avisa por consola)
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
const ENROLLED = Math.max(0, Math.min(CAPACITY, Number(ENROLLED_RAW ?? 96)));
const LEFT = CAPACITY - ENROLLED;

// ---- chrome común (footer parametrizado: s1 = /COPA premium, s2 = general gratis) ----
function doc(
  logoB64: string,
  titleFontCss: string,
  pagina: number,
  body: string,
  footUrl: string,
  footTag: string
): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--danger-bg:#FDECEC;--danger-border:#F2C2C2;--green:#16713F;--green-bg:#E7F4ED;--green-border:#B8DEC8;}
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
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);} .title .r{color:var(--danger);} .title .gr{color:var(--green);}
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
    <div class="foot"><div class="url">${footUrl}</div><div class="tag">${footTag}</div></div>
  </div></body></html>`;
}

// Íconos: paths OFICIALES de Lucide (node_modules/lucide-react), no dibujados a mano.
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const ICON = {
  trophy: (s = 46, c = "#7A5C10") => lucide('<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>', s, c),
  ticket: (s = 40, c = "#7A5C10") => lucide('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>', s, c),
  bell: (s = 40, c = "#7A5C10") => lucide('<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>', s, c),
  gamepad: (s = 40, c = "#16713F") => lucide('<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/><path d="M9 8v2"/><path d="M8 9h2"/><path d="M15 9h.01"/><path d="M17 11h.01"/>', s, c),
  list: (s = 40, c = "#16713F") => lucide('<path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/>', s, c),
  users: (s = 40, c = "#16713F") => lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>', s, c),
};

// stat compacto para el recap del hero (slide 1)
function heroStat(value: string, label: string): string {
  return `<div style="flex:1;text-align:center;">
    <div class="num" style="font-size:38px;color:var(--gold);">${value}</div>
    <div style="font-weight:700;font-size:17px;letter-spacing:0.04em;color:#9AA6BF;margin-top:6px;text-transform:uppercase;">${label}</div>
  </div>`;
}

// card horizontal verde (slide 2, modo gratis)
function confG(icon: string, title: string, desc: string): string {
  return `<div class="card" style="display:flex;align-items:center;gap:22px;padding:24px 28px;border-color:var(--green);box-shadow:7px 7px 0 var(--green-border);">
    <div style="flex:0 0 auto;width:64px;height:64px;border-radius:14px;background:var(--green-bg);border:2px solid var(--green-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:27px;color:var(--ink);line-height:1.1;">${title}</div><p class="body" style="font-size:22px;line-height:1.28;margin-top:3px;">${desc}</p></div></div>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Cierra HOY (premium, urgencia máxima)
function slide1() {
  return `<div class="content" style="margin-top:34px;">
    <div style="display:flex;align-items:center;gap:10px;">${ICON.bell(26, "#D02B2B")}<span class="eyebrow" style="color:var(--danger);">Último llamado · cierra hoy</span></div>
    <div class="title" style="font-size:122px;margin-top:12px;">CIERRA<br><span class="r">HOY</span>.</div>
    <p class="body" style="font-size:29px;line-height:1.36;margin-top:18px;max-width:940px;">Hoy, antes de que ruede la pelota en <b>16vos</b>, cierra la inscripción a la Liga Premium. <b>Últimas horas</b> para entrar.</p>

    <div style="margin-top:34px;background:var(--dark);border:2px solid var(--gold);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:38px 40px 34px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:18px;">
        <span style="display:inline-flex;width:64px;height:64px;border-radius:50%;background:var(--danger);align-items:center;justify-content:center;box-shadow:0 6px 0 rgba(0,0,0,.3);">${ICON.bell(34, "#fff")}</span>
        <div class="num" style="font-size:78px;color:#fff;">ÚLTIMAS HORAS</div>
      </div>
      <div style="text-align:center;color:var(--gold);font-weight:800;font-size:21px;letter-spacing:0.06em;text-transform:uppercase;margin-top:10px;">para jugar por $400.000</div>
      <div style="display:flex;gap:10px;margin-top:34px;padding-top:30px;border-top:1px solid rgba(255,255,255,.1);">
        ${heroStat("$400.000", "al top 10")}
        <div style="width:1px;background:rgba(255,255,255,.12);"></div>
        ${heroStat(`${LEFT} de ${CAPACITY}`, "lugares libres")}
        <div style="width:1px;background:rgba(255,255,255,.12);"></div>
        ${heroStat("$5.000", "entrada")}
      </div>
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:128px;z-index:2;background:var(--danger-bg);border:2px solid var(--danger);border-radius:16px;padding:20px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 var(--danger-border);">
    <div><div class="eyebrow" style="font-size:15px;color:var(--danger);">¿No llegás a la Premium?</div>
    <div style="color:var(--ink);font-weight:800;font-size:30px;line-height:1.05;margin-top:4px;">Igual jugás gratis</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="font-weight:800;font-size:16px;letter-spacing:0.2em;color:var(--danger);">DESLIZÁ</div><div style="color:var(--danger);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · Rescate: jugá gratis igual (general, verde)
function slide2() {
  return `<div class="content" style="margin-top:32px;">
    <div style="display:flex;align-items:center;gap:10px;">${ICON.gamepad(26, "#16713F")}<span class="eyebrow" style="color:var(--green);">¿No llegaste? No pasa nada</span></div>
    <div class="title" style="font-size:78px;margin-top:12px;">JUGÁ <span class="gr">GRATIS</span><br>IGUAL.</div>
    <p class="body" style="font-size:29px;line-height:1.36;margin-top:18px;max-width:940px;">El juego sigue <b>gratis</b> para todos. No te quedes afuera de lo mejor del Mundial por no haber entrado a la Premium.</p>

    <div style="display:flex;flex-direction:column;gap:14px;margin-top:30px;">
      ${confG(ICON.gamepad(38), "Armá tu 11 gratis", "15 figuras + DT con presupuesto. Sin pagar nada, en 5 minutos.")}
      ${confG(ICON.list(38), "Metete en el ranking global", "Competís con todo el país desde la fecha que elijas, hasta la final.")}
      ${confG(ICON.users(38), "Liga privada con amigos", "Pasás el código y compiten entre ustedes todo lo que queda del Mundial.")}
    </div>

    <div style="margin-top:36px;background:var(--dark);border:2px solid var(--green);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:40px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:28px;">La pelota no espera</div>
      <div class="num" style="color:#7FE0A6;font-size:58px;margin-top:12px;">LOS11DESAMPA.COM</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:20px;margin-top:12px;">Armá tu equipo y jugá gratis hasta la final</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  if (ENROLLED_RAW === undefined) {
    console.warn(`⚠️  Sin --enrolled: usando PLACEHOLDER ${ENROLLED}/${CAPACITY}. ` +
      `Antes de publicar, pasá el número real de getCopasStatus: --enrolled <N>.`);
  }
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-9");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides: Array<[() => string, string, string]> = [
    [slide1, "LOS11DESAMPA.COM/COPA", "Liga Premium"],
    [slide2, "LOS11DESAMPA.COM", "Jugá gratis"],
  ];
  for (let i = 0; i < slides.length; i++) {
    const [fn, footUrl, footTag] = slides[i]!;
    const html = doc(logoB64, titleFontCss, i + 1, fn(), footUrl, footTag);
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `copa-9_${String(i + 1).padStart(2, "0")}.png`);
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
