import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Publicación #2 del lanzamiento de la Liga Premium (docs/social/LANZAMIENTO-COPA.md §"2 · D-7").
 * "Cómo entrás a la Liga Premium en 3 pasos." Carrusel 4 placas 1080×1350.
 * Mismo sistema visual que generate-que-es.ts (cancha con figuritas reales, chips Panini, banderas,
 * cards con borde negro + sombra dura) y la chrome premium de generate-copa-1.ts (footer /COPA,
 * acento dorado). Guías: docs/social/{PLACAS-GUIDELINES,VISUAL-SYSTEM,COPY-VOICE}.md.
 * Cada slide lleva una FIGURA (roadmap → cancha → ticket → bracket+premio), poco texto suelto.
 * Datos exactos (lib/game/config.ts + docs/MONETIZACION.md): 15 jug + DT, 5M–150M, presupuesto 700M,
 * entrada $5.000, cupo 100, premio $400.000 al top 10, rankea desde 16vos, te sumás hasta 28/06.
 *
 *   npx tsx scripts/generate-copa-2.ts          # → out/copa-2/copa-2_01..04.png
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 4;
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type Flag = { name: string; group: string; b64: string };
let FLAGS: Record<string, Flag> = {};
const flag = (code: string) => FLAGS[code]?.b64 ?? "";

const POS = {
  POR: { c: "#D97706", bg: "#FEF3C7" },
  DEF: { c: "#1E40AF", bg: "#DBEAFE" },
  MED: { c: "#059669", bg: "#D1FAE5" },
  DEL: { c: "#DC2626", bg: "#FEE2E2" },
};
type Pos = keyof typeof POS;

type Player = { code: string; name: string; price: string; pos: Pos; cap?: boolean };
// 15 + DT reales (capturados de la app), distinto al de "¿Qué es?" para no repetir la placa.
const XI: Record<Pos, Player[]> = {
  DEL: [
    { code: "ARG", name: "Messi", price: "100,1", pos: "DEL", cap: true },
    { code: "NOR", name: "Haaland", price: "150,0", pos: "DEL" },
    { code: "ENG", name: "Kane", price: "65,7", pos: "DEL" },
  ],
  MED: [
    { code: "ARG", name: "De Paul", price: "22,4", pos: "MED" },
    { code: "COL", name: "Rodríguez", price: "38,0", pos: "MED" },
    { code: "ESP", name: "Rodri", price: "73,5", pos: "MED" },
    { code: "CIV", name: "Diomande", price: "49,4", pos: "MED" },
  ],
  DEF: [
    { code: "NZL", name: "Payne", price: "6,0", pos: "DEF" },
    { code: "NED", name: "van Dijk", price: "25,4", pos: "DEF" },
    { code: "MAR", name: "Hakimi", price: "77,4", pos: "DEF" },
  ],
  POR: [{ code: "ARG", name: "Martínez", price: "22,4", pos: "POR" }],
};
const SUBS: Player[] = [
  { code: "ECU", name: "Galíndez", price: "6,7", pos: "POR" },
  { code: "GER", name: "Kimmich", price: "45,2", pos: "DEF" },
  { code: "CRO", name: "Perisic", price: "7,2", pos: "MED" },
  { code: "AUT", name: "Arnautović", price: "8,8", pos: "DEL" },
];
const DT = { code: "BRA", name: "Ancelotti" };

