import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Generador de RECORDATORIOS — stories 9:16 (1080×1920) sensibles al tiempo, para subir
 * en el momento (NO evergreen, no se anclan). Misma familia visual que
 * generate-highlights.ts / generate-copa-N.ts / assets/stories/template.html:
 * chrome con header badge + wordmark, ghost "11", textura, sombras duras, Archivo Black
 * en títulos, Poppins en el cuerpo, íconos Lucide con paths OFICIALES, zonas seguras de
 * Story (IG tapa ~250px arriba/abajo). UN solo acento de color por placa (VISUAL-SYSTEM).
 *
 * Tanda actual (cierre Fecha 2 → arranque Fecha 3):
 *   1 · MENOS DE 24 HS   "se viene la Fecha 3"      → AHORA           (acento azul)
 *   2 · PUNTOS FECHA 2    "ya están, andá a verlos"  → mañana a la AM  (acento dorado)
 *   3 · ÚLTIMO LLAMADO    "cierra a las 16hs (ARG)"  → mañana pre-16hs (acento rojo)
 *
 * No toca la DB: el copy/horarios se cablean acá (los pasa el operador). Si cambian las
 * fechas, se editan los textos de abajo.
 *
 *   npx tsx scripts/generate-reminders.ts            # las 3 → out/reminders/
 *   npx tsx scripts/generate-reminders.ts --only 24hs|puntos|ultimo
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1920 };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ─── Íconos: paths OFICIALES de Lucide (node_modules/lucide-react), no dibujados a mano ───
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const P = {
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M22 8c0-2.3-.8-4.3-2-6"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/>',
  calClock: '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
  check: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
  list: '<path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/>',
  trendingUp: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  gamepad: '<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/><path d="M9 8v2"/><path d="M8 9h2"/><path d="M15 9h.01"/><path d="M17 11h.01"/>',
  award: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
};
const ic = (paths: string, c: string, s = 40) => lucide(paths, s, c);

// ─── Chrome 9:16 (igual que generate-highlights.ts / assets/stories/template.html) ───
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

// ─── Hero "numeral en card": card con banda de label + dato gigante en Archivo Black ───
// tones: { accent, accentBg, accentBorder } — define el color de la pieza (azul / rojo).
type Tones = { accent: string; accentBg: string; accentBorder: string };
function heroNumeralCard(iconPaths: string, labelText: string, bigHtml: string, subHtml: string, t: Tones): string {
  return `<div class="card" style="margin-top:44px;padding:0;overflow:hidden;">
    <div style="background:${t.accentBg};border-bottom:2px solid var(--ink);padding:24px 0;display:flex;align-items:center;justify-content:center;gap:14px;">
      ${lucide(iconPaths, 34, t.accent)}
      <span style="font-weight:800;font-size:33px;letter-spacing:0.14em;text-transform:uppercase;color:${t.accent};">${labelText}</span>
    </div>
    <div style="padding:42px 40px 46px;text-align:center;">
      <div style="display:flex;align-items:flex-start;justify-content:center;gap:16px;">${bigHtml}</div>
      <div style="width:330px;height:11px;background:${t.accent};border-radius:6px;margin:26px auto 0;box-shadow:5px 5px 0 ${t.accentBorder};"></div>
      <div class="title" style="font-size:52px;margin-top:26px;">${subHtml}</div>
    </div>
  </div>`;
}

// card horizontal (ícono + título + desc) — para los teasers de "andá a ver"
function iconCard(icon: string, title: string, desc: string, accBg: string, accBorder: string): string {
  return `<div class="card" style="display:flex;align-items:center;gap:24px;padding:28px 32px;">
    <div style="flex:0 0 auto;width:84px;height:84px;border-radius:16px;background:${accBg};border:2px solid ${accBorder};display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:33px;color:var(--ink);line-height:1.08;">${title}</div><p class="body" style="font-size:25px;line-height:1.3;margin-top:5px;">${desc}</p></div></div>`;
}

// caja de CTA al link (dark, acento de la placa)
function ctaBox(kicker: string, accent: string, urlColor = "#fff"): string {
  return `<div style="margin-top:40px;background:var(--dark);border:2px solid ${accent};border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:42px 40px;text-align:center;">
    <div style="color:#9AA6BF;font-weight:700;font-size:23px;text-transform:uppercase;letter-spacing:0.1em;">${kicker}</div>
    <div class="num" style="color:${urlColor};font-size:54px;margin-top:14px;">LOS11DESAMPA.COM</div>
  </div>`;
}

// ─── Las 3 stories ───
type Slide = { key: string; html: string; foot: Foot };

