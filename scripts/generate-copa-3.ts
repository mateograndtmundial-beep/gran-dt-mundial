import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #3 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"3 · D-6").
 * "La distribución del premio." Carrusel 3 placas 1080×1350.
 * Figura por slide: podio top-3 (portada) → gráfico de barras del top 10 (transparencia) → CTA.
 * Familia visual de generate-que-es/copa-2 (cards borde negro + sombra dura, acento DORADO premium,
 * footer /COPA). Guías: docs/social/{PLACAS-GUIDELINES,VISUAL-SYSTEM,COPY-VOICE}.md.
 * Datos EXACTOS de la distribución: docs/MONETIZACION.md §"Datos de la distribución (top 10)".
 *
 *   npx tsx scripts/generate-copa-3.ts          # → out/copa-3/copa-3_01..03.png
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 3;
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// Distribución EXACTA (MONETIZACION.md). pct = monto / 120.000 (para el ancho de barra).
const PRIZES = [
  { r: 1, amt: "$120.000", pct: 100, p: "30%" },
  { r: 2, amt: "$72.000", pct: 60, p: "18%" },
  { r: 3, amt: "$48.000", pct: 40, p: "12%" },
  { r: 4, amt: "$36.000", pct: 30, p: "9%" },
  { r: 5, amt: "$28.000", pct: 23.3, p: "7%" },
  { r: 6, amt: "$24.000", pct: 20, p: "6%" },
  { r: 7, amt: "$21.000", pct: 17.5, p: "5,25%" },
  { r: 8, amt: "$19.000", pct: 15.8, p: "4,75%" },
  { r: 9, amt: "$17.000", pct: 14.2, p: "4,25%" },
  { r: 10, amt: "$15.000", pct: 12.5, p: "3,75%" },
];

// ---- chrome común (familia copa: footer /COPA + tag Liga Premium) ----------
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
  users: (s = 40, c = "#7A5C10") => lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>', s, c),
};

// ---- slides ----------------------------------------------------------------

