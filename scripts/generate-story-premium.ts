import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderStoryPng, closeBrowser } from "../lib/stories/render";

/*
 * Story 1080×1920 (5 slides) DEDICADA a la Liga Premium, pensada para PAUTAR en IG a público
 * FRÍO — gente que mira el Mundial pero NO conoce el juego ni tiene equipo. Hace doble función:
 * (1) explica qué es el juego desde cero (sos el DT, armás 15 figuras + DT, sumás puntos por el
 * rendimiento REAL), y (2) vende la Liga Premium (premio, cuándo arranca, entrada, cupo, "todavía
 * estás a tiempo"). El slide 1 engancha con la plata; los slides 2-3 enseñan el juego; el 4 baja la
 * oferta; el 5 cierra con CTA. Misma familia visual que generate-copa-*.ts / generate-story-planeta.ts
 * (Archivo Black + Poppins, acento DORADO premium, cards con sombra dura). Datos exactos
 * (docs/social/LANZAMIENTO-COPA.md + docs/MONETIZACION.md): premio $400.000 garantizado al top 10,
 * entrada $5.000, cupo 100, rankea desde 16vos, cierra 28/06. Puntaje: docs/PROJECT-CONTEXT.md (SCORING).
 * Voz en primera persona (premiamos / repartimos), premio "se reparte sí o sí, aunque no se llenen
 * los 100" (NUNCA "lo pone la casa"), link a Bases y Condiciones. Guía: docs/social/PLACAS-GUIDELINES.md.
 *
 *   npx tsx scripts/generate-story-premium.ts            # → out/story-premium/story-premium_01..05.png (carrusel orgánico)
 *   npx tsx scripts/generate-story-premium.ts --single   # → out/story-premium/story-premium_single.png (1 frame, para PAUTAR)
 *
 * 5 frames = mejor para ORGÁNICO (público que ya te sigue y desliza). 1 frame = mejor para PAUTA en
 * frío (hook + oferta + CTA de una; no dependés de que deslicen). Ver la charla en el handoff.
 *
 * ⚠️ GATING: solo publicar si la Liga Premium ya está LIVE (visto legal + producto MP probado).
 */

const ROOT = process.cwd();
const TOTAL = 5;
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
  users: (s = 40, c = "#7A5C10") => lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', s, c),
  target: (s = 40, c = "#7A5C10") => lucide('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s, c),
  star: (s = 40, c = "#7A5C10") => lucide('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>', s, c),
  shield: (s = 40, c = "#7A5C10") => lucide('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', s, c),
  whistle: (s = 40, c = "#7A5C10") => lucide('<path d="M5.7 21a2 2 0 0 1-3.5-2l8.6-15.3a2 2 0 0 1 3.5 2z"/><circle cx="17" cy="14" r="5"/>', s, c),
  ticket: (s = 40, c = "#7A5C10") => lucide('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>', s, c),
};

// Chip de posición (mismos colores que la app: POR ámbar, DEF azul, MED verde, DEL rojo).
function posChip(label: string, pts: string, color: string, bg: string, border: string): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
    <div style="min-width:78px;height:46px;padding:0 10px;border-radius:11px;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:21px;color:${color};">${label}</div>
    <span class="num" style="font-size:30px;color:${color};">${pts}</span></div>`;
}

function doc(logoB64: string, titleFontCss: string, pagina: number, body: string, showFoot = true): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--dark:#101726;--amber:#B45309;--amber-bg:#FEF3C7;--amber-border:#FDE68A;--green:#16713F;--green-bg:#DCFCE7;--green-border:#A7F3D0;--red:#D02B2B;--red-bg:#FEE2E2;--red-border:#FECACA;}
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
  .page{position:absolute;right:72px;top:70px;font-weight:800;font-size:17px;letter-spacing:0.1em;color:#9CA3AF;background:#fff;border:2px solid var(--ink);border-radius:7px;padding:8px 14px;box-shadow:3px 3px 0 rgba(17,24,39,0.2);z-index:3;}
  .page b{color:var(--ink);}
  .eyebrow{font-weight:800;font-size:24px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold-ink);}
  .title{line-height:0.94;letter-spacing:0.005em;color:var(--ink);text-transform:uppercase;}
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);}
  .body{font-weight:500;color:var(--ink2);} .body b{font-weight:800;color:var(--ink);}
  .card{background:var(--surf);border:2px solid var(--ink);border-radius:16px;box-shadow:8px 8px 0 rgba(17,24,39,0.85);}
  .num{letter-spacing:-0.02em;line-height:1;color:var(--ink);}
  .content{position:relative;z-index:2;margin-top:44px;}
  .foot{position:absolute;left:72px;right:72px;bottom:54px;display:flex;align-items:center;justify-content:space-between;z-index:2;}
  .url{background:var(--ink);color:#fff;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-radius:8px;padding:15px 22px;font-size:22px;}
  .foot .tag{font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-size:19px;color:#9CA3AF;}
  ${titleFontCss}
  </style></head><body>
  <div class="wrap">
    <div class="texture"></div><div class="ghost">11</div>
    <div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div></div>
    <div class="page"><b>${String(pagina).padStart(2, "0")}</b> / ${String(TOTAL).padStart(2, "0")}</div>
    ${body}
    ${showFoot ? `<div class="foot"><div class="url">LOS11DESAMPA.COM/COPA</div><div class="tag">Liga Premium</div></div>` : ""}
  </div></body></html>`;
}