// item compacto del banco (suplente / DT) — igual que generate-que-es.ts
function benchItem(code: string, name: string, pos: Pos | "DT", price?: string): string {
  const col = pos === "DT" ? "#1B4FD8" : POS[pos].c;
  const lab = pos === "DT" ? "DT" : pos;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-weight:800;font-size:15px;color:${col};">${lab}</span>
      <div style="width:50px;height:33px;border-radius:5px;overflow:hidden;border:2px solid ${col};"><img src="${flag(code)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>
    </div>
    <span style="font-weight:800;font-size:20px;color:#111827;white-space:nowrap;">${name}</span>
    ${price ? `<span style="font-family:'TitleHeavy',sans-serif;font-size:16px;color:#6B7280;">${price}M</span>` : `<span style="font-weight:600;font-size:15px;color:#6B7280;">Técnico</span>`}
  </div>`;
}

// figurita estilo app (bandera + pill nombre + precio) — igual que generate-que-es.ts
function figure(p: Player, scale = 1): string {
  const fw = Math.round(64 * scale), fh = Math.round(42 * scale);
  const cBadge = p.cap
    ? `<div style="position:absolute;left:50%;top:${-13 * scale}px;transform:translateX(-50%);width:${26 * scale}px;height:${26 * scale}px;border-radius:50%;background:#C8A24B;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,0,0,.3);z-index:2;"><span style="font-family:'TitleHeavy',sans-serif;font-size:${14 * scale}px;color:#7A5C10;">C</span></div>`
    : "";
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:${4 * scale}px;width:${Math.round(112 * scale)}px;">
    ${cBadge}
    <div style="width:${fw}px;height:${fh}px;border-radius:6px;overflow:hidden;border:2px solid ${POS[p.pos].c};box-shadow:2px 2px 0 rgba(0,0,0,.35);"><img src="${flag(p.code)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>
    <div style="background:#fff;border-radius:6px;padding:${2 * scale}px ${8 * scale}px;box-shadow:1px 2px 0 rgba(0,0,0,.25);"><span style="font-weight:800;font-size:${18 * scale}px;color:#111827;white-space:nowrap;">${p.name}</span></div>
    <span style="font-family:'TitleHeavy',sans-serif;font-size:${17 * scale}px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5);letter-spacing:-0.02em;">${p.price}M</span>
  </div>`;
}

// cancha compacta (altura fija para no cortarse) — igual que generate-que-es.ts
function pitch(h = 640, s = 1.28): string {
  const row = (players: Player[]) =>
    `<div style="display:flex;justify-content:space-around;align-items:center;width:100%;">${players.map((p) => figure(p, s)).join("")}</div>`;
  const lines = `<svg viewBox="0 0 820 600" style="position:absolute;inset:0;width:100%;height:100%;" preserveAspectRatio="none">
      <rect x="2" y="2" width="816" height="596" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" rx="10"/>
      <line x1="2" y1="300" x2="818" y2="300" stroke="rgba(255,255,255,0.22)" stroke-width="2.5"/>
      <circle cx="410" cy="300" r="64" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5"/>
      <rect x="270" y="2" width="280" height="86" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/>
      <rect x="270" y="512" width="280" height="86" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/>
    </svg>`;
  return `<div style="position:relative;width:100%;height:${h}px;border-radius:16px;overflow:hidden;border:2px solid #111827;box-shadow:8px 8px 0 rgba(17,24,39,.85);background:repeating-linear-gradient(180deg,#2E7D4F 0 60px,#2A744A 60px 120px);">
    ${lines}
    <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:28px 10px 20px;">
      ${row(XI.DEL)}${row(XI.MED)}${row(XI.DEF)}${row(XI.POR)}
    </div>
  </div>`;
}

// ---- chrome común (familia copa-1: footer /COPA + tag Liga Premium) ---------
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
// viewBox 0 0 24 24, stroke redondeado, igual que el resto del design system.
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const ICON = {
  users: (s = 44, c = "#7A5C10") => lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>', s, c),
  ticket: (s = 44, c = "#7A5C10") => lucide('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>', s, c),
  trophy: (s = 46, c = "#7A5C10") => lucide('<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>', s, c),
  pin: (s = 30, c = "#7A5C10") => lucide('<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>', s, c),
  gift: (s = 34, c = "#7A5C10") => lucide('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>', s, c),
};

function numBadge(n: number, accent = "var(--gold)", ink = "var(--gold-ink)") {
  return `<div style="flex:0 0 auto;width:60px;height:60px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 var(--ink);"><span class="num" style="font-size:32px;color:${ink};">${n}</span></div>`;
}

// flecha gruesa "»" entre nodos del roadmap
function chev(c = "#C8A24B", s = 40) {
  return `<span style="color:${c};font-weight:800;font-size:${s}px;line-height:0.6;align-self:center;flex:0 0 auto;">&raquo;</span>`;
}

// ---- slides ----------------------------------------------------------------

