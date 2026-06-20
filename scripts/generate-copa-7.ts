import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #7 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"7 · D-2").
 * "Urgencia: faltan 2 días." Carrusel 2 placas 1080×1350. Arranca el empuje final de 48 h.
 * Figura por slide: COUNTDOWN (numeral gigante "2 DÍAS" + timeline de los últimos días) → cupo en
 * vivo (barra) + recap oferta + CTA "entrá antes del cierre".
 * Familia visual copa (Lucide, cards borde negro + sombra dura, acento dorado, footer /COPA).
 *
 * ⚠️ EL CUPO ES REAL: sacalo de getCopasStatus y pasalo por --enrolled. El default es placeholder
 *    para previsualizar (el script avisa por consola). Nunca inflar.
 *
 *   npx tsx scripts/generate-copa-7.ts --enrolled 84   # 84 anotados → quedan 16
 *   npx tsx scripts/generate-copa-7.ts                 # placeholder (avisa por consola)
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
const ENROLLED = Math.max(0, Math.min(CAPACITY, Number(ENROLLED_RAW ?? 84)));
const LEFT = CAPACITY - ENROLLED;
const PCT = Math.round((ENROLLED / CAPACITY) * 100);

// ---- chrome común (familia copa: footer /COPA + tag Liga Premium) ----------
function doc(logoB64: string, titleFontCss: string, pagina: number, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--danger-bg:#FDECEC;--danger-border:#F2C2C2;--green:#16713F;}
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
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);} .title .r{color:var(--danger);}
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
  ticket: (s = 40, c = "#7A5C10") => lucide('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>', s, c),
  alarm: (s = 40, c = "#7A5C10") => lucide('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>', s, c),
  hourglass: (s = 40, c = "#7A5C10") => lucide('<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>', s, c),
  flame: (s = 40, c = "#7A5C10") => lucide('<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>', s, c),
  lock: (s = 40, c = "#7A5C10") => lucide('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s, c),
};

// nodo de una timeline horizontal: círculo con el día + labels arriba/abajo (absolutos,
// para no desalinear el círculo respecto de la línea que conecta los nodos)
function tlNode(dow: string, day: string, status: string, mode: "today" | "mid" | "close"): string {
  const isClose = mode === "close";
  const isToday = mode === "today";
  const size = isClose ? 132 : 116;
  const dayFs = isClose ? 60 : 52;
  const ring = isClose ? "var(--gold)" : isToday ? "#fff" : "rgba(255,255,255,.30)";
  const fill = isClose ? "linear-gradient(135deg,#DDBB60,#C8A24B)" : "var(--dark)";
  const dayCol = isClose ? "var(--ink)" : "#fff";
  const dowCol = isClose ? "var(--gold)" : isToday ? "#fff" : "#9AA6BF";
  const statCol = isClose ? "var(--gold)" : isToday ? "#fff" : "#9AA6BF";
  const lock = isClose
    ? `<span style="display:inline-flex;vertical-align:-3px;margin-right:5px;">${ICON.lock(18, "#7A5C10")}</span>`
    : "";
  return `<div style="position:relative;flex:0 0 auto;width:${size}px;height:${size}px;z-index:2;">
    <div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:16px;white-space:nowrap;font-weight:800;font-size:18px;letter-spacing:0.16em;color:${dowCol};">${dow}</div>
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:4px solid ${ring};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(16,23,38,1),0 8px 0 rgba(0,0,0,.25);${isToday ? "box-shadow:0 0 0 6px rgba(16,23,38,1),0 0 0 11px rgba(255,255,255,.14),0 8px 0 rgba(0,0,0,.25);" : ""}">
      <span class="num" style="font-size:${dayFs}px;color:${dayCol};">${day}</span>
    </div>
    <div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:18px;white-space:nowrap;font-weight:800;font-size:17px;letter-spacing:0.06em;text-transform:uppercase;color:${statCol};">${lock}${status}</div>
  </div>`;
}

// la línea horizontal completa: nodo — segmento — nodo — segmento — nodo
function timeline(): string {
  const seg = `<div style="flex:1;height:10px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.28),var(--gold));margin:0 2px;z-index:1;"></div>`;
  return `<div style="display:flex;align-items:center;justify-content:center;padding:0 24px;">
    ${tlNode("VIERNES", "26", "Hoy · estás acá", "today")}
    ${seg}
    ${tlNode("SÁBADO", "27", "Queda 1 día", "mid")}
    ${seg}
    ${tlNode("DOMINGO", "28", "Cierra · 16vos", "close")}
  </div>`;
}

