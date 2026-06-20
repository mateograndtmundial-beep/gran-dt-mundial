import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #4 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"4 · D-5").
 * "Por qué jugarla y no el prode del grupo." Carrusel 3 placas 1080×1350.
 * Ángulo (NO "premio fijo vs pozo" — un pozo de 100×$5.000 sería mayor): la Liga Premium gana por
 * (1) SKILL — es estrategia, no adivinar: elegís jugadores con criterio de presupuesto y te medís
 * con los mejores; y (2) SEGURIDAD — se paga siempre, nadie se baja a mitad de camino, con B&C.
 * Figura por slide: 2 pilares (portada) → plantel + barra de presupuesto (estrategia) → confianza+CTA.
 * Familia visual copa (Lucide, cards borde negro + sombra dura, acento dorado, footer /COPA).
 * Guías: docs/social/{PLACAS-GUIDELINES,VISUAL-SYSTEM,COPY-VOICE}.md.
 *
 *   npx tsx scripts/generate-copa-4.ts          # → out/copa-4/copa-4_01..03.png
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 3;
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type Flag = { name: string; group: string; b64: string };
let FLAGS: Record<string, Flag> = {};
const flag = (code: string) => FLAGS[code]?.b64 ?? "";
const POS = { POR: "#D97706", DEF: "#1E40AF", MED: "#059669", DEL: "#DC2626" };
type Pos = keyof typeof POS;

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
  shield: (s = 40, c = "#7A5C10") => lucide('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', s, c),
  doc: (s = 40, c = "#7A5C10") => lucide('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>', s, c),
  users: (s = 40, c = "#7A5C10") => lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>', s, c),
  target: (s = 40, c = "#7A5C10") => lucide('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s, c),
  wallet: (s = 40, c = "#7A5C10") => lucide('<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>', s, c),
  medal: (s = 40, c = "#7A5C10") => lucide('<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><path d="M12 18v-2h-.5"/>', s, c),
  handshake: (s = 40, c = "#7A5C10") => lucide('<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>', s, c),
};

// card horizontal: chip de ícono + título + descripción (reusable)
function conf(icon: string, title: string, desc: string, extra = ""): string {
  return `<div class="card" style="display:flex;align-items:${extra ? "flex-start" : "center"};gap:22px;padding:24px 28px;">
    <div style="flex:0 0 auto;width:64px;height:64px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:28px;color:var(--ink);line-height:1.1;">${title}</div><p class="body" style="font-size:22px;line-height:1.28;margin-top:4px;">${desc}</p>${extra}</div></div>`;
}

// figurita mini (bandera + nombre + precio) para el plantel
function pchip(code: string, name: string, price: string, pos: Pos): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;">
    <div style="width:60px;height:40px;border-radius:6px;overflow:hidden;border:2px solid ${POS[pos]};box-shadow:2px 2px 0 rgba(0,0,0,.3);"><img src="${flag(code)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>
    <span style="font-weight:800;font-size:18px;color:var(--ink);white-space:nowrap;">${name}</span>
    <span class="num" style="font-size:15px;color:var(--gold-ink);">${price}M</span>
  </div>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Portada: es más que un prode → 2 razones (estrategia + se paga)