// helper: cápsula de stat (ícono + número + label) usada en los rows de oferta
function stat(icon: string, big: string, label: string): string {
  return `<div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px 8px;">
    <div style="min-width:96px;height:56px;padding:0 22px;border-radius:13px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
    <span class="num" style="font-size:38px;color:var(--ink);">${big}</span>
    <span class="eyebrow" style="font-size:15px;color:var(--ink3);">${label}</span></div>`;
}

// fila de regla de puntaje (ícono + texto + pill de puntos)
function ruleRow(icon: string, title: string, sub: string, pill: string, pillColor = "var(--gold-ink)", pillBg = "var(--gold-bg)", pillBorder = "var(--gold-border)"): string {
  return `<div class="card" style="display:flex;align-items:center;gap:20px;padding:22px 26px;">
    <div style="flex:0 0 auto;width:64px;height:64px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:800;font-size:28px;color:var(--ink);line-height:1.05;">${title}</div>
      <div class="body" style="font-size:21px;margin-top:3px;">${sub}</div>
    </div>
    <div class="num" style="flex:0 0 auto;padding:10px 18px;border-radius:12px;background:${pillBg};border:2px solid ${pillBorder};color:${pillColor};font-size:34px;">${pill}</div>
  </div>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Hook: la plata frena el scroll; bridge "¿nunca jugaste? te lo explico"
function slide1(sampaB64: string): string {
  return `<div class="content">
    <div style="display:flex;align-items:flex-start;gap:26px;">
      <div style="flex:1;min-width:0;">
        <div class="eyebrow">El fantasy del Mundial 2026</div>
        <div class="title" style="font-size:86px;margin-top:14px;">LLEGÓ LA<br><span class="g">LIGA</span><br><span class="g">PREMIUM</span></div>
      </div>
      <div style="flex:0 0 auto;width:266px;height:266px;border-radius:24px;overflow:hidden;border:5px solid var(--gold);box-shadow:8px 8px 0 rgba(17,24,39,.5);background:#fff;margin-top:6px;">
        <img src="data:image/png;base64,${sampaB64}" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>
    </div>
    <div style="height:6px;width:200px;background:var(--gold);border-radius:3px;margin-top:26px;"></div>

    <div style="margin-top:40px;background:var(--dark);border:2px solid var(--gold);border-radius:22px;padding:42px 48px;box-shadow:12px 12px 0 rgba(17,24,39,.55);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="eyebrow" style="font-size:22px;color:var(--gold);">En el Mundial se juega por</div>
        <div style="flex:0 0 auto;width:78px;height:78px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(17,24,39,.4);">${ICON.trophy(50)}</div>
      </div>
      <div class="num" style="color:#fff;font-size:168px;line-height:0.88;margin-top:14px;">$400.000</div>
      <div class="body" style="font-size:28px;color:#C7CFE0;margin-top:18px;">Repartidos al <b style="color:#fff;">top 10</b>. Los pagamos <b style="color:var(--gold);">sí o sí</b>, aunque no se llenen los 100.</div>
    </div>

    <div class="card" style="margin-top:40px;padding:34px 40px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:8px 8px 0 var(--gold-border);">
      <div class="title" style="font-size:46px;color:var(--gold-ink);line-height:1.0;">¿NUNCA JUGASTE?</div>
      <p class="body" style="font-size:28px;line-height:1.34;margin-top:12px;">Te explico cómo es en 10 segundos 👇 Es más fácil de lo que pensás.</p>
    </div>
  </div>`;
}

// 2 · Qué es el juego (Paso 1): sos el DT, armás equipo con presupuesto
function slide2(): string {
  return `<div class="content">
    <div class="eyebrow">¿Qué es? · Es gratis armarlo</div>
    <div class="title" style="font-size:118px;margin-top:18px;">SOS<br>EL <span class="b">DT.</span></div>
    <div style="height:6px;width:200px;background:var(--blue);border-radius:3px;margin-top:28px;"></div>
    <p class="body" style="font-size:32px;line-height:1.36;margin-top:30px;max-width:940px;">Armás un equipo con <b>figuras reales del Mundial</b> y un técnico, con un <b>presupuesto</b>. Elegís formación y capitán — y dirigís fecha a fecha.</p>

    <div style="display:flex;gap:20px;margin-top:42px;">
      ${stat(ICON.users(34), "15", "Figuras + 1 DT")}
      ${stat(`<span class="num" style="font-size:34px;color:var(--gold-ink);">$700</span>`, "Mill.", "De presupuesto")}
      ${stat(ICON.calendar(32), "8", "Fechas")}
    </div>

    <div class="card" style="margin-top:42px;padding:34px 40px;background:var(--blue-light);border-color:var(--blue-border);box-shadow:8px 8px 0 var(--blue-border);">
      <div class="title" style="font-size:44px;color:var(--blue);line-height:1.0;">NO TE PASES DE PLATA.</div>
      <p class="body" style="font-size:27px;line-height:1.34;margin-top:12px;">No entran todas las estrellas: hay que tener <b>criterio</b> para armar el mejor 11. Ahí está el juego.</p>
    </div>
  </div>`;
}

// 3 · Cómo se suma: puntos por rendimiento real
function slide3(): string {
  return `<div class="content">
    <div class="eyebrow">¿Cómo se gana?</div>
    <div class="title" style="font-size:74px;margin-top:18px;">SUMÁS POR LO QUE<br>PASA <span class="g">EN LA CANCHA.</span></div>
    <p class="body" style="font-size:29px;line-height:1.34;margin-top:22px;max-width:940px;">Puntos reales por lo que tus jugadores hacen <b>de verdad</b> en cada partido.</p>

    <div class="card" style="margin-top:34px;padding:28px 30px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="flex:0 0 auto;width:60px;height:60px;border-radius:14px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${ICON.target(34)}</div>
        <div><div style="font-weight:800;font-size:30px;color:var(--ink);line-height:1.0;">GOL — según el puesto</div>
        <div class="body" style="font-size:21px;margin-top:3px;">👀 El del <b>defensor</b> vale más que el del 9.</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        ${posChip("POR", "+12", "var(--amber)", "var(--amber-bg)", "var(--amber-border)")}
        ${posChip("DEF", "+9", "var(--blue)", "var(--blue-light)", "var(--blue-border)")}
        ${posChip("MED", "+6", "var(--green)", "var(--green-bg)", "var(--green-border)")}
        ${posChip("DEL", "+4", "var(--red)", "var(--red-bg)", "var(--red-border)")}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:18px;margin-top:24px;">
      ${ruleRow(ICON.whistle(30), "Asistencia", "Cualquier puesto", "+2")}
      ${ruleRow(ICON.shield(30), "Valla invicta", "Arquero y defensores", "+2/3")}
      ${ruleRow(ICON.star(30), "Figura del partido", "El de mejor rating", "+4")}
    </div>

    <div class="card" style="margin-top:24px;padding:28px 34px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:8px 8px 0 var(--gold-border);display:flex;align-items:center;justify-content:space-between;gap:18px;">
      <div><div class="title" style="font-size:42px;color:var(--gold-ink);line-height:1.0;">EL CAPITÁN</div>
      <div class="body" style="font-size:24px;margin-top:6px;">Elegís uno y <b>duplica</b> su puntaje.</div></div>
      <div class="num" style="flex:0 0 auto;font-size:64px;color:var(--gold-ink);">×2</div>
    </div>
  </div>`;
}

// 4 · La oferta Premium
function slide4(): string {
  return `<div class="content">
    <div class="eyebrow">La Liga Premium</div>
    <div class="title" style="font-size:96px;margin-top:18px;"><span class="g">$400.000</span><br>AL TOP 10.</div>
    <div style="height:6px;width:200px;background:var(--gold);border-radius:3px;margin-top:26px;"></div>
    <p class="body" style="font-size:31px;line-height:1.34;margin-top:26px;max-width:940px;">Jugás con <b>tu mismo equipo</b>. Rankea desde los <b>16vos hasta la final</b>: el que mejor arma y dirige, gana.</p>

    <div style="display:flex;gap:20px;margin-top:40px;">
      ${stat(ICON.calendar(32), "28/06", "Arranca (16vos)")}
      ${stat(`<span class="num" style="font-size:32px;color:var(--gold-ink);">$5.000</span>`, "Entrada", "Por única vez")}
      ${stat(`<span class="num" style="font-size:34px;color:var(--gold-ink);">100</span>`, "Cupo", "Y se cierra")}
    </div>

    <div style="margin-top:40px;background:var(--dark);border:2px solid var(--gold);border-radius:22px;padding:42px 48px;box-shadow:12px 12px 0 rgba(17,24,39,.55);">
      <div class="eyebrow" style="font-size:22px;color:var(--gold);">Premio garantizado · al top 10</div>
      <p class="body" style="font-size:30px;color:#C7CFE0;margin-top:16px;line-height:1.34;">No es un pozo de los que juegan: <b style="color:#fff;">repartimos los $400.000 sí o sí</b>, aunque no se llenen los 100. Con <b style="color:var(--gold);">Bases y Condiciones</b>.</p>
    </div>
  </div>`;
}

// 5 · Todavía estás a tiempo + CTA (sin footer chico: la CTA es el bloque grande)
function slide5(): string {
  return `<div class="content">
    <div class="eyebrow">¿Llegaste tarde? No.</div>
    <div class="title" style="font-size:104px;margin-top:18px;">TODAVÍA<br><span class="g">ESTÁS A<br>TIEMPO.</span></div>
    <div style="height:6px;width:200px;background:var(--gold);border-radius:3px;margin-top:28px;"></div>
    <p class="body" style="font-size:32px;line-height:1.38;margin-top:30px;max-width:940px;">Armás tu equipo <b>gratis</b> y te sumás a la Copa <b>hasta el 28/06</b>. Cuando se llenan los <b>100 lugares</b>, se cierra y no se reabre.</p>

    <div style="margin-top:48px;background:var(--dark);border:2px solid var(--gold);border-radius:24px;box-shadow:12px 12px 0 rgba(17,24,39,.6);padding:54px 48px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:34px;">Tocá el link de arriba para anotarte 👆</div>
      <div class="num" style="color:var(--gold);font-size:60px;margin-top:18px;letter-spacing:-0.01em;">LOS11DESAMPA.COM/COPA</div>
      <div style="color:#9AA6BF;font-weight:700;font-size:24px;margin-top:18px;">Premio garantizado · con Bases y Condiciones</div>
    </div>

    <div class="card" style="margin-top:36px;padding:30px 38px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:8px 8px 0 var(--gold-border);text-align:center;">
      <div class="title" style="font-size:40px;color:var(--gold-ink);line-height:1.05;">EL PRODE LO GANA LA SUERTE.<br>ESTO, EL QUE SABE.</div>
    </div>
  </div>`;
}

// SINGLE · 1 frame para PAUTAR: hook + qué es (1 línea) + oferta + CTA, todo de una.
// No depende de que el usuario deslice: el que para el scroll recibe el mensaje completo.
function slideSingle(sampaB64: string): string {
  return `<div class="content" style="margin-top:40px;">
    <div style="display:flex;align-items:flex-start;gap:28px;">
      <div style="flex:1;min-width:0;">
        <div class="eyebrow">El fantasy del Mundial 2026</div>
        <div class="title" style="font-size:80px;margin-top:14px;">JUGÁ EL<br>MUNDIAL<br><span class="g">EN SERIO.</span></div>
      </div>
      <div style="flex:0 0 auto;width:300px;height:300px;border-radius:26px;overflow:hidden;border:5px solid var(--gold);box-shadow:9px 9px 0 rgba(17,24,39,.5);background:#fff;">
        <img src="data:image/png;base64,${sampaB64}" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>
    </div>
    <div style="height:7px;width:220px;background:var(--gold);border-radius:4px;margin-top:24px;"></div>
    <p class="body" style="font-size:30px;line-height:1.32;margin-top:24px;max-width:1000px;">Sos el <b>DT</b>: armás un equipo con figuras reales del Mundial y sumás puntos por lo que hacen <b>de verdad</b> en la cancha. El que mejor arma y dirige, gana.</p>

    <div style="margin-top:32px;background:var(--dark);border:2px solid var(--gold);border-radius:24px;padding:40px 48px;box-shadow:13px 13px 0 rgba(17,24,39,.55);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="eyebrow" style="font-size:22px;color:var(--gold);">Premio garantizado · al top 10</div>
        <div style="flex:0 0 auto;width:78px;height:78px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(17,24,39,.4);">${ICON.trophy(50)}</div>
      </div>
      <div class="num" style="color:#fff;font-size:150px;line-height:0.88;margin-top:12px;">$400.000</div>
      <div class="body" style="font-size:27px;color:#C7CFE0;margin-top:14px;">Los repartimos <b style="color:var(--gold);">sí o sí</b>, aunque no se llenen los 100. Con <b style="color:#fff;">Bases y Condiciones</b>.</div>
    </div>

    <div style="display:flex;gap:20px;margin-top:30px;">
      <div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:13px;padding:30px 8px 24px;">
        <div style="width:62px;height:62px;border-radius:15px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${ICON.calendar(32)}</div>
        <span class="num" style="font-size:52px;color:var(--ink);line-height:1;">28/06</span>
        <span class="eyebrow" style="font-size:15px;color:var(--ink3);">Arranca · 16vos</span>
      </div>
      <div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:13px;padding:30px 8px 24px;">
        <div style="width:62px;height:62px;border-radius:15px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${ICON.ticket(32)}</div>
        <span class="num" style="font-size:52px;color:var(--ink);line-height:1;">$5.000</span>
        <span class="eyebrow" style="font-size:15px;color:var(--ink3);">Entrada única</span>
      </div>
      <div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:13px;padding:30px 8px 24px;">
        <div style="width:62px;height:62px;border-radius:15px;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">${ICON.users(32)}</div>
        <span class="num" style="font-size:52px;color:var(--ink);line-height:1;">100</span>
        <span class="eyebrow" style="font-size:15px;color:var(--ink3);">Cupo · se cierra</span>
      </div>
    </div>

    <div class="card" style="margin-top:30px;padding:34px 44px;background:var(--gold-bg);border-color:var(--gold-border);box-shadow:9px 9px 0 var(--gold-border);">
      <div class="title" style="font-size:50px;color:var(--gold-ink);line-height:1.0;">TODAVÍA ESTÁS A TIEMPO.</div>
      <p class="body" style="font-size:28px;line-height:1.32;margin-top:14px;">Armás tu equipo <b>gratis</b> y te sumás a la <b>Liga Premium hasta el 28/06</b> (o hasta llenar los 100).</p>
    </div>
  </div>`;
}

async function main() {
  const single = process.argv.includes("--single");
  const outDir = path.join(ROOT, arg("out") ?? "out/story-premium");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, sampaBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "public/images/logo/logo-square-512.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const sampaB64 = sampaBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  if (single) {
    // 1 frame para pauta: sin paginador (no es carrusel) y con su propio CTA → sin footer chico.
    const html = doc(logoB64, titleFontCss, 1, slideSingle(sampaB64), false).replace(/<div class="page">[\s\S]*?<\/div>/, "");
    const buf = await renderStoryPng(html);
    const file = path.join(outDir, "story-premium_single.png");
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
    await closeBrowser();
    console.log(`\nListo: 1 frame (pauta) → ${path.relative(ROOT, outDir)}`);
    return;
  }

  const slides = [() => slide1(sampaB64), slide2, slide3, slide4, slide5];
  for (let i = 0; i < slides.length; i++) {
    const showFoot = i < slides.length - 1; // el slide 5 cierra con su propio bloque CTA
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!(), showFoot);
    const buf = await renderStoryPng(html);
    const file = path.join(outDir, `story-premium_${String(i + 1).padStart(2, "0")}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  await closeBrowser();
  console.log(`\nListo: ${TOTAL} slides → ${path.relative(ROOT, outDir)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