function slides(): Slide[] {
  return [
    // 1 · MENOS DE 24 HS — se viene la Fecha 3 (acento AZUL)
    {
      key: "24hs",
      foot: { url: "LOS11DESAMPA.COM", tag: "Fecha 3" },
      html: `
        ${eyebrow(ic(P.calClock, "#1B4FD8", 30), "Hoy cierra la Fecha 2", "#1B4FD8")}
        <div class="title" style="font-size:106px;margin-top:18px;">SE VIENE<br>LA <span class="b">FECHA 3</span></div>
        <p class="body" style="font-size:32px;line-height:1.36;margin-top:26px;">Hoy se cierra la Fecha 2 y <b>mañana a las 16:00 (ARG)</b> arranca la 3. Es tu ventana para ajustar el 11.</p>
        ${heroNumeralCard(
          P.clock,
          "Faltan menos de",
          `<span class="num" style="font-size:264px;color:var(--ink);line-height:0.78;">24</span>
           <span class="num" style="font-size:116px;color:var(--blue);line-height:1;margin-top:20px;">HS</span>`,
          `PARA LA <span class="b">FECHA 3</span>`,
          { accent: "#1B4FD8", accentBg: "var(--blue-light)", accentBorder: "var(--blue-border)" },
        )}
        <p class="body" style="font-size:30px;line-height:1.32;margin-top:38px;text-align:center;">Entrá y dejá tu equipo listo en <b>los11desampa.com</b></p>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;color:var(--ink3);font-weight:600;font-size:21px;line-height:1.3;text-align:center;">
          ${lucide(P.trophy, 22, "#9CA3AF")}<span>Mañana a la mañana se publican los puntajes de la Fecha 2.</span>
        </div>`,
    },
    // 2 · YA ESTÁN LOS PUNTOS DE LA FECHA 2 (acento DORADO)
    {
      key: "puntos",
      foot: { url: "LOS11DESAMPA.COM", tag: "Fecha 2" },
      html: `
        ${eyebrow(ic(P.trophy, "#7A5C10", 30), "Resultados · Fecha 2", "#7A5C10")}
        <div class="title" style="font-size:88px;margin-top:16px;">YA ESTÁN<br>TUS <span class="g">PUNTOS</span><br>DE LA FECHA 2</div>
        <p class="body" style="font-size:32px;line-height:1.36;margin-top:24px;">Se publicaron los puntajes. Entrá a ver cuánto rindió tu 11 y cómo te movés en la tabla.</p>
        <div style="display:flex;flex-direction:column;gap:18px;margin-top:34px;">
          ${iconCard(ic(P.award, "#7A5C10"), "Tus puntos de la fecha", "Mirá cuánto sumó cada figura y tu capitán.", "var(--gold-bg)", "var(--gold-border)")}
          ${iconCard(ic(P.trendingUp, "#7A5C10"), "Tu puesto en el ranking", "Global y en tus ligas con amigos.", "var(--gold-bg)", "var(--gold-border)")}
        </div>
        ${ctaBox("Revisá tu equipo en", "var(--gold)", "var(--gold)")}`,
    },
    // 4 · CIERRE 4TOS — hoy 16hs (ARG) cierra la ventana de cambios de cara a los cuartos (acento ROJO/urgencia)
    {
      key: "cuartos",
      foot: { url: "LOS11DESAMPA.COM", tag: "Cuartos de Final" },
      html: `
        ${eyebrow(ic(P.alarm, "#1B4FD8", 30), "Última oportunidad", "#1B4FD8")}
        <div class="title" style="font-size:96px;margin-top:16px;">HOY CIERRAN<br>LOS CAMBIOS<br>DE LOS <span class="b">4TOS</span></div>
        <p class="body" style="font-size:32px;line-height:1.36;margin-top:24px;">Hoy a las <b>16:00 (ARG)</b> se cierra la ventana para editar tu equipo de cara a los <b>Cuartos de Final</b>. Hacé tus cambios y elegí capitán antes de que empiece.</p>
        ${heroNumeralCard(
          P.alarm,
          "Cierra hoy a las",
          `<span class="num" style="font-size:200px;color:var(--ink);line-height:0.82;">16:00</span>`,
          `HORA DE <span class="b">ARGENTINA</span>`,
          { accent: "#1B4FD8", accentBg: "var(--blue-light)", accentBorder: "var(--blue-border)" },
        )}
        <p class="body" style="font-size:30px;line-height:1.32;margin-top:38px;text-align:center;">Dejá tu 11 listo ya en <b>los11desampa.com</b></p>`,
    },
    // 3 · ÚLTIMO LLAMADO — cierra a las 16hs (acento ROJO/urgencia)
    {
      key: "ultimo",
      foot: { url: "LOS11DESAMPA.COM", tag: "Última oportunidad" },
      html: `
        ${eyebrow(ic(P.alarm, "#D02B2B", 30), "Última oportunidad", "#D02B2B")}
        <div class="title" style="font-size:96px;margin-top:16px;">ÚLTIMO<br>LLAMADO PARA<br>LA <span class="r">FECHA 3</span></div>
        <p class="body" style="font-size:32px;line-height:1.36;margin-top:24px;">Cuando arranque la fecha se cierra la edición. Hacé tus cambios y elegí capitán <b>antes de que empiece</b>.</p>
        ${heroNumeralCard(
          P.alarm,
          "Arranca hoy a las",
          `<span class="num" style="font-size:200px;color:var(--ink);line-height:0.82;">16:00</span>`,
          `HORA DE <span class="r">ARGENTINA</span>`,
          { accent: "#D02B2B", accentBg: "var(--danger-bg)", accentBorder: "var(--danger-border)" },
        )}
        <p class="body" style="font-size:30px;line-height:1.32;margin-top:38px;text-align:center;">Cambiá tu 11 ya en <b>los11desampa.com</b></p>`,
    },
  ];
}

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
  const only = arg("only");
  const all = slides();
  const list = only ? all.filter((s) => s.key === only) : all;
  if (only && !list.length) {
    console.error(`Clave desconocida: "${only}". Opciones: ${all.map((s) => s.key).join(", ")}.`);
    process.exit(1);
  }
  const outDir = path.join(ROOT, "out/reminders");
  await mkdir(outDir, { recursive: true });
  for (let i = 0; i < list.length; i++) {
    const s = list[i]!;
    const buf = await renderPng(doc(logoB64, titleFontCss, s.html, s.foot), SIZE);
    const idx = (only ? all.findIndex((x) => x.key === s.key) : i) + 1;
    const file = path.join(outDir, `reminder_${String(idx).padStart(2, "0")}_${s.key}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  console.log("\nListo → out/reminders/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
