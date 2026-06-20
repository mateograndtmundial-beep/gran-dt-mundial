import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";

/*
 * Carrusel ANCLADO "¿Qué es Los 11 de Sampa?" — 7 placas explicativas 1080×1350.
 * Estética: docs/ui/UI-DIRECTION.md + familia de out/scoreboards|stories|social-reminder.
 * Sin screenshots. Títulos en Archivo Black, cuerpo en Poppins (igual a los reminders),
 * cancha con jugadores reales. Mismo render que scoreboards.
 *
 *   npx tsx scripts/generate-que-es.ts          # → out/que-es/que-es_01..07.png
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 7;
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
const XI: Record<Pos, Player[]> = {
  DEL: [
    { code: "ARG", name: "Messi", price: "100,1", pos: "DEL", cap: true },
    { code: "NOR", name: "Haaland", price: "150,0", pos: "DEL" },
    { code: "USA", name: "Balogun", price: "29,2", pos: "DEL" },
  ],
  MED: [
    { code: "ARG", name: "De Paul", price: "22,4", pos: "MED" },
    { code: "MAR", name: "Díaz", price: "45,2", pos: "MED" },
    { code: "POR", name: "Fernandes", price: "45,2", pos: "MED" },
    { code: "ENG", name: "Bellingham", price: "135,5", pos: "MED" },
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
  { code: "IRN", name: "Rezaeian", price: "5,9", pos: "DEF" },
  { code: "NZL", name: "Just", price: "5,7", pos: "MED" },
  { code: "AUT", name: "Arnautovic", price: "8,8", pos: "DEL" },
];
const DT = { code: "BRA", name: "Ancelotti" };

// figurita estilo app (bandera + pill nombre + precio)
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

// cancha compacta (altura fija para no cortarse)
function pitch(h = 660, s = 1.32): string {
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
    <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:30px 10px 22px;">
      ${row(XI.DEL)}${row(XI.MED)}${row(XI.DEF)}${row(XI.POR)}
    </div>
  </div>`;
}

// item compacto del banco (suplentes / DT)
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

// ---- chrome común ----------------------------------------------------------
function doc(logoB64: string, titleFontCss: string, pagina: number, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--danger:#D02B2B;--danger-bg:#FEE2E2;--green:#16713F;}
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  /* títulos y numerales SIEMPRE Archivo Black, también sus <span> de acento (azul/dorado),
     para que el acento tenga el MISMO ancho/peso que el texto negro. */
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
    <div class="foot"><div class="url">LOS11DESAMPA.COM</div><div class="tag">El juego de los DT</div></div>
  </div></body></html>`;
}

// iconitos SVG (sin emojis)
const ICON = {
  globe: (s = 40, c = "#1B4FD8") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>`,
  users: (s = 40, c = "#1B4FD8") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="8" r="2.6"/><path d="M16 13.5a5 5 0 0 1 4.5 5"/></svg>`,
  trophy: (s = 46, c = "#7A5C10") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 19h6M10 15.5V19M14 15.5V19"/></svg>`,
};

// ---- slides ----------------------------------------------------------------
function slide1() {
  return `<div class="content">
    <div class="eyebrow" style="font-size:24px;">El fantasy del Mundial 2026</div>
    <div class="title" style="font-size:138px;margin-top:16px;">¿QUÉ ES<br>LOS <span class="b">11</span><br>DE SAMPA?</div>
    <p class="body" style="font-size:31px;line-height:1.4;margin-top:32px;max-width:880px;">Sos el <b>DT</b>. Armás tu equipo del Mundial y competís con tus amigos durante todo el torneo.</p>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:150px;z-index:2;background:var(--dark);border-radius:14px;padding:30px 38px;display:flex;align-items:center;justify-content:space-between;box-shadow:6px 6px 0 rgba(17,24,39,0.5);">
    <div style="color:#fff;font-weight:800;font-size:34px;line-height:1.05;">Te lo explicamos<br>en 1 minuto</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="color:#9AA6BF;font-weight:800;font-size:16px;letter-spacing:0.2em;">DESLIZÁ</div><div style="color:#FFD34D;font-weight:800;font-size:50px;line-height:0.7;">&raquo;&raquo;</div></div>
  </div>`;
}

