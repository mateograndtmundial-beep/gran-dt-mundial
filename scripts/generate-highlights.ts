import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPng } from "../lib/stories/render";
import { SCORING, BUDGET, SQUAD, FREE_CHANGES_PER_ROUND, ROUNDS } from "../lib/game/config";

/*
 * Generador de DESTACADAS (Instagram Highlights) — paquetes de stories 9:16 (1080×1920)
 * que responden lo que se pregunta quien stalkea el perfil antes de jugar. Evergreen,
 * para anclar arriba del perfil. Hoy solo existen F1/F2 (resultados); esto suma 4 packs:
 *
 *   EMPEZÁ ACÁ      onboarding: qué es + armar el 11 en 3 pasos        (acento azul)
 *   PUNTAJE         cómo se suman puntos (de lib/game/config SCORING)  (acento azul/dorado)
 *   LA COPA         Liga Premium: premio garantizado, cómo entrar      (acento dorado, dark)
 *   GRATIS/AMIGOS   es gratis, ligas privadas, pines                   (acento verde)
 *
 * Misma familia visual que generate-copa-N.ts / assets/stories/template.html: chrome con
 * header badge + wordmark, ghost "11", texture, sombras duras, Archivo Black en títulos,
 * íconos Lucide con paths OFICIALES. Zonas seguras de Story respetadas (IG tapa ~250px
 * arriba/abajo): header con padding-top 150, footer por encima del bottom muerto.
 *
 * Números del juego (puntaje, presupuesto, cambios) IMPORTADOS de lib/game/config →
 * nunca se desincronizan con el juego real. NO toca la DB: es 100% estático/config.
 *
 *   npx tsx scripts/generate-highlights.ts --all                       # 4 packs + todas las tapas
 *   npx tsx scripts/generate-highlights.ts --pack puntaje              # un pack
 *   npx tsx scripts/generate-highlights.ts --pack copa --enrolled 72   # copa con cupo real
 *   npx tsx scripts/generate-highlights.ts --covers                    # tapas de los packs FAQ
 *   npx tsx scripts/generate-highlights.ts --round-covers              # tapas de resultados (F1..Final)
 *
 * ⚠️ COPA: el cupo es REAL → pasalo por --enrolled (de getCopasStatus). Sin --enrolled la
 *    story NO muestra "quedan X" (por ser destacada anclada, evita un número que envejece).
 *    Nunca inflar. El premio es fijo y garantizado ($400.000 al top 10).
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1920 };
const SIZE_COVER = { width: 1080, height: 1080 };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

// Cupo de la Copa (opcional). Si no se pasa, no se muestra (destacada evergreen).
const CAPACITY = Number(arg("capacity") ?? 100);
const ENROLLED_RAW = arg("enrolled");
const SHOW_CUPO = ENROLLED_RAW !== undefined;
const ENROLLED = Math.max(0, Math.min(CAPACITY, Number(ENROLLED_RAW ?? 0)));
const LEFT = CAPACITY - ENROLLED;

// ─── Íconos: paths OFICIALES de Lucide (node_modules/lucide-react), no dibujados a mano ───
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const P = {
  play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
  flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
  gamepad: '<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/><path d="M9 8v2"/><path d="M8 9h2"/><path d="M15 9h.01"/><path d="M17 11h.01"/>',
  trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  list: '<path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
  goal: '<path d="M12 13V2l8 4-8 4"/><path d="M20.561 10.222a9 9 0 1 1-12.55-5.29"/><path d="M8.002 9.997a5 5 0 1 0 8.9 2.02"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  plus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  minus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  trendingUp: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  award: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  medal: '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
};

// ─── Chrome 9:16 (medidas validadas en assets/stories/template.html) ───
type Foot = { url: string; tag: string };
function doc(
  logoB64: string,
  titleFontCss: string,
  inner: string,
  foot: Foot
): string {
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

// ─── Helpers de bloque ───
const eyebrow = (icon: string, text: string, color = "#9CA3AF") =>
  `<div class="eyebrow" style="color:${color};">${icon}<span>${text}</span></div>`;

// paso numerado (1·2·3) con ícono
function stepCard(n: number, icon: string, title: string, desc: string, accent: string, accBg: string, accBorder: string): string {
  return `<div class="card" style="display:flex;align-items:center;gap:26px;padding:30px 34px;">
    <div style="flex:0 0 auto;position:relative;width:84px;height:84px;border-radius:18px;background:${accBg};border:2px solid ${accBorder};display:flex;align-items:center;justify-content:center;">
      ${icon}
      <span class="num" style="position:absolute;top:-14px;left:-14px;width:44px;height:44px;border-radius:50%;background:${accent};color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:2px 2px 0 rgba(17,24,39,.4);">${n}</span>
    </div>
    <div style="flex:1;"><div style="font-weight:800;font-size:34px;color:var(--ink);line-height:1.08;">${title}</div><p class="body" style="font-size:25px;line-height:1.3;margin-top:4px;">${desc}</p></div></div>`;
}

// card horizontal simple (ícono + título + desc)
function iconCard(icon: string, title: string, desc: string, accBg = "#fff", accBorder = "var(--ink)"): string {
  return `<div class="card" style="display:flex;align-items:center;gap:24px;padding:28px 32px;">
    <div style="flex:0 0 auto;width:78px;height:78px;border-radius:16px;background:${accBg};border:2px solid ${accBorder};display:flex;align-items:center;justify-content:center;">${icon}</div>
    <div style="flex:1;"><div style="font-weight:800;font-size:32px;color:var(--ink);line-height:1.1;">${title}</div><p class="body" style="font-size:24px;line-height:1.3;margin-top:4px;">${desc}</p></div></div>`;
}

// fila puntaje (suma / resta) con badge de valor
function scoreRow(label: string, value: string, positive: boolean): string {
  const c = positive ? "var(--green)" : "var(--danger)";
  const bg = positive ? "var(--green-bg)" : "var(--danger-bg)";
  const bd = positive ? "var(--green-border)" : "var(--danger-border)";
  return `<div style="display:flex;align-items:center;gap:18px;background:#fff;border:2px solid var(--ink);border-radius:12px;box-shadow:4px 4px 0 rgba(17,24,39,.7);padding:18px 24px;">
    <span style="flex:1;font-weight:700;font-size:28px;color:var(--ink);">${label}</span>
    <span class="num" style="font-size:34px;color:${c};background:${bg};border:2px solid ${bd};border-radius:10px;padding:6px 16px;min-width:96px;text-align:center;">${value}</span>
  </div>`;
}

// stat compacto en bloque oscuro (Copa)
function heroStat(value: string, label: string): string {
  return `<div style="flex:1;text-align:center;">
    <div class="num" style="font-size:46px;color:var(--gold);">${value}</div>
    <div style="font-weight:700;font-size:19px;letter-spacing:0.04em;color:#9AA6BF;margin-top:8px;text-transform:uppercase;">${label}</div>
  </div>`;
}

const ic = (paths: string, c: string, s = 40) => lucide(paths, s, c);
const URL_MAIN = "LOS11DESAMPA.COM";
const URL_COPA = "LOS11DESAMPA.COM/COPA";

// ─── Toolkit de CANCHA (figuritas + campo), portado de generate-que-es.ts ───
type Flag = { name: string; group: string; b64: string };
let FLAGS: Record<string, Flag> = {};
const flag = (code: string) => FLAGS[code]?.b64 ?? "";

const POSF = {
  POR: { c: "#D97706", bg: "#FEF3C7" },
  DEF: { c: "#1E40AF", bg: "#DBEAFE" },
  MED: { c: "#059669", bg: "#D1FAE5" },
  DEL: { c: "#DC2626", bg: "#FEE2E2" },
};
type PosF = keyof typeof POSF;
type Player = { code: string; name: string; price: string; pos: PosF; cap?: boolean };

const XI: Record<PosF, Player[]> = {
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

// figurita estilo app (bandera + pill nombre + precio)
function figure(p: Player, scale = 1): string {
  const fw = Math.round(64 * scale), fh = Math.round(42 * scale);
  const cBadge = p.cap
    ? `<div style="position:absolute;left:50%;top:${-13 * scale}px;transform:translateX(-50%);width:${26 * scale}px;height:${26 * scale}px;border-radius:50%;background:#C8A24B;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,0,0,.3);z-index:2;"><span style="font-family:'TitleHeavy',sans-serif;font-size:${14 * scale}px;color:#7A5C10;">C</span></div>`
    : "";
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:${4 * scale}px;width:${Math.round(112 * scale)}px;">
    ${cBadge}
    <div style="width:${fw}px;height:${fh}px;border-radius:6px;overflow:hidden;border:2px solid ${POSF[p.pos].c};box-shadow:2px 2px 0 rgba(0,0,0,.35);"><img src="${flag(p.code)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>
    <div style="background:#fff;border-radius:6px;padding:${2 * scale}px ${8 * scale}px;box-shadow:1px 2px 0 rgba(0,0,0,.25);"><span style="font-weight:800;font-size:${18 * scale}px;color:#111827;white-space:nowrap;">${p.name}</span></div>
    <span style="font-family:'TitleHeavy',sans-serif;font-size:${17 * scale}px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5);letter-spacing:-0.02em;">${p.price}M</span>
  </div>`;
}

// cancha (altura fija para no cortarse). En story se usa más alta que en el feed.
function pitch(h = 900, s = 1.42): string {
  const row = (players: Player[]) =>
    `<div style="display:flex;justify-content:space-around;align-items:center;width:100%;">${players.map((p) => figure(p, s)).join("")}</div>`;
  const lines = `<svg viewBox="0 0 820 600" style="position:absolute;inset:0;width:100%;height:100%;" preserveAspectRatio="none">
      <rect x="2" y="2" width="816" height="596" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" rx="10"/>
      <line x1="2" y1="300" x2="818" y2="300" stroke="rgba(255,255,255,0.22)" stroke-width="2.5"/>
      <circle cx="410" cy="300" r="64" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5"/>
      <rect x="270" y="2" width="280" height="86" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/>
      <rect x="270" y="512" width="280" height="86" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/>
    </svg>`;
  return `<div style="position:relative;width:100%;height:${h}px;border-radius:18px;overflow:hidden;border:2px solid #111827;box-shadow:8px 8px 0 rgba(17,24,39,.85);background:repeating-linear-gradient(180deg,#2E7D4F 0 64px,#2A744A 64px 128px);">
    ${lines}
    <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:38px 14px 30px;">
      ${row(XI.DEL)}${row(XI.MED)}${row(XI.DEF)}${row(XI.POR)}
    </div>
  </div>`;
}

// leyenda de posiciones (POR · DEF · MED · DEL)
function posLegend(): string {
  return (["POR", "DEF", "MED", "DEL"] as const)
    .map((p) => `<span style="display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:24px;color:var(--ink2);"><span style="width:18px;height:18px;border-radius:5px;background:${POSF[p].c};display:inline-block;"></span>${p}</span>`)
    .join('<span style="color:#9CA3AF;">·</span>');
}

// banco esquemático: 4 suplentes (por puesto) + DT. No nombra jugadores, solo deja
// claro que además del 11 hay 4 suplentes y 1 técnico.
function benchStrip(): string {
  const slot = (label: string, col: string, bg: string) =>
    `<div style="flex:1;height:74px;border-radius:10px;border:2px solid ${col};background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(17,24,39,.5);"><span style="font-weight:800;font-size:24px;color:${col};">${label}</span></div>`;
  return `<div class="card" style="margin-top:18px;padding:22px 26px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <span style="font-weight:800;font-size:20px;letter-spacing:0.14em;color:var(--ink3);text-transform:uppercase;">El banco</span>
      <span style="font-weight:800;font-size:22px;color:var(--ink);">+ 4 suplentes y 1 DT</span>
    </div>
    <div style="display:flex;gap:12px;align-items:stretch;">
      ${slot("POR", POSF.POR.c, POSF.POR.bg)}${slot("DEF", POSF.DEF.c, POSF.DEF.bg)}${slot("MED", POSF.MED.c, POSF.MED.bg)}${slot("DEL", POSF.DEL.c, POSF.DEL.bg)}
      <div style="width:2px;background:var(--border);"></div>
      ${slot("DT", "#1B4FD8", "var(--blue-light)")}
    </div>
  </div>`;
}

// tabla de ranking esquemática de una liga privada (para la destacada de amigos).
// Nombres de ejemplo; "VOS" resaltado. Es ilustrativo, no datos reales.
function leagueTable(): string {
  const rows: Array<{ name: string; pts: number; you?: boolean }> = [
    { name: "Mateo", pts: 312 },
    { name: "VOS", pts: 298, you: true },
    { name: "Lucho", pts: 281 },
    { name: "Nico", pts: 264 },
  ];
  const medalCol = ["#C8A24B", "#9AA6BF", "#B87333"]; // oro · plata · bronce (Lucide medal)
  const rankIcon = (i: number) =>
    i < 3
      ? lucide(P.medal, 38, medalCol[i]!)
      : `<span class="num" style="font-size:30px;color:var(--ink3);">${i + 1}</span>`;
  const body = rows
    .map((r, i) => {
      const hl = r.you;
      return `<div style="display:flex;align-items:center;gap:18px;background:${hl ? "var(--green-bg)" : "#fff"};border:2px solid ${hl ? "var(--green)" : "var(--ink)"};border-radius:12px;box-shadow:4px 4px 0 ${hl ? "var(--green-border)" : "rgba(17,24,39,.7)"};padding:16px 22px;">
        <span style="width:46px;display:flex;align-items:center;justify-content:center;">${rankIcon(i)}</span>
        <span style="flex:1;font-weight:800;font-size:32px;text-transform:uppercase;letter-spacing:-0.01em;color:${hl ? "var(--green)" : "var(--ink)"};">${r.name}</span>
        <span class="num" style="font-size:34px;color:${hl ? "var(--green)" : "var(--ink)"};">${r.pts}<span style="font-size:18px;color:#9AA6BF;font-weight:700;"> pts</span></span>
      </div>`;
    })
    .join("");
  return `<div class="card" style="padding:24px 24px;background:var(--green-bg);border-color:var(--green);box-shadow:7px 7px 0 var(--green-border);">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">${lucide(P.trophy, 30, "#16713F")}<span style="font-weight:800;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;color:#16713F;">Tu liga · grupo del Mundial</span></div>
    <div style="display:flex;flex-direction:column;gap:12px;">${body}</div>
  </div>`;
}

// ─── PACK 1 · EMPEZÁ ACÁ (azul) ───
function empeza(): Array<{ html: string; foot: Foot }> {
  const f: Foot = { url: URL_MAIN, tag: "Cómo jugar" };
  return [
    // 1 · portada
    { foot: f, html: `
      ${eyebrow(ic(P.play, "#1B4FD8", 30), "¿Nunca jugaste?", "#1B4FD8")}
      <div class="title" style="font-size:150px;margin-top:16px;">EMPEZÁ<br><span class="b">ACÁ</span>.</div>
      <p class="body" style="font-size:34px;line-height:1.36;margin-top:28px;">Sos el <b>DT</b>. Armás tu equipo del <b>Mundial 2026</b> con cracks reales y competís con todo el país, fecha a fecha.</p>` },
    // 2 · LA CANCHA con figuritas reales (lo entretenido, base que-es_03)
    { foot: f, html: `
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;">
        <div>${eyebrow(ic(P.users, "#1B4FD8", 30), "Armá tu plantel", "#1B4FD8")}
        <div class="title" style="font-size:70px;margin-top:8px;">${SQUAD.TOTAL} FIGURAS<br>+ <span class="b">1 DT</span>.</div></div>
        <div style="flex:0 0 auto;background:var(--dark);border:2px solid var(--gold);border-radius:12px;padding:12px 24px;text-align:center;box-shadow:4px 4px 0 rgba(17,24,39,.55);">
          <div class="eyebrow" style="font-size:16px;color:var(--gold);">Presupuesto</div>
          <div class="num" style="font-size:58px;color:#fff;margin-top:2px;">${BUDGET}<span style="font-size:30px;color:var(--gold);">M</span></div>
        </div>
      </div>
      <p class="body" style="font-size:26px;line-height:1.3;margin-top:14px;">11 titulares en la cancha, <b>4 suplentes y un DT</b> en el banco. Armá el <b>mejor 11</b> sin pasarte.</p>
      <div style="margin-top:18px;">${pitch(700, 1.28)}</div>
      <div style="display:flex;gap:22px;justify-content:center;margin-top:16px;">${posLegend()}</div>
      ${benchStrip()}` },
    // 3 · cómo se juega (3 pasos)
    { foot: f, html: `
      ${eyebrow(ic(P.list, "#1B4FD8", 30), "En 3 pasos", "#1B4FD8")}
      <div class="title" style="font-size:92px;margin-top:16px;">ASÍ SE <span class="b">JUEGA</span></div>
      <div style="display:flex;flex-direction:column;gap:22px;margin-top:40px;">
        ${stepCard(1, ic(P.gamepad, "#1B4FD8"), "Armá tu 11", "11 titulares + 4 suplentes + DT. Elegí tu capitán.", "var(--blue)", "var(--blue-light)", "var(--blue-border)")}
        ${stepCard(2, ic(P.flag, "#1B4FD8"), "Seguí el Mundial", "Cada fecha tus jugadores suman por su rendimiento real.", "var(--blue)", "var(--blue-light)", "var(--blue-border)")}
        ${stepCard(3, ic(P.trendingUp, "#1B4FD8"), "Subí en el ranking", "Global y en ligas privadas con tus amigos.", "var(--blue)", "var(--blue-light)", "var(--blue-border)")}
      </div>
      <div class="card" style="margin-top:30px;padding:26px 30px;background:var(--blue-light);border-color:var(--blue);box-shadow:7px 7px 0 var(--blue-border);">
        <div class="title" style="font-size:38px;color:var(--blue);line-height:1.05;text-align:center;">NO ES ADIVINAR RESULTADOS.<br>ES SABER DE FÚTBOL.</div>
      </div>` },
    // 4 · CTA
    { foot: f, html: `
      ${eyebrow(ic(P.gamepad, "#1B4FD8", 30), "Es gratis", "#1B4FD8")}
      <div class="title" style="font-size:104px;margin-top:16px;">ARMÁ TU<br>EQUIPO <span class="b">GRATIS</span></div>
      <div style="margin-top:46px;background:var(--dark);border:2px solid var(--blue);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:50px 44px;text-align:center;">
        <div style="color:#9AA6BF;font-weight:700;font-size:24px;text-transform:uppercase;letter-spacing:0.1em;">Entrá y jugá en</div>
        <div class="num" style="color:#fff;font-size:62px;margin-top:14px;">LOS11DESAMPA.COM</div>
      </div>
      <p class="body" style="font-size:30px;line-height:1.34;margin-top:34px;text-align:center;">Tocá el <b>link</b> de acá arriba 👆 y armá tu 11 en 5 minutos.</p>` },
  ];
}

// ─── PACK 2 · PUNTAJE (azul/dorado) ───
// columna de gol por puesto (una sola sección prolija)
function golCol(p: PosF, val: number): string {
  return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;background:${POSF[p].bg};border:2px solid ${POSF[p].c};border-radius:14px;padding:22px 0;">
    <span class="num" style="font-size:64px;color:${POSF[p].c};">+${val}</span>
    <span style="font-weight:800;font-size:24px;letter-spacing:0.06em;color:${POSF[p].c};">${p}</span></div>`;
}
function arrow(label: string, c = "#7A5C10"): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:0 0 auto;"><svg width="92" height="46" viewBox="0 0 74 40" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20h50M46 8l16 12-16 12"/></svg><span class="num" style="font-size:32px;color:${c};">${label}</span></div>`;
}
// fila del DT (técnico) con fondo oscuro, misma en suma (+2) y resta (−2)
function dtRow(label: string, value: string, valueColor: string): string {
  return `<div style="display:flex;align-items:center;gap:18px;background:var(--dark);border:2px solid var(--ink);border-radius:12px;padding:20px 26px;margin-top:22px;box-shadow:4px 4px 0 rgba(17,24,39,.7);">
    <span style="flex:1;font-weight:800;font-size:28px;color:#fff;">${label}</span>
    <span class="num" style="font-size:34px;color:${valueColor};">${value}</span></div>`;
}
function puntaje(): Array<{ html: string; foot: Foot }> {
  const f: Foot = { url: URL_MAIN, tag: "El puntaje" };
  const g = SCORING.goalByPosition;
  const cs = SCORING.cleanSheet;
  const sgn = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  // escala 1-10 de la calificación base
  const scale = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const col = n <= 3 ? "#D02B2B" : n <= 6 ? "#E0A53B" : "#16713F";
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:100%;height:26px;border-radius:5px;background:${col};opacity:${0.35 + n * 0.065};"></div><span class="num" style="font-size:26px;color:var(--ink);">${n}</span></div>`;
  }).join("");
  return [
    // 1 · portada
    { foot: f, html: `
      ${eyebrow(ic(P.calculator, "#1B4FD8", 30), "El puntaje", "#1B4FD8")}
      <div class="title" style="font-size:88px;margin-top:16px;">¿CÓMO SE<br><span class="b">SUMAN</span> LOS<br>PUNTOS?</div>
      <p class="body" style="font-size:34px;line-height:1.36;margin-top:30px;">Cada jugador arranca con una <b>nota del partido</b>. Sobre esa base, suma o resta según lo que hace en la cancha.</p>` },
    // 2 · LA BASE = nota 1 a 10
    { foot: f, html: `
      ${eyebrow(ic(P.star, "#1B4FD8", 30), "La base", "#1B4FD8")}
      <div class="title" style="font-size:80px;margin-top:14px;">LA NOTA DEL <span class="b">1 AL 10</span></div>
      <p class="body" style="font-size:30px;line-height:1.34;margin-top:22px;">Es la <b>calificación de cómo jugó</b>: 1 = un desastre, 10 = un partidazo. Esa nota son sus puntos base.</p>
      <div class="card" style="margin-top:30px;padding:30px 30px 26px;">
        <div style="display:flex;align-items:flex-end;gap:8px;">${scale}</div>
        <div style="display:flex;justify-content:space-between;margin-top:14px;"><span style="font-weight:800;font-size:22px;color:#D02B2B;">JUGÓ MAL</span><span style="font-weight:800;font-size:22px;color:#16713F;">PARTIDAZO</span></div>
      </div>
      <div class="card" style="margin-top:24px;padding:26px 30px;background:var(--blue-light);border-color:var(--blue);box-shadow:7px 7px 0 var(--blue-border);">
        <p class="body" style="font-size:28px;line-height:1.32;"><b>Y arriba de esa nota:</b> sumás <b style="color:var(--green);">bonificaciones</b> (goles, asistencias…) y restás <b style="color:var(--danger);">descuentos</b> (tarjetas, autogoles…).</p>
      </div>` },
    // 3 · LO QUE SUMA (goles en una sola sección)
    { foot: f, html: `
      ${eyebrow(ic(P.plus, "#16713F", 30), "Bonificaciones", "#16713F")}
      <div class="title" style="font-size:96px;margin-top:14px;">LO QUE <span class="gr">SUMA</span></div>
      <div class="card" style="margin-top:30px;padding:24px 26px;">
        <p style="font-weight:800;font-size:26px;color:var(--ink);margin-bottom:16px;">Por cada <b style="color:var(--blue);">GOL</b>, <span style="color:var(--ink3);font-weight:600;">según el puesto:</span></p>
        <div style="display:flex;gap:12px;">${golCol("POR", g.GK)}${golCol("DEF", g.DEF)}${golCol("MED", g.MID)}${golCol("DEL", g.FWD)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:18px;">
        ${scoreRow("Asistencia", sgn(SCORING.assist), true)}
        ${scoreRow("Valla invicta — POR / DEF", `+${cs.GK} / +${cs.DEF}`, true)}
        ${scoreRow("Figura del partido ★", sgn(SCORING.motm), true)}
        ${scoreRow("Penal atajado (POR)", sgn(SCORING.penaltySaved), true)}
      </div>
      ${dtRow("El DT, si su selección gana", sgn(SCORING.coachWin), "#7CE0A3")}` },
    // 4 · LO QUE RESTA (GK -1 por gol recibido, claro)
    { foot: f, html: `
      ${eyebrow(ic(P.minus, "#D02B2B", 30), "Descuentos", "#D02B2B")}
      <div class="title" style="font-size:96px;margin-top:14px;">LO QUE <span class="r">RESTA</span></div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:32px;">
        ${scoreRow("Tarjeta amarilla", sgn(SCORING.yellow), false)}
        ${scoreRow("Tarjeta roja", sgn(SCORING.red), false)}
        ${scoreRow("Gol en contra", sgn(SCORING.ownGoal), false)}
        ${scoreRow("Penal errado", sgn(SCORING.penaltyMissed), false)}
        ${scoreRow("POR: por cada gol que le hacen", `${SCORING.goalConcededGK} c/u`, false)}
      </div>
      ${dtRow("El DT, si su selección pierde", sgn(SCORING.coachLoss), "#FF8A8A")}` },
    // 5 · EL CAPITÁN (después de bonus/descuentos)
    { foot: f, html: `
      ${eyebrow(ic(P.award, "#7A5C10", 30), "La jugada clave", "#7A5C10")}
      <div class="title" style="font-size:80px;margin-top:14px;">EL <span class="g">CAPITÁN</span> ×2</div>
      <p class="body" style="font-size:30px;line-height:1.34;margin-top:22px;">Elegís un capitán y <b>duplica su nota base</b>. Ponele la cinta al que pinta para un partidazo.</p>
      <div class="card" style="margin-top:48px;padding:56px 40px;border-color:var(--gold);box-shadow:9px 9px 0 var(--gold-border);">
        <div style="display:flex;align-items:center;justify-content:center;gap:36px;">
          <div style="background:#2A744A;border-radius:16px;padding:26px 20px 22px;">${figure(XI.DEL[0]!, 1.45)}</div>
          <div style="text-align:center;"><div class="num" style="font-size:74px;color:var(--ink);">8</div><div style="font-weight:700;font-size:26px;color:var(--ink3);">nota</div></div>
          ${arrow("×2")}
          <div style="text-align:center;"><div class="num" style="font-size:104px;color:var(--gold-ink);">16</div><div style="font-weight:700;font-size:26px;color:var(--gold-ink);">puntos</div></div>
        </div>
      </div>` },
    // 6 · CTA
    { foot: f, html: `
      ${eyebrow(ic(P.gamepad, "#1B4FD8", 30), "Ahora te toca", "#1B4FD8")}
      <div class="title" style="font-size:104px;margin-top:16px;">ARMÁ TU 11<br>Y <span class="b">SUMÁ</span></div>
      <div style="margin-top:46px;background:var(--dark);border:2px solid var(--blue);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:50px 44px;text-align:center;">
        <div style="color:#9AA6BF;font-weight:700;font-size:24px;text-transform:uppercase;letter-spacing:0.1em;">Elegí a los que más rinden en</div>
        <div class="num" style="color:#fff;font-size:62px;margin-top:14px;">LOS11DESAMPA.COM</div>
      </div>` },
  ];
}

// ─── PACK 3 · LIGA PREMIUM (dorado, dark) ───
// Distribución EXACTA del premio (de generate-copa-3.ts / MONETIZACION.md). pct = ancho de barra.
const PRIZES = [
  { r: 1, amt: "$120.000", pct: 100 },
  { r: 2, amt: "$72.000", pct: 60 },
  { r: 3, amt: "$48.000", pct: 40 },
  { r: 4, amt: "$36.000", pct: 30 },
  { r: 5, amt: "$28.000", pct: 23.3 },
  { r: 6, amt: "$24.000", pct: 20 },
  { r: 7, amt: "$21.000", pct: 17.5 },
  { r: 8, amt: "$19.000", pct: 15.8 },
  { r: 9, amt: "$17.000", pct: 14.2 },
  { r: 10, amt: "$15.000", pct: 12.5 },
];
function prizeRow(rank: number, amt: string, pct: number): string {
  const top3 = rank <= 3;
  const fill = top3 ? "linear-gradient(90deg,#DDBB60,#C8A24B)" : "var(--blue)";
  return `<div style="display:flex;align-items:center;gap:14px;">
    <span class="num" style="flex:0 0 auto;width:42px;height:42px;border-radius:50%;background:${top3 ? "var(--gold)" : "#fff"};border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;font-size:23px;color:${top3 ? "var(--gold-ink)" : "var(--ink)"};box-shadow:2px 2px 0 rgba(17,24,39,.5);">${rank}</span>
    <div style="flex:1;height:38px;background:#E6EAEE;border:2px solid var(--ink);border-radius:8px;overflow:hidden;box-shadow:2px 2px 0 rgba(17,24,39,.45);"><div style="height:100%;width:${pct}%;background:${fill};"></div></div>
    <span class="num" style="flex:0 0 156px;text-align:right;font-size:30px;color:var(--ink);">${amt}</span>
  </div>`;
}
function copa(): Array<{ html: string; foot: Foot }> {
  const fCopa: Foot = { url: URL_COPA, tag: "Liga Premium" };
  const cupoBlock = SHOW_CUPO
    ? `<div style="width:1px;background:rgba(255,255,255,.12);"></div>${heroStat(`${LEFT} de ${CAPACITY}`, "lugares libres")}`
    : "";
  return [
    // 1 · portada de IMPACTO: el premio es el protagonista
    { foot: fCopa, html: `
      ${eyebrow(ic(P.trophy, "#7A5C10", 30), "Liga Premium", "#7A5C10")}
      <div class="title" style="font-size:56px;margin-top:14px;color:var(--ink2);">JUGÁ TU MUNDIAL POR</div>
      <div class="num" style="font-size:188px;color:var(--gold-ink);margin-top:6px;letter-spacing:-0.03em;">$400.000</div>
      <div class="title" style="font-size:64px;margin-top:6px;">EN <span class="g">PLATA</span> REAL.</div>
      <div style="margin-top:40px;background:var(--dark);border:2px solid var(--gold);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:40px 42px;">
        <p style="color:#fff;font-weight:700;font-size:32px;line-height:1.35;">El mismo juego que ya conocés, pero con un <b style="color:var(--gold);">premio en plata</b> al top 10. Armás tu 11 y competís en serio.</p>
      </div>` },
    // 2 · QUÉ ES (explicación)
    { foot: fCopa, html: `
      ${eyebrow(ic(P.ticket, "#7A5C10", 30), "¿Qué es?", "#7A5C10")}
      <div class="title" style="font-size:84px;margin-top:14px;">LA LIGA CON<br><span class="g">PREMIO</span>.</div>
      <p class="body" style="font-size:30px;line-height:1.34;margin-top:22px;">Una liga aparte, para los que se la juegan. Pagás una entrada única y entrás a competir por la bolsa de premios.</p>
      <div style="display:flex;flex-direction:column;gap:18px;margin-top:30px;">
        ${iconCard(ic(P.trophy, "#7A5C10"), "$400.000 al top 10", "Cuanto más arriba terminás, más te llevás.", "var(--gold-bg)", "var(--gold-border)")}
        ${iconCard(ic(P.shieldCheck, "#7A5C10"), "Garantizado", "El premio se reparte sí o sí. No depende de cuántos entren.", "var(--gold-bg)", "var(--gold-border)")}
        ${iconCard(ic(P.gamepad, "#7A5C10"), "Mismo juego", "Tu 11, tu capitán, tu DT. Solo que ahora hay plata en juego.", "var(--gold-bg)", "var(--gold-border)")}
      </div>` },
    // 3 · EL REPARTO al top 10
    { foot: fCopa, html: `
      ${eyebrow(ic(P.award, "#7A5C10", 30), "El reparto · top 10", "#7A5C10")}
      <div class="title" style="font-size:62px;margin-top:12px;">ASÍ SE REPARTEN<br>LOS <span class="g">$400.000</span></div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:30px;">
        ${PRIZES.map((x) => prizeRow(x.r, x.amt, x.pct)).join("")}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--dark);border:2px solid var(--gold);border-radius:14px;padding:22px 28px;margin-top:22px;box-shadow:6px 6px 0 rgba(17,24,39,.5);">
        <span style="font-weight:800;font-size:24px;letter-spacing:0.06em;text-transform:uppercase;color:#fff;">Total · top 10</span>
        <span class="num" style="font-size:36px;color:var(--gold);">$400.000 <span style="font-size:22px;color:#9AA6BF;">· 100%</span></span>
      </div>` },
    // 4 · CÓMO ENTRAR
    { foot: fCopa, html: `
      ${eyebrow(ic(P.list, "#7A5C10", 30), "Cómo entrar", "#7A5C10")}
      <div class="title" style="font-size:92px;margin-top:14px;">EN 3 <span class="g">PASOS</span></div>
      <div style="display:flex;flex-direction:column;gap:22px;margin-top:40px;">
        ${stepCard(1, ic(P.gamepad, "#7A5C10"), "Armá tu equipo", "Gratis, como siempre. 15 figuras + DT.", "var(--gold)", "var(--gold-bg)", "var(--gold-border)")}
        ${stepCard(2, ic(P.ticket, "#7A5C10"), "Pagá la entrada", "$5.000 una sola vez y quedás adentro.", "var(--gold)", "var(--gold-bg)", "var(--gold-border)")}
        ${stepCard(3, ic(P.trophy, "#7A5C10"), "Competí por la plata", "Rankeás desde los 16vos hasta la final.", "var(--gold)", "var(--gold-bg)", "var(--gold-border)")}
      </div>` },
    // 5 · CTA (con strip de premio / entrada / cupo)
    { foot: fCopa, html: `
      ${eyebrow(ic(P.trophy, "#7A5C10", 30), "Te esperamos", "#7A5C10")}
      <div class="title" style="font-size:96px;margin-top:16px;">ENTRÁ A LA<br><span class="g">LIGA PREMIUM</span></div>
      <div style="margin-top:42px;background:var(--dark);border:2px solid var(--gold);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:40px 40px;">
        <div style="display:flex;gap:10px;">
          ${heroStat("$400.000", "en premios")}
          <div style="width:1px;background:rgba(255,255,255,.12);"></div>
          ${heroStat("$5.000", "entrada única")}
          ${cupoBlock}
        </div>
        <div style="text-align:center;border-top:1px solid rgba(255,255,255,.12);margin-top:32px;padding-top:28px;">
          <div style="color:#9AA6BF;font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.1em;">Asegurá tu lugar en</div>
          <div class="num" style="color:var(--gold);font-size:50px;margin-top:12px;">LOS11DESAMPA.COM/COPA</div>
        </div>
      </div>
      <p class="body" style="font-size:28px;line-height:1.32;margin-top:28px;text-align:center;">Tocá el <b>link</b> de acá arriba 👆 y jugá por la bolsa.</p>` },
  ];
}

// ─── PACK 4 · GRATIS / CON AMIGOS (verde, ángulo anti-prode) ───
function gratis(): Array<{ html: string; foot: Foot }> {
  const f: Foot = { url: URL_MAIN, tag: "Gratis" };
  return [
    // 1 · portada anti-prode
    { foot: f, html: `
      ${eyebrow(ic(P.gamepad, "#16713F", 30), "No pegaste un resultado...", "#16713F")}
      <div class="title" style="font-size:96px;margin-top:16px;">¿CANSADO DEL <span class="gr">PRODE</span>?</div>
      <p class="body" style="font-size:34px;line-height:1.36;margin-top:28px;">Marcar una crucecita y esperar aburre. Acá <b>armás y dirigís tu equipo</b> todo el Mundial. No es suerte: es saber de fútbol. Y es <b>gratis</b>.</p>` },
    // 2 · y es gratis (lo que incluye)
    { foot: f, html: `
      ${eyebrow(ic(P.gift, "#16713F", 30), "Y todo esto, sin pagar", "#16713F")}
      <div class="title" style="font-size:120px;margin-top:14px;"><span class="gr">GRATIS</span>.</div>
      <div style="display:flex;flex-direction:column;gap:18px;margin-top:34px;">
        ${iconCard(ic(P.users, "#16713F"), "Armá tu 11", "15 figuras + DT con presupuesto. Sin pagar nada.", "var(--green-bg)", "var(--green-border)")}
        ${iconCard(ic(P.list, "#16713F"), "Ranking global", "Competís con todo el país desde la fecha que entres.", "var(--green-bg)", "var(--green-border)")}
        ${iconCard(ic(P.flag, "#16713F"), "Las 8 fechas", "Jugás de la fase de grupos hasta la final.", "var(--green-bg)", "var(--green-border)")}
      </div>` },
    // 3 · con amigos (con tabla de ranking esquemática)
    { foot: f, html: `
      ${eyebrow(ic(P.users, "#16713F", 30), "Lo mejor: con amigos", "#16713F")}
      <div class="title" style="font-size:84px;margin-top:14px;">JUGÁ CON <span class="gr">AMIGOS</span></div>
      <p class="body" style="font-size:28px;line-height:1.3;margin-top:18px;">Creá una <b>liga privada</b>, pasá el código a tu grupo y compiten entre ustedes en su propia tabla, fecha a fecha.</p>
      <div style="margin-top:28px;">${leagueTable()}</div>
      <div style="display:flex;gap:14px;margin-top:22px;">
        <div class="card" style="flex:1;display:flex;align-items:center;gap:14px;padding:20px 22px;background:var(--green-bg);border-color:var(--green);box-shadow:5px 5px 0 var(--green-border);">${ic(P.userPlus, "#16713F", 34)}<span style="font-weight:800;font-size:24px;color:var(--ink);line-height:1.1;">Creás la liga</span></div>
        <div class="card" style="flex:1;display:flex;align-items:center;gap:14px;padding:20px 22px;background:var(--green-bg);border-color:var(--green);box-shadow:5px 5px 0 var(--green-border);">${ic(P.key, "#16713F", 34)}<span style="font-weight:800;font-size:24px;color:var(--ink);line-height:1.1;">Pasás el código</span></div>
      </div>` },
    // 4 · pines + CTA
    { foot: f, html: `
      ${eyebrow(ic(P.coins, "#16713F", 30), "¿Y los pines?", "#16713F")}
      <div class="title" style="font-size:84px;margin-top:16px;">LOS <span class="gr">PINES</span></div>
      <div style="display:flex;flex-direction:column;gap:18px;margin-top:32px;">
        ${iconCard(ic(P.gift, "#16713F"), `${FREE_CHANGES_PER_ROUND} cambio gratis por fecha`, "Cada fecha podés cambiar un jugador sin gastar nada.", "var(--green-bg)", "var(--green-border)")}
        ${iconCard(ic(P.coins, "#16713F"), "Cambios extra = pines", "Si querés mover más fichas, usás pines. Son opcionales.", "var(--green-bg)", "var(--green-border)")}
      </div>
      <div style="margin-top:34px;background:var(--dark);border:2px solid var(--green);border-radius:18px;box-shadow:9px 9px 0 rgba(17,24,39,.55);padding:42px 40px;text-align:center;">
        <div style="color:#9AA6BF;font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.1em;">Dejá el prode, jugá gratis en</div>
        <div class="num" style="color:#7FE0A6;font-size:54px;margin-top:12px;">LOS11DESAMPA.COM</div>
      </div>` },
  ];
}

// ─── COVERS (tapas circulares 1080×1080) ───
type Cover = { key: string; icon: string; label: string; accent: string };
function coverDoc(titleFontCss: string, c: Cover): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&display=swap" rel="stylesheet">
  <style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  .num{font-family:'TitleHeavy',sans-serif;}
  .wrap{position:relative;width:1080px;height:1080px;background:#101726;overflow:hidden;display:flex;align-items:center;justify-content:center;}
  .texture{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");}
  /* contenido GRANDE: llena el círculo con el que IG recorta la tapa anclada */
  .core{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:44px;width:960px;}
  .ring{width:500px;height:500px;border-radius:50%;background:rgba(255,255,255,0.04);border:10px solid ${c.accent};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 18px rgba(255,255,255,0.03);}
  .label{font-family:'TitleHeavy',sans-serif;color:#fff;font-size:108px;text-transform:uppercase;letter-spacing:0.02em;text-align:center;line-height:0.9;}
  ${titleFontCss}
  </style></head><body><div class="wrap"><div class="texture"></div>
    <div class="core"><div class="ring">${lucide(c.icon, 260, c.accent, 1.8)}</div><div class="label">${c.label}</div></div>
  </div></body></html>`;
}

const COVERS: Cover[] = [
  { key: "empeza", icon: P.play, label: "EMPEZÁ<br>ACÁ", accent: "#5B86FF" },
  { key: "puntaje", icon: P.star, label: "PUNTAJES", accent: "#C8A24B" },
  { key: "copa", icon: P.trophy, label: "LIGA<br>PREMIUM", accent: "#C8A24B" },
  { key: "gratis", icon: P.users, label: "JUGÁ CON<br>AMIGOS", accent: "#3FCB7B" },
];

// ─── COVERS de RESULTADOS por ronda (las destacadas F1/F2/... que ya existían) ───
// Token grande dentro del aro + nombre de la ronda debajo. Grupos en azul, mata-mata
// en dorado escalando hacia la final. Nombres tomados de ROUNDS (config) → no se
// desincronizan con el juego.
type RoundCover = { key: string; token: string; sub: string; accent: string };
function roundCovers(): RoundCover[] {
  // tokens cortos legibles en el círculo; el sub aclara la instancia completa
  const KO: Record<number, string> = { 4: "16VOS", 5: "8VOS", 6: "4TOS", 7: "SEMIS", 8: "FINAL" };
  return ROUNDS.map((r) => {
    const isGroup = r.type === "group";
    const accent = isGroup ? "#5B86FF" : r.order >= 7 ? "#E0B95B" : "#C8A24B";
    return {
      key: isGroup ? `fecha-${r.order}` : `ko-${r.order}`,
      token: isGroup ? `F${r.order}` : KO[r.order] ?? `R${r.order}`,
      sub: isGroup ? `FECHA ${r.order}` : (KO[r.order] === "FINAL" ? "LA FINAL" : `${KO[r.order]} DE FINAL`),
      accent,
    };
  });
}

function roundCoverDoc(titleFontCss: string, c: RoundCover): string {
  const tokSize = c.token.length <= 2 ? 240 : c.token.length <= 4 ? 168 : 132;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&display=swap" rel="stylesheet">
  <style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  .num{font-family:'TitleHeavy',sans-serif;}
  .wrap{position:relative;width:1080px;height:1080px;background:#101726;overflow:hidden;display:flex;align-items:center;justify-content:center;}
  .texture{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");}
  .core{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:40px;width:960px;}
  .ring{width:500px;height:500px;border-radius:50%;background:rgba(255,255,255,0.04);border:10px solid ${c.accent};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 18px rgba(255,255,255,0.03);}
  .tok{font-family:'TitleHeavy',sans-serif;color:#fff;font-size:${tokSize}px;line-height:0.9;letter-spacing:0.01em;}
  .sub{display:flex;flex-direction:column;align-items:center;gap:10px;}
  .sub .eb{font-weight:800;font-size:38px;letter-spacing:0.22em;text-transform:uppercase;color:${c.accent};}
  .sub .nm{font-family:'TitleHeavy',sans-serif;color:#fff;font-size:84px;text-transform:uppercase;letter-spacing:0.02em;text-align:center;line-height:0.95;}
  ${titleFontCss}
  </style></head><body><div class="wrap"><div class="texture"></div>
    <div class="core"><div class="ring"><span class="tok">${c.token}</span></div>
      <div class="sub"><div class="eb">Resultados</div><div class="nm">${c.sub}</div></div>
    </div>
  </div></body></html>`;
}