// card horizontal: chip de ícono + título + descripción
function conf(icon: string, title: string, desc: string): string {
  return `<div class="card" style="display:flex;align-items:center;gap:22px;padding:22px 28px;">
    <div style="flex:0 0 auto;width:64px;height:64px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:27px;color:var(--ink);line-height:1.1;">${title}</div><p class="body" style="font-size:22px;line-height:1.28;margin-top:3px;">${desc}</p></div></div>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Countdown: faltan 2 días (numeral gigante + timeline)
function slide1() {
  return `<div class="content" style="margin-top:34px;">
    <div style="display:flex;align-items:center;gap:10px;">${ICON.alarm(26, "#D02B2B")}<span class="eyebrow" style="color:var(--danger);">Empieza el empuje final</span></div>
    <div class="title" style="font-size:112px;margin-top:12px;">FALTAN<br><span class="r">2 DÍAS</span>.</div>
    <p class="body" style="font-size:29px;line-height:1.36;margin-top:18px;max-width:940px;">La inscripción a la Liga Premium cierra el <b>28/06</b>, justo antes del primer partido de <b>16vos</b>. Después no hay repechaje.</p>

    <div style="margin-top:30px;background:var(--dark);border:2px solid var(--gold);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:34px 30px 38px;">
      <div style="display:flex;align-items:center;gap:10px;justify-content:center;">${ICON.hourglass(24, "#C8A24B")}<span class="eyebrow" style="font-size:16px;color:var(--gold);">Cuenta regresiva al cierre</span></div>
      <div style="margin-top:58px;margin-bottom:54px;">${timeline()}</div>
      <div style="text-align:center;color:#9AA6BF;font-weight:700;font-size:21px;border-top:1px solid rgba(255,255,255,.1);padding-top:24px;">El <b style="color:#fff;">28/06</b> cierra la inscripción al rodar la pelota en 16vos. Sin repechaje.</div>
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:128px;z-index:2;background:var(--danger-bg);border:2px solid var(--danger);border-radius:16px;padding:20px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 var(--danger-border);">
    <div><div class="eyebrow" style="font-size:15px;color:var(--danger);">Si lo venís postergando</div>
    <div style="color:var(--ink);font-weight:800;font-size:30px;line-height:1.05;margin-top:4px;">Es ahora o nunca</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="font-weight:800;font-size:16px;letter-spacing:0.2em;color:var(--danger);">DESLIZÁ</div><div style="color:var(--danger);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · Cupo en vivo (barra) + recap oferta + CTA
function slide2() {
  return `<div class="content" style="margin-top:30px;">
    <div class="eyebrow">O entrás, o lo mirás de afuera</div>
    <div class="title" style="font-size:60px;margin-top:8px;">QUEDAN <span class="r">${LEFT}</span><br>LUGARES.</div>
    <p class="body" style="font-size:26px;line-height:1.32;margin-top:14px;max-width:940px;">Son <b>${CAPACITY} y nada más</b>. Ya entraron <b>${ENROLLED}</b>. Los que están adentro juegan por <b>$400.000</b> al top 10.</p>

    <div class="card" style="margin-top:24px;padding:26px 30px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <span style="font-weight:800;font-size:20px;color:var(--ink);">Cupo: ${ENROLLED} / ${CAPACITY}</span>
        <span class="num" style="font-size:30px;color:var(--gold-ink);">${PCT}%</span>
      </div>
      <div style="height:30px;background:#E6EAEE;border:2px solid var(--ink);border-radius:9px;overflow:hidden;box-shadow:2px 2px 0 rgba(17,24,39,.4);"><div style="width:${PCT}%;height:100%;background:linear-gradient(90deg,#DDBB60,#C8A24B);"></div></div>
      <div style="font-weight:800;font-size:19px;color:var(--danger);margin-top:10px;">Quedan ${LEFT} de ${CAPACITY} · cuando se llena, se cierra.</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px;margin-top:22px;">
      ${conf(ICON.trophy(38), "$400.000 al top 10", "Premio garantizado, se reparte sí o sí — con Bases y Condiciones.")}
      ${conf(ICON.ticket(38), "Entrada $5.000", "Una vez. Después jugás todo el Mundial, de 16vos a la final.")}
      ${conf(ICON.alarm(38), "Cierra el 28/06", "O antes, si se llenan los 100. Lo que pase primero.")}
    </div>

    <div style="margin-top:30px;background:var(--dark);border:2px solid var(--gold);border-radius:16px;box-shadow:9px 9px 0 rgba(17,24,39,.6);padding:38px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:28px;">Entrá antes del cierre</div>
      <div class="num" style="color:var(--gold);font-size:54px;margin-top:12px;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:20px;margin-top:12px;">Link y Bases y Condiciones en la bio</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  if (ENROLLED_RAW === undefined) {
    console.warn(`⚠️  Sin --enrolled: usando PLACEHOLDER ${ENROLLED}/${CAPACITY}. ` +
      `Antes de publicar, pasá el número real de getCopasStatus: --enrolled <N>.`);
  }
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-7");
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
    const file = path.join(outDir, `copa-7_${String(i + 1).padStart(2, "0")}.png`);
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