function numBadge(n: number) {
  return `<div style="flex:0 0 auto;width:56px;height:56px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 var(--ink);"><span class="num" style="font-size:30px;color:#fff;">${n}</span></div>`;
}
function slide2() {
  const row = (n: number, strong: string, rest: string) =>
    `<div class="card" style="display:flex;align-items:center;gap:22px;padding:26px 28px;">
      ${numBadge(n)}<p class="body" style="font-size:29px;line-height:1.3;"><b>${strong}</b> ${rest}</p></div>`;
  return `<div class="content">
    <div class="eyebrow">La idea</div>
    <div class="title" style="font-size:104px;margin-top:10px;">SOS EL <span class="b">DT</span>.</div>
    <div style="display:flex;flex-direction:column;gap:22px;margin-top:38px;">
      ${row(1, "Armás un equipo", "con cracks <b>reales</b> del Mundial: 15 jugadores + un técnico.")}
      ${row(2, "Ellos juegan", "sus partidos de verdad → vos <b>sumás puntos</b> por lo que hacen en la cancha.")}
      ${row(3, "Gana", "el que mejor arma y dirige. Todo el Mundial, fecha a fecha.")}
    </div>
    <div class="title" style="margin-top:42px;text-align:center;border-top:2px solid var(--border);padding-top:28px;font-size:40px;">NO ES ADIVINAR RESULTADOS.<br>ES <span class="b">SABER DE FÚTBOL</span>.</div>
  </div>`;
}

function slide3() {
  const legend = (["POR", "DEF", "MED", "DEL"] as const)
    .map((p) => `<span style="display:inline-flex;align-items:center;gap:7px;font-weight:700;font-size:20px;color:var(--ink2);"><span style="width:14px;height:14px;border-radius:4px;background:${POS[p].c};display:inline-block;"></span>${p}</span>`)
    .join('<span style="color:#9CA3AF;">·</span>');
  return `<div class="content" style="margin-top:30px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;">
      <div><div class="eyebrow">Armá tu plantel</div>
      <div class="title" style="font-size:68px;margin-top:6px;">15 FIGURAS + <span class="b">1 DT</span>.</div></div>
      <div style="flex:0 0 auto;background:var(--dark);border:2px solid var(--gold);border-radius:12px;padding:10px 24px;text-align:center;box-shadow:4px 4px 0 rgba(17,24,39,.55);">
        <div class="eyebrow" style="font-size:15px;color:var(--gold);">Presupuesto</div>
        <div class="num" style="font-size:56px;color:#fff;margin-top:2px;">700<span style="font-size:30px;color:var(--gold);">M</span></div>
      </div>
    </div>
    <p class="body" style="font-size:23px;margin-top:8px;">Cada figura cuesta según su nivel (de 5M a 150M). Armá el <b>mejor 11</b> sin pasarte del presupuesto.</p>
    <div style="margin-top:14px;">${pitch(662)}</div>
    <div style="display:flex;gap:18px;justify-content:center;margin-top:12px;">${legend}</div>
    <div class="card" style="margin-top:14px;padding:18px 26px;display:flex;align-items:center;gap:26px;">
      <span class="eyebrow" style="font-size:15px;color:var(--ink3);white-space:nowrap;writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:0.2em;">TU BANCO</span>
      <div style="flex:1;display:flex;justify-content:space-evenly;gap:20px;">${SUBS.map((s) => benchItem(s.code, s.name, s.pos, s.price)).join("")}</div>
      <div style="width:2px;height:78px;background:var(--border);"></div>
      <div style="flex:0 0 150px;display:flex;justify-content:center;">${benchItem(DT.code, DT.name, "DT")}</div>
    </div>
  </div>`;
}

