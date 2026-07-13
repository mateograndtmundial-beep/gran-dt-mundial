import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { rounds, entries, entryRounds, playerRoundPoints, players, countries } from "../lib/db/schema";
import { renderPng } from "../lib/stories/render";

/*
 * Carrusel 3 slides 1080×1350 — "YA ESTÁN LOS PUNTOS · FECHA 3"
 *   Slide 1: anuncio portada
 *   Slide 2: Top 3 de la Fecha + Top 3 Global
 *   Slide 3: Mejor XI de la Fecha (4-2-4)
 *
 * Correr DESPUÉS de publishRound(fecha3).
 *   npx tsx scripts/generate-puntos-fecha3.ts   → out/puntos-fecha3/
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 3;

// ─── Lucide paths (oficiales del paquete) ─────────────────────────────────────
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const IC = {
  trophy: (s = 40, c = "#7A5C10") =>
    lucide(
      '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
      s, c,
    ),
  trendingUp: (s = 40, c = "#1B4FD8") =>
    lucide(
      '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
      s, c,
    ),
  users: (s = 40, c = "#1B4FD8") =>
    lucide(
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
      s, c,
    ),
  zap: (s = 40, c = "#1B4FD8") =>
    lucide(
      '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
      s, c,
    ),
};

// ─── Assets ──────────────────────────────────────────────────────────────────
async function loadAssets() {
  const [logoBuf, titleFont, flagsJson] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
    readFile(path.join(ROOT, "assets/stories/flags.json"), "utf-8"),
  ]);
  return {
    logoB64: logoBuf.toString("base64"),
    titleFontCss: `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`,
    flags: JSON.parse(flagsJson) as Record<string, { name: string; group: string; b64: string }>,
  };
}

// ─── DB ──────────────────────────────────────────────────────────────────────
async function getData() {
  const fecha3 = (await db.select().from(rounds).where(eq(rounds.order, 3)).limit(1))[0];
  if (!fecha3) throw new Error("Fecha 3 no encontrada");

  const topFecha = await db
    .select({
      entryName: entries.name,
      username: sql<string>`(SELECT username FROM users WHERE id = ${entries}.user_id)`,
      pts: entryRounds.points,
    })
    .from(entryRounds)
    .innerJoin(entries, eq(entries.id, entryRounds.entryId))
    .where(eq(entryRounds.roundId, fecha3.id))
    .orderBy(desc(entryRounds.points))
    .limit(3);

  const topGlobal = await db
    .select({
      entryName: entries.name,
      username: sql<string>`(SELECT username FROM users WHERE id = ${entries}.user_id)`,
      pts: entries.totalPoints,
    })
    .from(entries)
    .orderBy(desc(entries.totalPoints))
    .limit(3);

  const mejorXI = await db
    .select({
      name: players.name,
      position: players.position,
      pts: playerRoundPoints.points,
      countryCode: countries.code,
      // rating máximo del jugador en sus partidos de esta fecha (para el bonus de capitán)
      rating: sql<number>`MAX(pms.rating)`,
    })
    .from(playerRoundPoints)
    .innerJoin(players, eq(players.id, playerRoundPoints.playerId))
    .innerJoin(countries, eq(countries.id, players.countryId))
    .innerJoin(
      sql`player_match_stats pms`,
      sql`pms.player_id = ${players.id} AND pms.match_id IN (SELECT id FROM matches WHERE round_id = ${fecha3.id})`,
    )
    .where(eq(playerRoundPoints.roundId, fecha3.id))
    .groupBy(players.name, players.position, playerRoundPoints.points, countries.code)
    .orderBy(desc(playerRoundPoints.points));

  // Formación 4-2-4: 1 ARQ, 4 DEF, 2 MID, 4 FWD
  const byPos: Record<string, typeof mejorXI> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of mejorXI) byPos[p.position]?.push(p);
  const xi = [
    ...byPos.GK.slice(0, 1),
    ...byPos.DEF.slice(0, 4),
    ...byPos.MID.slice(0, 2),
    ...byPos.FWD.slice(0, 4),
  ];

  // Capitán = el de mayor rating en el XI; sus puntos incluyen el bonus (+ Math.round(rating))
  let captainIdx = 0;
  let maxRating = -1;
  xi.forEach((p, i) => {
    const r = Number(p.rating ?? 0);
    if (r > maxRating) { maxRating = r; captainIdx = i; }
  });
  const xiWithCap = xi.map((p, i) => ({
    ...p,
    isCaptain: i === captainIdx,
    displayPts: i === captainIdx
      ? Number(p.pts) + Math.round(Number(p.rating ?? 0))
      : Number(p.pts),
  }));
  const countQ = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(entryRounds)
    .where(and(eq(entryRounds.roundId, fecha3.id), sql`${entryRounds.points} > 0`));
  const equipos = Number(countQ[0].c);

  const xiTotal = xiWithCap.reduce((s, p) => s + p.displayPts, 0);

  return { topFecha, topGlobal, xi: xiWithCap, xiTotal, equipos };
}

// ─── Chrome común ─────────────────────────────────────────────────────────────
function doc(logoB64: string, titleFontCss: string, slide: number, body: string, tag: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--dark:#101726;--green:#16713F;}
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
  .title,.title *,.num,.num *{font-family:'TitleHeavy',sans-serif !important;}
  .wrap{position:relative;width:1080px;height:1350px;background:var(--bg);overflow:hidden;padding:0 60px;}
  .texture{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");}
  .ghost{position:absolute;right:30px;bottom:50px;font-family:'TitleHeavy',sans-serif;font-size:340px;color:#111827;opacity:0.04;letter-spacing:-0.06em;line-height:1;pointer-events:none;}
  .hd{display:flex;align-items:center;gap:14px;padding-top:50px;position:relative;z-index:3;}
  .hd .lg{width:62px;height:62px;border-radius:50%;border:3px solid var(--blue);overflow:hidden;background:#fff;box-shadow:3px 3px 0 rgba(17,24,39,0.18);flex:0 0 62px;}
  .hd .lg img{width:100%;height:100%;display:block;}
  .hd .wm{font-weight:800;font-size:26px;text-transform:uppercase;letter-spacing:0.01em;}
  .hd .wm span{color:var(--blue);}
  .page{position:absolute;right:60px;top:54px;font-weight:800;font-size:15px;letter-spacing:0.1em;color:#9CA3AF;background:#fff;border:2px solid var(--ink);border-radius:6px;padding:7px 14px;box-shadow:3px 3px 0 rgba(17,24,39,0.2);z-index:3;}
  .page b{color:var(--ink);}
  .eyebrow{font-weight:800;font-size:21px;letter-spacing:0.18em;text-transform:uppercase;color:#9CA3AF;}
  .title{line-height:0.93;letter-spacing:0.005em;color:var(--ink);text-transform:uppercase;}
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);}
  .body{font-weight:500;color:var(--ink2);} .body b{font-weight:800;color:var(--ink);}
  .card{background:var(--surf);border:2px solid var(--ink);border-radius:14px;box-shadow:7px 7px 0 rgba(17,24,39,0.85);}
  .card-sm{background:var(--surf);border:2px solid var(--ink);border-radius:10px;box-shadow:4px 4px 0 rgba(17,24,39,0.8);}
  .num{letter-spacing:-0.02em;line-height:1;color:var(--ink);}
  .foot{position:absolute;left:60px;right:60px;bottom:46px;display:flex;align-items:center;justify-content:space-between;z-index:2;}
  .url{background:var(--ink);color:#fff;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:6px;padding:13px 20px;font-size:19px;}
  .foot .tag{font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-size:17px;color:#9CA3AF;}
  ${titleFontCss}
  </style></head><body>
  <div class="wrap">
    <div class="texture"></div><div class="ghost">11</div>
    <div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div></div>
    <div class="page"><b>${String(slide).padStart(2, "0")}</b> / ${String(TOTAL).padStart(2, "0")}</div>
    ${body}
    <div class="foot"><div class="url">LOS11DESAMPA.COM</div><div class="tag">${tag}</div></div>
  </div></body></html>`;
}

// ─── Slide 1: Portada "YA ESTÁN LOS PUNTOS" ──────────────────────────────────
function slide1(equipos: number): string {
  const statPill = (icon: string, label: string, value: string, accent: string, accentBg: string) =>
    `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;background:${accentBg};border:2px solid var(--ink);border-radius:12px;padding:22px 12px;box-shadow:5px 5px 0 rgba(17,24,39,0.8);">
      ${icon}
      <span class="num" style="font-size:44px;color:${accent};">${value}</span>
      <span style="font-weight:700;font-size:17px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink3);text-align:center;line-height:1.2;">${label}</span>
    </div>`;

  return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:space-between;height:1120px;padding-top:36px;">
    <div style="display:flex;flex-direction:column;gap:22px;">
      <div class="eyebrow">FECHA 3 · FASE DE GRUPOS · MUNDIAL 2026</div>
      <div class="title" style="font-size:118px;">
        YA ESTÁN<br>LOS <span class="b">PUNTOS</span>
      </div>
      <p class="body" style="font-size:33px;line-height:1.36;font-weight:600;color:var(--ink2);">
        Entrá a ver cuánto sumó tu equipo<br>y tu puesto en el ranking.
      </p>
    </div>

    <div style="background:var(--dark);border:2px solid var(--ink);border-radius:14px;padding:32px 36px;display:flex;align-items:center;gap:24px;box-shadow:7px 7px 0 rgba(17,24,39,0.85);">
      ${IC.trophy(44, "#C8A24B")}
      <div>
        <div style="font-weight:800;font-size:13px;letter-spacing:0.16em;color:#9CA3AF;text-transform:uppercase;margin-bottom:4px;">FASE DE GRUPOS</div>
        <div style="font-family:'TitleHeavy',sans-serif;font-size:38px;color:#fff;text-transform:uppercase;letter-spacing:0.01em;">3 DE 3 FECHAS <span style="color:#C8A24B;">COMPLETAS</span></div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;gap:14px;">
        ${statPill(IC.users(36, "#1B4FD8"), "EQUIPOS", String(equipos || "—"), "var(--blue)", "var(--blue-light)")}
        ${statPill(IC.zap(36, "#7A5C10"), "PARTIDOS", "24", "var(--gold-ink)", "var(--gold-bg)")}
        ${statPill(IC.trendingUp(36, "#16713F"), "RANKING", "LIVE", "var(--green)", "#E7F4ED")}
      </div>
      <div style="background:var(--ink);border-radius:10px;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:800;font-size:26px;color:#fff;letter-spacing:0.03em;">Deslizá y mirá el Top 3</span>
        <span style="font-family:'TitleHeavy',sans-serif;font-size:38px;color:var(--blue);">&raquo;&raquo;</span>
      </div>
    </div>
  </div>`;
}

// ─── Slide 2: Top 3 de la Fecha + Top 3 Global ───────────────────────────────
function slide2(
  topFecha: Array<{ entryName: string; username: string; pts: number | null }>,
  topGlobal: Array<{ entryName: string; username: string; pts: number | null }>,
): string {
  // Fila individual del ranking
  function rankRow(
    i: number,
    name: string,
    user: string,
    pts: number | null,
    numColor: string,
    numBg: string,
    ptsColor: string,
  ) {
    const isFirst = i === 0;
    const borderB = i < 2 ? "border-bottom:2px solid #E5E7EB;" : "";
    const rowBg = isFirst ? numBg : "transparent";
    const pad = isFirst ? "30px 28px" : "24px 28px";
    return `<div style="display:flex;align-items:center;gap:20px;padding:${pad};${borderB}background:${rowBg};">
      <div style="flex:0 0 auto;width:${isFirst ? 62 : 54}px;height:${isFirst ? 62 : 54}px;border-radius:50%;background:${isFirst ? numBg : "var(--bg)"};border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(17,24,39,0.2);">
        <span class="num" style="font-size:${isFirst ? "32px" : "26px"};color:${numColor};">${i + 1}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:${isFirst ? "32px" : "27px"};color:var(--ink);text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
        <div style="font-weight:600;font-size:${isFirst ? "22px" : "19px"};color:var(--ink3);margin-top:3px;">@${user}</div>
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:baseline;gap:5px;">
        <span class="num" style="font-size:${isFirst ? "60px" : "46px"};color:${ptsColor};">${pts ?? 0}</span>
        <span style="font-weight:700;font-size:20px;color:var(--ink3);">pts</span>
      </div>
    </div>`;
  }

  function section(
    prefix: string,
    accentWord: string,
    accentColor: string,
    numColor: string,
    numBg1: string,
    ptsColor: string,
    rows: Array<{ entryName: string; username: string; pts: number | null }>,
  ) {
    const rowHtml = rows
      .map((r, i) => rankRow(i, r.entryName, r.username, r.pts, numColor, numBg1, ptsColor))
      .join("");
    return `<div>
      <div class="title" style="font-size:52px;margin-bottom:18px;">${prefix} <span style="color:${accentColor};">${accentWord}</span></div>
      <div class="card" style="overflow:hidden;padding:0;">${rowHtml}</div>
    </div>`;
  }

  return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:space-between;height:1120px;padding-top:32px;padding-bottom:8px;">
    ${section("TOP 3 DE LA", "FECHA", "var(--blue)", "#1E40AF", "var(--blue-light)", "var(--blue)", topFecha)}
    ${section("TOP 3", "GLOBAL", "var(--gold-ink)", "#7A5C10", "var(--gold-bg)", "var(--gold-ink)", topGlobal)}
  </div>`;
}

// ─── Slide 3: Mejor XI de la Fecha ───────────────────────────────────────────
function slide3(
  xi: Array<{ name: string; position: string; pts: number | null; countryCode: string | null; isCaptain?: boolean; displayPts?: number }>,
  total: number,
  flags: Record<string, { b64: string }>,
): string {
  const POS: Record<string, { c: string; bg: string; label: string }> = {
    GK:  { c: "#E6B400", bg: "#FEF3C7", label: "ARQ" },
    DEF: { c: "#1B4FD8", bg: "#DBEAFE", label: "DEF" },
    MID: { c: "#1E9E4B", bg: "#D1FAE5", label: "MED" },
    FWD: { c: "#D02B2B", bg: "#FEE2E2", label: "DEL" },
  };

  const NAME_OVERRIDES: Record<string, string> = {
    "Vinícius Júnior": "VINI JR",
  };

  function player(p: (typeof xi)[0], scale = 1.5) {
    const col = POS[p.position] ?? POS.MID;
    const code = (p.countryCode ?? "").toUpperCase();
    const f = flags[code]?.b64 ?? "";
    const fw = Math.round(72 * scale);
    const fh = Math.round(48 * scale);
    const parts = p.name.split(" ");
    const displayName = NAME_OVERRIDES[p.name]
      ?? (parts.length > 1
        ? parts[parts.length - 1].substring(0, 11).toUpperCase()
        : p.name.substring(0, 11).toUpperCase());
    const shownPts = p.isCaptain ? (p.displayPts ?? p.pts ?? 0) : (p.pts ?? 0);
    const capBadge = p.isCaptain
      ? `<div style="position:absolute;left:50%;top:${-Math.round(12*scale)}px;transform:translateX(-50%);width:${Math.round(26*scale)}px;height:${Math.round(26*scale)}px;border-radius:50%;background:#C8A24B;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,0,0,.35);z-index:2;">
          <span style="font-family:'TitleHeavy',sans-serif;font-size:${Math.round(13*scale)}px;color:#7A5C10;">C</span>
        </div>`
      : "";
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:${Math.round(5*scale)}px;width:${Math.round(130*scale)}px;">
      <div style="position:relative;">
        ${capBadge}
        <div style="width:${fw}px;height:${fh}px;border-radius:${Math.round(7*scale)}px;overflow:hidden;border:2px solid ${col.c};box-shadow:${Math.round(3*scale)}px ${Math.round(3*scale)}px 0 rgba(0,0,0,.4);">
          ${f ? `<img src="${f}" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<div style="width:100%;height:100%;background:${col.bg};"></div>`}
        </div>
        <div style="position:absolute;top:${-Math.round(10*scale)}px;right:${-Math.round(10*scale)}px;width:${Math.round(28*scale)}px;height:${Math.round(28*scale)}px;border-radius:50%;background:#111827;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,0,0,0.3);">
          <span style="font-family:'TitleHeavy',sans-serif;font-size:${Math.round(13*scale)}px;color:#fff;letter-spacing:-0.02em;">${shownPts}</span>
        </div>
      </div>
      <div style="background:#fff;border-radius:${Math.round(5*scale)}px;padding:${Math.round(3*scale)}px ${Math.round(10*scale)}px;box-shadow:1px 2px 0 rgba(0,0,0,.25);">
        <span style="font-weight:800;font-size:${Math.round(17*scale)}px;color:#111827;white-space:nowrap;">${displayName}</span>
      </div>
      <div style="background:${col.bg};border:1px solid ${col.c};border-radius:${Math.round(4*scale)}px;padding:${Math.round(2*scale)}px ${Math.round(8*scale)}px;">
        <span style="font-weight:800;font-size:${Math.round(13*scale)}px;color:${col.c};">${col.label}</span>
      </div>
    </div>`;
  }

  const byPos: Record<string, typeof xi> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of xi) byPos[p.position]?.push(p);

  function row(ps: typeof xi, scale = 1.5) {
    return `<div style="display:flex;justify-content:space-around;align-items:center;width:100%;">${ps.map(p => player(p, scale)).join("")}</div>`;
  }

  const pitchLines = `<svg viewBox="0 0 960 820" style="position:absolute;inset:0;width:100%;height:100%;" preserveAspectRatio="none">
    <rect x="2" y="2" width="956" height="816" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="14"/>
    <line x1="2" y1="410" x2="958" y2="410" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <circle cx="480" cy="410" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <rect x="310" y="2" width="340" height="96" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
    <rect x="310" y="722" width="340" height="96" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  </svg>`;

  return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;height:1120px;padding-top:24px;gap:18px;">

    <!-- Header: título + total + formación -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div class="title" style="font-size:62px;line-height:0.9;">
        MEJOR <span class="b">XI</span><br>
        <span style="font-size:48px;color:var(--ink3);">DE LA FECHA</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
        <div class="card" style="padding:12px 22px;display:flex;align-items:baseline;gap:6px;box-shadow:5px 5px 0 rgba(17,24,39,0.85);">
          <span style="font-weight:800;font-size:14px;letter-spacing:0.12em;color:var(--ink3);text-transform:uppercase;margin-right:4px;">TOTAL</span>
          <span class="num" style="font-size:62px;color:var(--blue);">${total}</span>
          <span style="font-weight:700;font-size:22px;color:var(--ink3);">pts</span>
        </div>
        <div style="background:var(--dark);border:2px solid var(--ink);border-radius:8px;padding:8px 16px;box-shadow:3px 3px 0 rgba(17,24,39,0.7);">
          <span style="font-weight:800;font-size:20px;color:#fff;letter-spacing:0.12em;">4-2-4</span>
        </div>
      </div>
    </div>

    <!-- Cancha: flex:1 para ocupar el espacio restante -->
    <div style="flex:1;position:relative;border-radius:16px;overflow:hidden;border:2px solid #111827;box-shadow:9px 9px 0 rgba(17,24,39,.9);background:repeating-linear-gradient(180deg,#2E7D4F 0 64px,#287348 64px 128px);">
      ${pitchLines}
      <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:space-around;padding:18px 6px;">
        ${row(byPos.FWD)}
        ${row(byPos.MID)}
        ${row(byPos.DEF)}
        ${row(byPos.GK)}
      </div>
    </div>

    <!-- Leyenda de posiciones -->
    <div style="display:flex;gap:24px;justify-content:center;">
      ${Object.values(POS).map(p =>
        `<div style="display:flex;align-items:center;gap:8px;">
          <div style="width:14px;height:14px;border-radius:3px;background:${p.c};border:1px solid rgba(0,0,0,0.15);"></div>
          <span style="font-weight:700;font-size:18px;color:var(--ink2);">${p.label}</span>
        </div>`
      ).join("")}
    </div>
  </div>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const [assets, data] = await Promise.all([loadAssets(), getData()]);
  const { logoB64, titleFontCss, flags } = assets;
  const { topFecha, topGlobal, xi, xiTotal, equipos } = data;

  const outDir = path.join(ROOT, "out/puntos-fecha3");
  await mkdir(outDir, { recursive: true });

  const slides = [
    { slide: 1, body: slide1(equipos), tag: "RESUMEN · FECHA 3" },
    { slide: 2, body: slide2(topFecha, topGlobal), tag: "TOP · FECHA 3" },
    { slide: 3, body: slide3(xi, xiTotal, flags), tag: "MEJOR XI · FECHA 3" },
  ];

  for (const s of slides) {
    const html = doc(logoB64, titleFontCss, s.slide, s.body, s.tag);
    const buf = await renderPng(html, SIZE);
    const file = path.join(outDir, `puntos_f3_0${s.slide}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  console.log("\n── Caption data ──────────────────────────────");
  console.log("Top 3 de la fecha:");
  topFecha.forEach((r, i) => console.log(`  ${i + 1}. ${r.entryName} @${r.username} — ${r.pts} pts`));
  console.log("Top 3 global:");
  topGlobal.forEach((r, i) => console.log(`  ${i + 1}. ${r.entryName} @${r.username} — ${r.pts} pts`));
  console.log("Mejor XI total:", xiTotal, "pts");
  console.log("\nListo → out/puntos-fecha3/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
