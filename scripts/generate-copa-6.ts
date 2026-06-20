import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #6 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"6 · D-3").
 * "Jugá gratis con tus amigos." Carrusel 3 placas 1080×1350.
 * Objetivo: 🎮 GENERAL — captar jugador nuevo gratis (liga privada con el grupo), con puente suave
 * a la Liga Premium. NO es pieza paga: footer general (los11desampa.com), sin link a B&C.
 * Ángulo: "el prode del grupo, pero bien hecho" — sin fricción, mejor que una planilla de Excel.
 * Figura por slide: mockup de chat del grupo (portada) → 3 pasos + mini-ranking de liga privada →
 * puente gratis vs Premium + CTA.
 * Familia visual copa (Lucide, cards borde negro + sombra dura, acento dorado).
 * Guías: docs/social/{PLACAS-GUIDELINES,VISUAL-SYSTEM,COPY-VOICE}.md.
 *
 *   npx tsx scripts/generate-copa-6.ts          # → out/copa-6/copa-6_01..03.png
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 3;
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ---- chrome común (familia copa, pero footer GENERAL: este post es del modo gratis) ----
function doc(
  logoB64: string,
  titleFontCss: string,
  pagina: number,
  body: string,
  footUrl = "LOS11DESAMPA.COM",
  footTag = "Jugá gratis"
): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--green:#16713F;--green-bg:#E7F4ED;--green-border:#B8DEC8;}
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
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);} .title .gr{color:var(--green);}
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
  users: (s = 40, c = "#7A5C10") => lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>', s, c),
  message: (s = 40, c = "#7A5C10") => lucide('<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>', s, c),
  copy: (s = 40, c = "#7A5C10") => lucide('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', s, c),
  plus: (s = 40, c = "#7A5C10") => lucide('<path d="M5 12h14"/><path d="M12 5v14"/>', s, c),
  gift: (s = 40, c = "#7A5C10") => lucide('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>', s, c),
  crown: (s = 40, c = "#7A5C10") => lucide('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>', s, c),
};