function slide4() {
  const golCard = (p: Pos, val: string) =>
    `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;background:${POS[p].bg};border:2px solid ${POS[p].c};border-radius:12px;padding:16px 0;">
      <span class="num" style="font-size:56px;color:${POS[p].c};">+${val}</span>
      <span style="font-weight:800;font-size:21px;letter-spacing:0.06em;color:${POS[p].c};">${p}</span></div>`;
  const posTag = (p: Pos, v: string) =>
    `<span style="display:inline-flex;align-items:center;gap:7px;background:${POS[p].bg};border:2px solid ${POS[p].c};border-radius:8px;padding:5px 12px;"><span style="font-weight:800;font-size:19px;color:${POS[p].c};">${p}</span><span class="num" style="font-size:26px;color:${POS[p].c};">${v}</span></span>`;
  const sumRow = (concept: string, rightHtml: string, gold = false) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;background:${gold ? "var(--gold-bg)" : "var(--surf)"};border:2px solid ${gold ? "var(--gold-border)" : "var(--border)"};border-radius:12px;box-shadow:4px 4px 0 rgba(17,24,39,0.7);padding:16px 24px;">
      <span style="font-weight:700;font-size:27px;color:var(--ink);">${concept}</span>${rightHtml}</div>`;
  const bigVal = (v: string, gold = false) => `<span class="num" style="font-size:38px;color:${gold ? "var(--gold-ink)" : "var(--ink)"};">${v}</span>`;
  const restCard = (label: string, val: string) =>
    `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--danger-bg);border:2px solid var(--danger);border-radius:10px;padding:14px 6px;">
      <span class="num" style="font-size:34px;color:var(--danger);">${val}</span>
      <span style="font-weight:700;font-size:19px;color:var(--ink);text-align:center;">${label}</span></div>`;
  return `<div class="content" style="margin-top:30px;">
    <div class="eyebrow">Cómo sumás puntos</div>
    <div class="title" style="font-size:68px;margin-top:8px;">LO QUE PASA EN LA <span class="b">CANCHA</span>.</div>

    <div style="margin-top:22px;background:var(--surf);border:2px solid var(--ink);border-radius:14px;box-shadow:6px 6px 0 rgba(17,24,39,.85);padding:22px 24px;">
      <p style="font-weight:800;font-size:24px;color:var(--ink);margin-bottom:14px;">Lo que sumás por cada <b style="color:var(--blue);">GOL</b>, <span style="color:var(--ink3);font-weight:600;">según tu puesto:</span></p>
      <div style="display:flex;gap:12px;">${golCard("POR", "12")}${golCard("DEF", "9")}${golCard("MED", "6")}${golCard("DEL", "4")}</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px;">
      ${sumRow("Asistencia", bigVal("+2"))}
      ${sumRow("Valla invicta (sin goles en contra)", `<span style="display:flex;gap:10px;">${posTag("POR", "+3")}${posTag("DEF", "+2")}</span>`)}
      ${sumRow("Penal atajado", bigVal("+4"))}
      ${sumRow("Figura del partido ★", bigVal("+4", true), true)}
    </div>

    <p class="eyebrow" style="font-size:19px;color:var(--danger);margin:20px 0 12px;">Y lo que resta</p>
    <div style="display:flex;gap:12px;">
      ${restCard("Amarilla", "−2")}${restCard("Roja", "−4")}${restCard("Gol en contra", "−2")}${restCard("Penal errado", "−4")}
    </div>

    <div style="margin-top:18px;background:var(--dark);border-radius:12px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:#fff;font-weight:700;font-size:25px;">Tu <b style="color:#FFD34D;">técnico</b> también suma</span>
      <span style="font-weight:800;font-size:25px;color:#fff;">gana <span style="color:#7CE0A3;">+2</span> · pierde <span style="color:#FF8A8A;">−2</span></span>
    </div>
  </div>`;
}

function slide5() {
  const messi: Player = { code: "ARG", name: "Messi", price: "100,1", pos: "DEL", cap: true };
  const haaland: Player = { code: "NOR", name: "Haaland", price: "150,0", pos: "DEL" };
  const balogun: Player = { code: "USA", name: "Balogun", price: "29,2", pos: "DEL" };
  const mini = (p: Player, opts: { dim?: boolean } = {}) =>
    `<div style="${opts.dim ? "opacity:.4;filter:grayscale(1);" : ""}background:#2A744A;border-radius:12px;padding:16px 12px 14px;">${figure(p, 0.95)}</div>`;
  const arrow = (label: string, c = "#7A5C10") =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:0 0 auto;"><svg width="74" height="40" viewBox="0 0 74 40" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20h50M46 8l16 12-16 12"/></svg><span class="num" style="font-size:26px;color:${c};">${label}</span></div>`;
  return `<div class="content">
    <div class="eyebrow">Dos claves</div>
    <div class="title" style="font-size:82px;margin-top:8px;">QUE TE DAN <span class="b">VENTAJA</span>.</div>

    <div class="card" style="margin-top:30px;padding:28px 32px;border-color:var(--gold);box-shadow:7px 7px 0 var(--gold-border);">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <div style="width:50px;height:50px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 var(--ink);"><span class="num" style="font-size:28px;color:var(--gold-ink);">C</span></div>
        <span class="title" style="font-size:42px;">EL CAPITÁN <span class="g">DUPLICA</span></span>
      </div>
      <div style="display:flex;align-items:center;gap:30px;">
        ${mini(messi)}
        <div style="display:flex;align-items:center;gap:24px;flex:1;justify-content:center;">
          <div style="text-align:center;"><div class="num" style="font-size:46px;color:var(--ink);">8</div><div style="font-weight:700;font-size:20px;color:var(--ink3);">rating</div></div>
          ${arrow("×2")}
          <div style="text-align:center;"><div class="num" style="font-size:60px;color:var(--gold-ink);">16</div><div style="font-weight:700;font-size:20px;color:var(--gold-ink);">puntos</div></div>
        </div>
      </div>
      <p class="body" style="font-size:24px;text-align:center;margin-top:16px;">Ponele la cinta al que <b>mejor juega los partidos</b>: duplicás su calificación.</p>
    </div>

    <div class="card" style="margin-top:26px;padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <div style="width:50px;height:50px;border-radius:12px;background:var(--blue);display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 var(--ink);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div>
        <span class="title" style="font-size:42px;">EL BANCO TE <span class="b">SALVA</span></span>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;">
        ${mini(haaland, { dim: true })}${arrow("entra", "#1B4FD8")}${mini(balogun)}
      </div>
      <p class="body" style="font-size:24px;text-align:center;margin-top:16px;">¿Un titular <b>no jugó</b>? Su suplente entra y <b>puntúa por él</b>, solo. Tu fecha no se pierde.</p>
    </div>
  </div>`;
}