function slide1() {
  const pillar = (icon: string, kicker: string, word: string, desc: string, gold: boolean) => {
    const accent = gold ? "var(--gold)" : "var(--blue)";
    const ink = gold ? "var(--gold-ink)" : "var(--blue)";
    const bg = gold ? "var(--gold-bg)" : "var(--blue-light)";
    const bd = gold ? "var(--gold-border)" : "var(--blue-border)";
    return `<div class="card" style="flex:1;padding:30px 26px;background:${bg};border-color:${accent};box-shadow:7px 7px 0 ${bd};">
      <div style="width:70px;height:70px;border-radius:16px;background:#fff;border:2px solid ${accent};display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 ${bd};">${icon}</div>
      <div class="eyebrow" style="font-size:15px;color:${ink};margin-top:18px;">${kicker}</div>
      <div class="title" style="font-size:40px;margin-top:4px;color:${ink};">${word}</div>
      <p class="body" style="font-size:23px;line-height:1.3;margin-top:12px;">${desc}</p></div>`;
  };
  return `<div class="content" style="margin-top:48px;">
    <div class="eyebrow" style="font-size:23px;color:var(--gold-ink);">El prode del grupo vs. la Liga Premium</div>
    <div class="title" style="font-size:104px;margin-top:18px;">ES MÁS QUE<br><span class="g">UN PRODE</span>.</div>
    <p class="body" style="font-size:30px;line-height:1.38;margin-top:24px;max-width:920px;">Un <b>juego de estrategia</b> donde te medís con los mejores. Y donde —esto es lo importante— <b>el premio se paga siempre</b>. Dos razones:</p>
    <div style="display:flex;gap:18px;margin-top:34px;">
      ${pillar(ICON.target(44, "#1B4FD8"), "Razón 1", "ES SKILL", "Elegís jugadores, manejás un presupuesto y dirigís. No adivinás.", false)}
      ${pillar(ICON.shield(44, "#7A5C10"), "Razón 2", "SE PAGA", "Nadie se baja a mitad de camino. Garantizado, con Bases y Condiciones.", true)}
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:128px;z-index:2;background:var(--dark);border:2px solid var(--gold);border-radius:16px;padding:24px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 rgba(17,24,39,.5);">
    <div><div class="eyebrow" style="font-size:15px;color:var(--gold);">Por qué jugarla en serio</div>
    <div style="color:#fff;font-weight:800;font-size:32px;line-height:1.05;margin-top:4px;">Te lo mostramos</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="color:#9AA6BF;font-weight:800;font-size:16px;letter-spacing:0.2em;">DESLIZÁ</div><div style="color:var(--gold);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · Razón 1 (skill): elegís con criterio de presupuesto, te medís con los mejores
function slide2() {
  const chips = [
    pchip("ARG", "Messi", "100,1", "DEL"),
    pchip("NOR", "Haaland", "150,0", "DEL"),
    pchip("ENG", "Kane", "65,7", "DEL"),
    pchip("ESP", "Rodri", "73,5", "MED"),
    pchip("MAR", "Hakimi", "77,4", "DEF"),
  ].join('<div style="width:2px;align-self:stretch;background:#E6EAEE;margin:6px 0;"></div>');
  return `<div class="content" style="margin-top:30px;">
    <div class="eyebrow">Razón 1 · No es azar</div>
    <div class="title" style="font-size:62px;margin-top:8px;">ES <span class="b">ESTRATEGIA</span>,<br>NO SUERTE.</div>
    <p class="body" style="font-size:25px;line-height:1.3;margin-top:16px;max-width:940px;">El prode lo gana la suerte. Acá ganás por <b>saber de fútbol</b>: elegís, armás y dirigís tu equipo.</p>

    <div class="card" style="margin-top:24px;padding:26px 30px;">
      <div class="eyebrow" style="font-size:16px;color:var(--gold-ink);">Elegís 15 con criterio · algunos de tu plantel</div>
      <div style="display:flex;align-items:flex-start;gap:8px;margin-top:18px;">${chips}</div>
      <div style="margin-top:24px;">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:17px;color:var(--ink2);margin-bottom:6px;"><span>Usaste 698,2M</span><span>Tope 700M</span></div>
        <div style="height:24px;background:#E6EAEE;border:2px solid var(--ink);border-radius:8px;overflow:hidden;box-shadow:2px 2px 0 rgba(17,24,39,.4);"><div style="width:99.7%;height:100%;background:linear-gradient(90deg,#DDBB60,#C8A24B);"></div></div>
        <div style="font-weight:800;font-size:18px;color:var(--green);margin-top:8px;">Te quedan 1,8M — armaste el mejor 11 sin pasarte.</div>
      </div>
    </div>

    <div style="display:flex;gap:16px;margin-top:18px;">
      ${conf(ICON.wallet(36), "Hay que tener criterio", "700M y ni un peso más. Cada figura cuesta según su nivel.")}
      ${conf(ICON.medal(36), "Te medís con los mejores", "Ranking, fecha a fecha, contra los mejores DT del país.")}
    </div>
  </div>`;
}

// 3 · Razón 2 (seguridad): se paga siempre, nadie se baja + CTA
function slide3() {
  return `<div class="content">
    <div class="eyebrow">Razón 2 · Se paga seguro</div>
    <div class="title" style="font-size:64px;margin-top:10px;">Y ACÁ <span class="g">NADIE<br>SE BAJA</span>.</div>
    <p class="body" style="font-size:27px;line-height:1.34;margin-top:18px;max-width:920px;">No es el prode del grupo, donde el que organiza desaparece a mitad de camino. Acá el premio está <b>asegurado</b>.</p>

    <div style="display:flex;flex-direction:column;gap:14px;margin-top:28px;">
      ${conf(ICON.shield(38), "Premio garantizado", "Se reparte sí o sí, con Bases y Condiciones públicas.")}
      ${conf(ICON.handshake(38), "Nadie se borra", "El cupo son 100 que ya pagaron su lugar. Organizado y transparente.")}
      ${conf(ICON.trophy(38), "Entrada $5.000 · cupo 100", "Cierra el 28/06 (kickoff de 16vos) o al llenarse.")}
    </div>

    <div style="margin-top:32px;background:var(--dark);border:2px solid var(--gold);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:42px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:29px;">¿Te pasó que el prode no se pagó?</div>
      <div class="num" style="color:var(--gold);font-size:54px;margin-top:14px;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:20px;margin-top:14px;">Link y Bases y Condiciones en la bio</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-4");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont, flagsRaw] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf8"),
  ]);
  FLAGS = JSON.parse(flagsRaw) as Record<string, Flag>;
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides = [slide1, slide2, slide3];
  for (let i = 0; i < slides.length; i++) {
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!());
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `copa-4_${String(i + 1).padStart(2, "0")}.png`);
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