// avatar redondo con inicial (color de fondo)
function avatar(initial: string, bg: string, s = 44, fs = 20): string {
  return `<div style="flex:0 0 auto;width:${s}px;height:${s}px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 0 0 2px rgba(17,24,39,.15);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${fs}px;">${initial}</div>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Portada: el grupo de fútbol ya tiene su liga (mockup de chat)
function slide1() {
  const bubbleIn = (txt: string) =>
    `<div style="align-self:flex-start;max-width:78%;background:#fff;border:2px solid #E3E7EB;border-radius:4px 14px 14px 14px;padding:12px 16px;font-weight:600;font-size:21px;color:var(--ink2);box-shadow:1px 2px 0 rgba(17,24,39,.08);">${txt}</div>`;
  return `<div class="content" style="margin-top:34px;">
    <div style="display:flex;align-items:center;gap:10px;">${ICON.message(26, "#7A5C10")}<span class="eyebrow" style="color:var(--gold-ink);">El chat de fútbol de siempre</span></div>
    <div class="title" style="font-size:92px;margin-top:12px;">TU GRUPO YA<br>TIENE <span class="b">SU LIGA</span>.</div>
    <p class="body" style="font-size:28px;line-height:1.36;margin-top:18px;max-width:940px;">Ese grupo donde discuten cada partido merece algo mejor que una <b>planilla de Excel</b>.</p>

    <div class="card" style="margin-top:30px;padding:0;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:14px;background:var(--green);padding:18px 24px;">
        ${avatar("⚽", "rgba(255,255,255,.18)", 52, 24)}
        <div style="flex:1;"><div style="color:#fff;font-weight:800;font-size:26px;line-height:1;">Los pibes del fútbol</div><div style="color:#CDEBD9;font-weight:600;font-size:18px;margin-top:3px;">8 miembros · en línea</div></div>
        ${ICON.users(30, "rgba(255,255,255,.85)")}
      </div>
      <div style="background:#ECECE4;padding:22px 24px;display:flex;flex-direction:column;gap:12px;">
        ${bubbleIn("Otro Mundial perdiendo el prode por un penal en contra 😤")}
        ${bubbleIn("¿Y si este año lo hacemos en serio?")}
        <div style="align-self:flex-end;max-width:84%;background:var(--gold-bg);border:2px solid var(--gold);border-radius:14px 4px 14px 14px;padding:14px 18px;box-shadow:2px 2px 0 rgba(122,92,16,.25);">
          <div style="display:flex;align-items:center;gap:9px;">${ICON.copy(22, "#7A5C10")}<span style="font-weight:800;font-size:18px;color:var(--gold-ink);letter-spacing:0.04em;">Liga creada — código</span></div>
          <div class="num" style="font-size:46px;color:var(--gold-ink);margin-top:6px;letter-spacing:0.08em;">7K2Q9P</div>
          <div style="font-weight:700;font-size:18px;color:var(--ink2);margin-top:4px;">Entren a los11desampa.com y péguenlo 👇</div>
        </div>
      </div>
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:128px;z-index:2;background:var(--dark);border:2px solid var(--green);border-radius:16px;padding:20px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 rgba(17,24,39,.5);">
    <div><div class="eyebrow" style="font-size:15px;color:#7FE0A6;">Sin planillas, sin perseguir a nadie</div>
    <div style="color:#fff;font-weight:800;font-size:30px;line-height:1.05;margin-top:4px;">Y es <span style="color:#7FE0A6;">gratis</span></div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="color:#9AA6BF;font-weight:800;font-size:16px;letter-spacing:0.2em;">DESLIZÁ</div><div style="color:var(--green);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · Cómo: 3 pasos + mini-ranking de liga privada
function slide2() {
  const step = (n: string, icon: string, label: string) =>
    `<div style="flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;">
      <div style="position:relative;width:74px;height:74px;border-radius:18px;background:var(--gold-bg);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 var(--gold-border);">${icon}
        <div class="num" style="position:absolute;top:-12px;right:-12px;width:34px;height:34px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;">${n}</div></div>
      <div style="font-weight:800;font-size:20px;color:var(--ink);line-height:1.12;">${label}</div></div>`;
  const arrow = `<div style="align-self:center;color:var(--gold);font-weight:800;font-size:36px;margin-top:-22px;">&raquo;</div>`;
  const row = (pos: number, ini: string, bg: string, name: string, pts: number, me = false) =>
    `<div style="display:flex;align-items:center;gap:16px;padding:14px 20px;${me ? "background:var(--blue-light);" : ""}border-bottom:1px solid #EEF0F2;">
      <div class="num" style="width:30px;text-align:center;font-size:24px;color:${pos === 1 ? "var(--gold-ink)" : "var(--ink3)"};">${pos}</div>
      ${avatar(ini, bg, 42, 18)}
      <div style="flex:1;font-weight:${me ? 800 : 700};font-size:23px;color:var(--ink);">${name}${pos === 1 ? ` ${ICON.crown(20, "#C8A24B")}` : ""}${me ? '<span style="font-weight:800;font-size:15px;color:var(--blue);letter-spacing:0.1em;"> · VOS</span>' : ""}</div>
      <div class="num" style="font-size:26px;color:var(--ink);">${pts}</div>
    </div>`;
  return `<div class="content" style="margin-top:30px;">
    <div class="eyebrow">Cómo se arma</div>
    <div class="title" style="font-size:60px;margin-top:8px;">EL PRODE DEL GRUPO,<br><span class="gr">BIEN HECHO</span>.</div>
    <p class="body" style="font-size:25px;line-height:1.3;margin-top:14px;max-width:940px;">Liga privada <b>gratis</b>: la creás, pasás el código y compiten <b>todo el Mundial</b> con sus equipos.</p>

    <div class="card" style="margin-top:24px;padding:28px 24px 24px;">
      <div style="display:flex;align-items:flex-start;gap:6px;">
        ${step("1", ICON.plus(34), "Creá la liga")}
        ${arrow}
        ${step("2", ICON.copy(32), "Pasá el código")}
        ${arrow}
        ${step("3", ICON.trophy(34), "Compiten")}
      </div>
    </div>

    <div class="card" style="margin-top:18px;padding:0;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--dark);padding:16px 22px;">
        <div style="color:#fff;font-weight:800;font-size:22px;">🏆 Los pibes del fútbol</div>
        <div style="color:#9AA6BF;font-weight:700;font-size:17px;">Tabla en vivo</div>
      </div>
      ${row(1, "N", "#1B4FD8", "Nico", 412)}
      ${row(2, "V", "#16713F", "Vos", 398, true)}
      ${row(3, "T", "#D97706", "Tincho", 377)}
      ${row(4, "J", "#7A5C10", "Juampi", 351)}
    </div>
  </div>`;
}

// 3 · Puente: gratis con amigos o subís la apuesta (Premium) + CTA
function slide3() {
  const opt = (icon: string, kicker: string, word: string, desc: string, gold: boolean) => {
    const accent = gold ? "var(--gold)" : "var(--green)";
    const ink = gold ? "var(--gold-ink)" : "var(--green)";
    const bg = gold ? "var(--gold-bg)" : "var(--green-bg)";
    const bd = gold ? "var(--gold-border)" : "var(--green-border)";
    return `<div class="card" style="flex:1;padding:28px 24px;background:${bg};border-color:${accent};box-shadow:7px 7px 0 ${bd};">
      <div style="width:66px;height:66px;border-radius:16px;background:#fff;border:2px solid ${accent};display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 ${bd};">${icon}</div>
      <div class="eyebrow" style="font-size:14px;color:${ink};margin-top:16px;">${kicker}</div>
      <div class="title" style="font-size:38px;margin-top:4px;color:${ink};">${word}</div>
      <p class="body" style="font-size:22px;line-height:1.3;margin-top:10px;">${desc}</p></div>`;
  };
  return `<div class="content">
    <div class="eyebrow">Vos elegís</div>
    <div class="title" style="font-size:60px;margin-top:10px;">JUGÁ <span class="gr">GRATIS</span>.<br>O SUBÍ LA APUESTA.</div>
    <p class="body" style="font-size:27px;line-height:1.34;margin-top:18px;max-width:920px;">Jugar con los pibes <b>no cuesta nada</b>. Y si el grupo se pica, la <b>Liga Premium</b> los espera.</p>

    <div style="display:flex;gap:18px;margin-top:30px;">
      ${opt(ICON.gift(42, "#16713F"), "Siempre", "GRATIS", "Liga privada con amigos, todo el Mundial. $0.", false)}
      ${opt(ICON.trophy(42, "#7A5C10"), "Si suben la apuesta", "$400.000", "Liga Premium: entran y juegan por el premio al top 10.", true)}
    </div>

    <div style="margin-top:32px;background:var(--dark);border:2px solid var(--green);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:40px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:28px;">Armá la liga del grupo, gratis</div>
      <div class="num" style="color:#7FE0A6;font-size:56px;margin-top:14px;">LOS11DESAMPA.COM</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:20px;margin-top:14px;">Etiquetá a los 3 que NO pueden faltar 👇</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-6");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides = [slide1, slide2, slide3];
  for (let i = 0; i < slides.length; i++) {
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!());
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `copa-6_${String(i + 1).padStart(2, "0")}.png`);
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