function slide6() {
  const fases = ["J1", "J2", "J3", "16vos", "8vos", "4tos", "Semis", "Final"];
  const tl = fases
    .map((f) => `<span style="background:#fff;border:2px solid var(--border);color:var(--ink);font-weight:800;font-size:23px;border-radius:8px;padding:9px 14px;box-shadow:2px 2px 0 rgba(17,24,39,0.5);">${f}</span>`)
    .join('<span style="color:#9CA3AF;font-weight:800;font-size:24px;align-self:center;">›</span>');
  return `<div class="content">
    <div class="eyebrow">8 fechas</div>
    <div class="title" style="font-size:90px;margin-top:10px;">DEL <span class="b">GRUPO</span><br>A LA FINAL.</div>
    <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:32px;">${tl}</div>
    <div class="card" style="margin-top:38px;padding:36px 34px;background:var(--blue-light);border-color:var(--blue);box-shadow:7px 7px 0 var(--blue-border);">
      <div class="title" style="font-size:50px;color:var(--blue);line-height:0.98;">¿EMPEZÓ EL MUNDIAL?<br>TODAVÍA ESTÁS A TIEMPO.</div>
      <p class="body" style="font-size:29px;line-height:1.4;margin-top:20px;">Te sumás <b>cuando quieras</b> y competís <b>desde la fecha que vos elijas</b>. Después, <b>1 cambio gratis por fecha</b> y tu equipo se cierra al arrancar el primer partido.</p>
    </div>
  </div>`;
}

function slide7() {
  const card = (icon: string, title: string, desc: string) =>
    `<div class="card" style="flex:1;padding:28px 26px;">
      <div style="margin-bottom:12px;">${icon}</div>
      <div class="title" style="font-size:34px;margin-bottom:8px;">${title}</div>
      <p class="body" style="font-size:24px;line-height:1.3;">${desc}</p></div>`;
  return `<div class="content">
    <div class="eyebrow">Y ahora, a competir</div>
    <div class="title" style="font-size:74px;margin-top:10px;">RANKING <span class="b">GLOBAL</span><br>+ LIGAS CON AMIGOS.</div>
    <div style="display:flex;gap:22px;margin-top:48px;">
      ${card(ICON.globe(52), "Ranking global", "Competí contra todos los DT del país, fecha a fecha.")}
      ${card(ICON.users(52), "Tu liga privada", "Creás una y sumás a los pibes con un código.")}
    </div>
    <div style="margin-top:44px;background:var(--gold-bg);border:2px solid var(--gold);border-radius:14px;box-shadow:7px 7px 0 var(--gold-border);padding:36px 34px;display:flex;align-items:center;gap:26px;">
      <div style="flex:0 0 auto;width:96px;height:96px;border-radius:50%;background:#fff;border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;">${ICON.trophy(58)}</div>
      <div><div class="title" style="font-size:44px;color:var(--gold-ink);line-height:1.0;">DESDE 16VOS, SE VIENEN PREMIOS.</div><p class="body" style="font-size:26px;margin-top:8px;">Preparate: se vienen sorpresas. Sin spoilers.</p></div>
    </div>
    <div style="margin-top:46px;background:var(--blue);border-radius:16px;box-shadow:9px 9px 0 var(--ink);padding:58px 42px;text-align:center;">
      <div style="color:#fff;font-weight:800;font-size:31px;">Es gratis · armá tu equipo en 5 minutos</div>
      <div class="num" style="color:#fff;font-size:74px;letter-spacing:0.01em;margin-top:12px;">LOS11DESAMPA.COM</div>
    </div>
  </div>`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const outDir = path.join(ROOT, arg("out") ?? "out/que-es");
  await mkdir(outDir, { recursive: true });
  const [logoBuf, titleFont, flagsRaw] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf8"),
  ]);
  FLAGS = JSON.parse(flagsRaw) as Record<string, Flag>;
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;

  const slides = [slide1, slide2, slide3, slide4, slide5, slide6, slide7];
  for (let i = 0; i < slides.length; i++) {
    const html = doc(logoB64, titleFontCss, i + 1, slides[i]!());
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `que-es_${String(i + 1).padStart(2, "0")}.png`);
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