// 1 · Portada + roadmap de los 3 pasos
function slide1() {
  const node = (n: number, icon: string, word: string, sub: string, gold = true) => {
    const accent = gold ? "var(--gold)" : "var(--blue)";
    const ink = gold ? "var(--gold-ink)" : "var(--blue)";
    const bg = gold ? "var(--gold-bg)" : "var(--blue-light)";
    const bd = gold ? "var(--gold-border)" : "var(--blue-border)";
    return `<div class="card" style="flex:1;text-align:center;padding:26px 12px 24px;background:${bg};border-color:${accent};box-shadow:6px 6px 0 ${bd};">
      <div style="display:flex;justify-content:center;">${numBadge(n, accent, ink)}</div>
      <div style="margin-top:16px;display:flex;justify-content:center;">${icon}</div>
      <div class="title" style="font-size:34px;margin-top:12px;color:${ink};">${word}</div>
      <p class="body" style="font-size:20px;line-height:1.25;margin-top:6px;">${sub}</p>
    </div>`;
  };
  return `<div class="content" style="margin-top:46px;">
    <div class="eyebrow" style="font-size:23px;color:var(--gold-ink);">Liga Premium · Mundial 2026</div>
    <div class="title" style="font-size:86px;margin-top:18px;">¿CÓMO<br><span class="g">ENTRÁS?</span></div>
    <p class="body" style="font-size:30px;line-height:1.36;margin-top:22px;max-width:920px;">Competir por los <b>$400.000</b> es más fácil de lo que pensás. <b>Son 3 pasos</b> — y el primero es <b>gratis</b>.</p>

    <div style="display:flex;align-items:stretch;gap:10px;margin-top:34px;">
      ${node(1, ICON.users(46, "#7A5C10"), "ARMÁ", "Tu equipo, gratis")}
      ${chev()}
      ${node(2, ICON.ticket(46), "ENTRÁ", "A la Copa, $5.000")}
      ${chev()}
      ${node(3, ICON.trophy(46), "JUGÁ", "Por $400.000")}
    </div>

    <div class="card" style="margin-top:26px;padding:20px 26px;display:flex;align-items:center;gap:16px;background:var(--blue-light);border-color:var(--blue);box-shadow:5px 5px 0 var(--blue-border);">
      <div style="flex:0 0 auto;">${ICON.pin(30, "#1B4FD8")}</div>
      <p class="body" style="font-size:23px;line-height:1.25;">¿Todavía no sabés <b>cómo se juega</b>? Mirá el carrusel <b>fijado "¿Qué es?"</b>.</p>
    </div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:130px;z-index:2;background:var(--dark);border:2px solid var(--gold);border-radius:16px;padding:26px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:7px 7px 0 rgba(17,24,39,.5);">
    <div><div class="eyebrow" style="font-size:16px;color:var(--gold);">Te lo mostramos</div>
    <div style="color:#fff;font-weight:800;font-size:34px;line-height:1.05;margin-top:4px;">Paso a paso</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="color:#9AA6BF;font-weight:800;font-size:16px;letter-spacing:0.2em;">DESLIZÁ</div><div style="color:var(--gold);font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

// 2 · Paso 1: Armá tu equipo (gratis) — la cancha como figura protagonista
function slide2() {
  const legend = (["POR", "DEF", "MED", "DEL"] as const)
    .map((p) => `<span style="display:inline-flex;align-items:center;gap:7px;font-weight:700;font-size:20px;color:var(--ink2);"><span style="width:14px;height:14px;border-radius:4px;background:${POS[p].c};display:inline-block;"></span>${p}</span>`)
    .join('<span style="color:#9CA3AF;">·</span>');
  return `<div class="content" style="margin-top:26px;">
    <div style="display:flex;align-items:center;gap:16px;">
      ${numBadge(1)}
      <div><div class="eyebrow" style="color:var(--gold-ink);">Paso 1</div>
      <div class="title" style="font-size:54px;margin-top:2px;">ARMÁ TU EQUIPO.</div></div>
      <div style="flex:0 0 auto;margin-left:auto;background:var(--green);border-radius:10px;padding:11px 20px;box-shadow:4px 4px 0 rgba(17,24,39,.5);text-align:center;">
        <div class="title" style="font-size:32px;color:#fff;line-height:0.9;">GRATIS</div>
        <div style="font-weight:800;font-size:12px;color:#CDEBD8;letter-spacing:0.12em;">NO CUESTA NADA</div>
      </div>
    </div>
    <p class="body" style="font-size:23px;line-height:1.3;margin-top:10px;max-width:940px;"><b>15 figuras + DT</b> con un presupuesto de <b>700M</b> (cada jugador, de 5M a 150M). Entrás a <b>los11desampa.com</b> — no cuesta nada.</p>
    <div style="margin-top:12px;">${pitch(648, 1.22)}</div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:10px;">${legend}</div>

    <div class="eyebrow" style="font-size:16px;margin-top:14px;color:var(--gold-ink);">Tu banco · 4 suplentes + DT</div>
    <div class="card" style="margin-top:8px;padding:16px 24px;display:flex;align-items:center;gap:22px;">
      <div style="flex:1;display:flex;justify-content:space-evenly;gap:14px;">${SUBS.map((s) => benchItem(s.code, s.name, s.pos, s.price)).join("")}</div>
      <div style="width:2px;height:80px;background:var(--border);"></div>
      <div style="flex:0 0 150px;display:flex;justify-content:center;">${benchItem(DT.code, DT.name, "DT")}</div>
    </div>
  </div>`;
}

// 3 · Paso 2: Entrá a la Copa ($5.000) — el "ticket" como figura
function slide3() {
  const stat = (big: string, label: string, gold = false) =>
    `<div class="card" style="flex:1;text-align:center;padding:24px 8px;${gold ? "background:var(--gold-bg);border-color:var(--gold-border);box-shadow:6px 6px 0 var(--gold-border);" : ""}">
      <div class="num" style="font-size:48px;color:${gold ? "var(--gold-ink)" : "var(--ink)"};">${big}</div>
      <div class="eyebrow" style="font-size:16px;margin-top:6px;">${label}</div></div>`;
  // ticket: card dorada con stub perforado + muescas laterales (estilo entrada)
  const ticket = `<div style="position:relative;margin-top:24px;background:linear-gradient(135deg,#FCF6E8,#F1E1B6);border:2px solid var(--gold);border-radius:18px;box-shadow:9px 9px 0 var(--gold-border);padding:36px 42px;display:flex;align-items:center;gap:34px;">
      <div style="position:absolute;left:-17px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:var(--bg);"></div>
      <div style="position:absolute;right:-17px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:var(--bg);"></div>
      <div style="flex:1;">
        <div class="eyebrow" style="font-size:18px;color:var(--gold-ink);">Tu entrada · Liga Premium</div>
        <div class="num" style="font-size:104px;color:var(--gold-ink);line-height:0.9;margin-top:8px;">$5.000</div>
        <div class="body" style="font-size:22px;margin-top:8px;">Pago único, una sola vez. Asegurás tu lugar.</div>
      </div>
      <div style="flex:0 0 auto;align-self:stretch;border-left:3px dashed var(--gold);"></div>
      <div style="flex:0 0 auto;text-align:center;">
        <div style="width:78px;height:78px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 rgba(17,24,39,.35);margin:0 auto;">${ICON.trophy(48)}</div>
        <div class="title" style="font-size:24px;color:var(--gold-ink);margin-top:10px;line-height:1.0;">JUGÁS POR<br>$400.000</div>
      </div>
    </div>`;
  return `<div class="content" style="margin-top:32px;">
    <div style="display:flex;align-items:center;gap:18px;">
      ${numBadge(2)}
      <div><div class="eyebrow" style="color:var(--gold-ink);">Paso 2</div>
      <div class="title" style="font-size:62px;margin-top:2px;">ENTRÁ A LA COPA.</div></div>
    </div>
    <p class="body" style="font-size:25px;line-height:1.32;margin-top:14px;max-width:940px;">Desde <b>los11desampa.com/copa</b> pagás la entrada y quedás adentro. <b>Cupo de 100</b>: cuando se llena, se cierra.</p>
    ${ticket}
    <div style="display:flex;gap:16px;margin-top:24px;">
      ${stat("$5.000", "Entrada", true)}
      ${stat("100", "Cupo")}
      ${stat("28/06", "Cierra")}
    </div>
    <div class="card" style="margin-top:18px;padding:20px 28px;background:var(--blue-light);border-color:var(--blue);box-shadow:5px 5px 0 var(--blue-border);text-align:center;">
      <p class="body" style="font-size:23px;line-height:1.3;">Te anotás <b>hasta el 28/06</b> (kickoff de 16vos) o hasta llenar los 100 — lo que pase primero.</p>
    </div>
  </div>`;
}

// 4 · Paso 3: Jugá por $400.000 — bracket 16vos→Final + bonus 5 cambios + bloque de premio
function slide4() {
  const fases = ["16vos", "8vos", "4tos", "Semis", "Final"];
  const tl = fases
    .map((f, i) => `<span style="background:${i === 0 ? "var(--gold)" : "#fff"};border:2px solid ${i === 0 ? "var(--gold-ink)" : "var(--border)"};color:${i === 0 ? "var(--gold-ink)" : "var(--ink)"};font-weight:800;font-size:24px;border-radius:9px;padding:12px 16px;box-shadow:3px 3px 0 rgba(17,24,39,0.45);">${f}</span>`)
    .join('<span style="color:var(--gold);font-weight:800;font-size:26px;align-self:center;">&rsaquo;</span>');
  return `<div class="content" style="margin-top:32px;">
    <div style="display:flex;align-items:center;gap:18px;">
      ${numBadge(3)}
      <div><div class="eyebrow" style="color:var(--gold-ink);">Paso 3</div>
      <div class="title" style="font-size:54px;margin-top:2px;">JUGÁ POR <span class="g">$400.000</span>.</div></div>
    </div>
    <p class="body" style="font-size:25px;line-height:1.32;margin-top:14px;max-width:940px;">Tu mismo equipo <b>rankea desde los 16vos hasta la final</b>. Hacés cambios fecha a fecha: <b>el que mejor dirige, gana</b>.</p>

    <div style="margin-top:18px;background:var(--gold-bg);border:2px solid var(--gold);border-radius:14px;box-shadow:5px 5px 0 var(--gold-border);padding:16px 22px;display:flex;align-items:center;gap:18px;">
      <div style="flex:0 0 auto;width:56px;height:56px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 rgba(17,24,39,.3);">${ICON.gift(32)}</div>
      <div style="flex:1;">
        <div class="eyebrow" style="font-size:15px;color:var(--gold-ink);">Bonus al entrar</div>
        <p class="body" style="font-size:22px;line-height:1.22;margin-top:2px;"><b>5 cambios gratis</b> en los 16vos para rearmar tu equipo <span style="color:var(--ink3);">(en vez de 1).</span></p>
      </div>
    </div>

    <div class="card" style="margin-top:18px;padding:24px 26px;background:var(--blue-light);border-color:var(--blue);box-shadow:7px 7px 0 var(--blue-border);">
      <div class="eyebrow" style="font-size:17px;color:var(--blue);text-align:center;">Tu Liga Premium corre toda esta ruta</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:18px;flex-wrap:nowrap;">${tl}</div>
    </div>

    <div style="margin-top:16px;background:var(--dark);border:2px solid var(--gold);border-radius:18px;padding:26px 40px;box-shadow:9px 9px 0 rgba(17,24,39,.5);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="eyebrow" style="font-size:18px;color:var(--gold);">Premio garantizado · al top 10</div>
        <div style="flex:0 0 auto;width:58px;height:58px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 rgba(17,24,39,.4);">${ICON.trophy(38)}</div>
      </div>
      <div class="num" style="color:#fff;font-size:96px;line-height:0.92;margin-top:8px;">$400.000</div>
      <p class="body" style="font-size:21px;color:#C7CFE0;margin-top:10px;">Se reparte <b style="color:#fff;">sí o sí</b>, aunque no se llenen los 100. Con Bases y Condiciones.</p>
    </div>

    <div style="margin-top:16px;background:var(--gold);border-radius:14px;box-shadow:7px 7px 0 var(--ink);padding:22px 38px;text-align:center;">
      <div style="color:var(--gold-ink);font-weight:800;font-size:24px;">Entrá ahora</div>
      <div class="num" style="color:#3D2E08;font-size:46px;margin-top:6px;">LOS11DESAMPA.COM/COPA</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/copa-2");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont, flagsRaw] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf8"),
  ]);
  FLAGS = JSON.parse(flagsRaw) as Record<string, Flag>;
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides = [slide1, slide2, slide3, slide4];
  for (let i = 0; i < slides.length; i++) {
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!());
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `copa-2_${String(i + 1).padStart(2, "0")}.png`);
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