// ─── main ───
const PACKS: Record<string, () => Array<{ html: string; foot: Foot }>> = {
  empeza,
  puntaje,
  copa,
  gratis,
};

async function loadAssets() {
  const [logoBuf, titleFont, flagsRaw] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf8"),
  ]);
  FLAGS = JSON.parse(flagsRaw) as Record<string, Flag>;
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;
  return { logoB64, titleFontCss };
}

async function renderPack(key: string, logoB64: string, titleFontCss: string) {
  const slides = PACKS[key]!();
  const outDir = path.join(ROOT, arg("out") ?? `out/highlights/${key}`);
  await mkdir(outDir, { recursive: true });
  for (let i = 0; i < slides.length; i++) {
    const { html, foot } = slides[i]!;
    const buf = await renderPng(doc(logoB64, titleFontCss, html, foot), SIZE);
    const file = path.join(outDir, `${key}_${String(i + 1).padStart(2, "0")}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
}

async function renderCovers(_logoB64: string, titleFontCss: string) {
  const outDir = path.join(ROOT, "out/highlights/covers");
  await mkdir(outDir, { recursive: true });
  for (const c of COVERS) {
    const buf = await renderPng(coverDoc(titleFontCss, c), SIZE_COVER);
    const file = path.join(outDir, `cover-${c.key}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
}

async function renderRoundCovers(_logoB64: string, titleFontCss: string) {
  const outDir = path.join(ROOT, "out/highlights/round-covers");
  await mkdir(outDir, { recursive: true });
  for (const c of roundCovers()) {
    const buf = await renderPng(roundCoverDoc(titleFontCss, c), SIZE_COVER);
    const file = path.join(outDir, `cover-${c.key}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
}

async function main() {
  const { logoB64, titleFontCss } = await loadAssets();
  const pack = arg("pack");
  // flags de solo-covers (no se generan packs)
  const wantCovers = has("covers");
  const wantRoundCovers = has("round-covers");
  const onlyCoversMode = (wantCovers || wantRoundCovers) && !has("all") && !pack;

  if (pack && !PACKS[pack]) {
    console.error(`Pack desconocido: "${pack}". Opciones: ${Object.keys(PACKS).join(", ")}.`);
    process.exit(1);
  }
  if (pack === "copa" && !SHOW_CUPO) {
    console.warn("ⓘ Copa sin --enrolled: la story NO muestra cupo (evergreen). Para mostrar 'quedan X' pasá --enrolled <N> (de getCopasStatus).");
  }

  if (onlyCoversMode) {
    if (wantCovers) await renderCovers(logoB64, titleFontCss);
    if (wantRoundCovers) await renderRoundCovers(logoB64, titleFontCss);
  } else if (pack) {
    await renderPack(pack, logoB64, titleFontCss);
    if (wantCovers) await renderCovers(logoB64, titleFontCss);
    if (wantRoundCovers) await renderRoundCovers(logoB64, titleFontCss);
  } else if (has("all")) {
    if (!SHOW_CUPO) console.warn("ⓘ --all sin --enrolled: la Copa va sin cupo (evergreen).");
    for (const k of Object.keys(PACKS)) await renderPack(k, logoB64, titleFontCss);
    await renderCovers(logoB64, titleFontCss);
    await renderRoundCovers(logoB64, titleFontCss);
  } else {
    console.error("Usá: --all | --pack <empeza|puntaje|copa|gratis> [--enrolled N] | --covers | --round-covers");
    process.exit(1);
  }
  console.log("\nListo → out/highlights/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