// 1 · Portada: $400.000 no lo gana uno solo — podio top-3
function slide1() {
  const step = (rank: number, amount: string, h: number, primary = false) =>
    `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
      <div style="flex:0 0 auto;width:${primary ? 66 : 54}px;height:${primary ? 66 : 54}px;border-radius:50%;background:${primary ? "var(--gold)" : "var(--gold-bg)"};border:2px solid var(--gold-ink);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 var(--gold-border);margin-bottom:10px;">${ICON.trophy(primary ? 38 : 30)}</div>
      <div class="eyebrow" style="font-size:15px;color:var(--gold-ink);">${rank}° puesto</div>
      <div class="num" style="font-size:${primary ? 54 : 40}px;color:var(--gold-ink);margin:6px 0 12px;">${amount}</div>
      <div style="width:100%;height:${h}px;background:${primary ? "linear-gradient(180deg,#E7C765,#C8A24B)" : "var(--gold-bg)"};border:2px solid var(--gold-ink);border-top-left-radius:12px;border-top-right-radius:12px;box-shadow:6px 6px 0 var(--gold-border);display:flex;align-items:flex-start;justify-content:center;padding-top:16px;">
        <span class="num" style="font-size:${primary ? 78 : 60}px;color:${primary ? "#fff" : "var(--gold-ink)"};">${rank}</span>
      </div>
    </div>`;
  return `<div class="content" style="margin-top:46px;">
    <div class="eyebrow" style="font-size:23px;color:var(--gold-ink);">El premio · Liga Premium</div>
    <div class="num" style="font-size:150px;color:var(--gold-ink);margin-top:14px;">$400.000</div>
    <div class="title" style="font-size:58px;margin-top:18px;">NO SE LO LLEVA <span class="g">UNO SOLO</span>.</div>
    <p class="body" style="font-size:29px;line-height:1.36;margin-top:18px;max-width:920px;"><b>Premiamos al top 10.</b> Estos son los 3 primeros — adentro tenés el reparto completo.</p>
    <div style="display:flex;align-items:flex-end;gap:16px;margin-top:30px;">
      ${step(2, "$72.000", 168, false)}
      ${step(1, "$120.000", 214, true)}
      ${step(3, "$48.000", 132, false)}
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:130px;z-index:2;background:var(--dark);border:2px solid var(--gold);border-radius:16px;padding:24px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 rgba(17,24,39,.5);">
    <div><div class="eyebrow" style="font-size:16px;color:var(--gold);">+ 7 puestos más, hasta el 10°</div>
    <div style="color:#fff;font-weight:800;font-size:32px;line-height:1.05;margin-top:4px;">Mirá el reparto completo</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="color:#9AA6BF;font-weight:800;font-size:16px;letter-spacing:0.2em;">DESLIZÁ</div><div style="color:var(--gold);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · El gráfico: barras del top 10 (figura central)
function slide2() {
  const row = (r: number, amt: string, pct: number, p: string) => {
    const top3 = r <= 3;
    const badge = top3 ? "var(--gold)" : "var(--blue)";
    const badgeInk = top3 ? "var(--gold-ink)" : "#fff";
    const fill = top3 ? "linear-gradient(90deg,#DDBB60,#C8A24B)" : "var(--blue)";
    const amtCol = top3 ? "var(--gold-ink)" : "var(--ink)";
    return `<div style="display:flex;align-items:center;gap:14px;">
      <div style="flex:0 0 auto;width:46px;height:46px;border-radius:50%;background:${badge};display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 var(--ink);"><span class="num" style="font-size:23px;color:${badgeInk};">${r}</span></div>
      <div style="flex:1;height:44px;background:#E6EAEE;border:2px solid var(--ink);border-radius:9px;overflow:hidden;box-shadow:3px 3px 0 rgba(17,24,39,.45);">
        <div style="width:${pct}%;height:100%;background:${fill};"></div>
      </div>
      <div style="flex:0 0 178px;text-align:right;">
        <span class="num" style="font-size:33px;color:${amtCol};">${amt}</span>
        <span style="display:block;font-weight:700;font-size:14px;color:var(--ink3);margin-top:1px;">${p} del total</span>
      </div>
    </div>`;
  };
  return `<div class="content" style="margin-top:30px;">
    <div class="eyebrow">Transparencia total</div>
    <div class="title" style="font-size:62px;margin-top:8px;">ASÍ SE REPARTEN<br>LOS <span class="g">$400.000</span>.</div>
    <div style="display:flex;flex-direction:column;gap:13px;margin-top:30px;">
      ${PRIZES.map((x) => row(x.r, x.amt, x.pct, x.p)).join("")}
    </div>
    <div class="card" style="margin-top:22px;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:5px 5px 0 var(--gold-border);">
      <span class="eyebrow" style="font-size:17px;color:var(--gold-ink);">Total repartido · top 10</span>
      <span class="num" style="font-size:40px;color:var(--gold-ink);">$400.000 <span style="font-size:22px;">· 100%</span></span>
    </div>
  </div>`;
}

// 3 · CTA: entrar al top 10 ya paga
function slide3() {
  const conf = (icon: string, title: string, desc: string) =>
    `<div class="card" style="display:flex;align-items:center;gap:22px;padding:22px 26px;">
      <div style="flex:0 0 auto;width:62px;height:62px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
      <div><div style="font-weight:800;font-size:27px;color:var(--ink);">${title}</div><p class="body" style="font-size:22px;line-height:1.28;margin-top:2px;">${desc}</p></div></div>`;
  return `<div class="content">
    <div class="eyebrow">No hace falta salir 1°</div>
    <div class="title" style="font-size:70px;margin-top:10px;">ENTRAR AL <span class="g">TOP 10</span><br>YA PAGA.</div>
    <p class="body" style="font-size:28px;line-height:1.36;margin-top:20px;max-width:920px;">Son <b>10 premiados</b>, no uno. Y el premio es <b>fijo</b>: repartimos los $400.000 <b>aunque no se llenen los 100</b>.</p>

    <div style="display:flex;flex-direction:column;gap:14px;margin-top:30px;">
      ${conf(ICON.shield(38), "Premio fijo, se reparte sí o sí", "Los $400.000 completos, esté lleno o no el cupo.")}
      ${conf(ICON.users(38), "10 ganadores", "Del 1° al 10°, desde $120.000 hasta $15.000.")}
      ${conf(ICON.trophy(38), "Entrada $5.000 · cupo 100", "Cierra el 28/06 (kickoff de 16vos) o al llenarse.")}
    </div>

    <div style="margin-top:36px;background:var(--dark);border:2px solid var(--gold);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:46px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:29px;">Si entrás, ¿a qué puesto apuntás?</div>
      <div class="num" style="color:var(--gold);font-size:54px;margin-top:14px;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:20px;margin-top:14px;">Link y Bases y Condiciones en la bio</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-3");
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
    const file = path.join(outDir, `copa-3_${String(i + 1).padStart(2, "0")}.png`);
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
