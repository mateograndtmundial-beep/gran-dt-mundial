import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { entries, users, entryRounds, playerRoundPoints, players, countries } from "../lib/db/schema";
import { FORMATIONS } from "../lib/game/config";
import { renderPng } from "../lib/stories/render";

/*
 * Carrusel 4 slides 1080×1350 — "SE TERMINÓ EL MUNDIAL"
 *   Slide 1: portada
 *   Slide 2: podio final (top 3 DTs del juego)
 *   Slide 3: XI ideal del torneo (puntos fantasy acumulados de las 8 fechas)
 *   Slide 4: los números del Mundial
 *
 * Acento DORADO (campeón), un solo acento por placa — ver docs/social/VISUAL-SYSTEM.md.
 *
 * Correr DESPUÉS de publicar la Fecha 8 (la Final): antes, los puntos del torneo
 * están incompletos y el podio sería provisorio.
 *
 *   npx tsx scripts/generate-final-mundial.ts   → out/final/
 *
 * OJO: acá se consulta la DB con drizzle CRUDO a propósito. Los helpers de
 * lib/queries.ts están envueltos en `unstable_cache`, que fuera de un request de
 * Next tira "Invariant: incrementalCache missing" — no se pueden usar desde tsx.
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1350 };
const TOTAL = 4;

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
type XiPlayer = {
  name: string;
  position: string;
  pts: number;
  countryCode: string | null;
};

async function getData() {
  // Podio final del juego: los mismos totales que muestra /ranking.
  const podio = await db
    .select({
      entryId: entries.id,
      entryName: entries.name,
      username: users.username,
      pts: entries.totalPoints,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .orderBy(desc(entries.totalPoints), asc(entries.id))
    .limit(3);

  // ¿Empate en el 1er puesto? El podio se ordena por puntos y desempata por
  // entries.id (orden de alta), que es arbitrario y no se puede publicar como
  // criterio. Las Bases definen el desempate real: MEJOR PUNTAJE EN UNA SOLA
  // FECHA, y recién después la inscripción más temprana. Si hay empate, lo
  // calculamos y lo mostramos en la placa — si no, la gente ve dos totales
  // iguales y un campeón sin explicación.
  let desempate: string | null = null;
  if (podio.length >= 2 && podio[0]!.pts === podio[1]!.pts) {
    const empatados = podio.filter((p) => p.pts === podio[0]!.pts).map((p) => p.entryId);
    const picos = await db
      .select({ entryId: entryRounds.entryId, best: sql<number>`MAX(${entryRounds.points})` })
      .from(entryRounds)
      .where(inArray(entryRounds.entryId, empatados))
      .groupBy(entryRounds.entryId)
      .orderBy(desc(sql`MAX(${entryRounds.points})`));
    const [mejor, segundo] = [picos[0]?.best, picos[1]?.best];
    if (mejor != null && segundo != null && Number(mejor) !== Number(segundo)) {
      desempate = `Empate en ${podio[0]!.pts} pts: define el mejor puntaje en una sola fecha (${mejor} vs ${segundo}).`;
    }
  }

  // Puntos fantasy acumulados por jugador en TODO el torneo (todas las fechas).
  const acumulado = await db
    .select({
      name: players.name,
      position: players.position,
      pts: sql<number>`SUM(${playerRoundPoints.points})`,
      countryCode: countries.code,
    })
    .from(playerRoundPoints)
    .innerJoin(players, eq(players.id, playerRoundPoints.playerId))
    .innerJoin(countries, eq(countries.id, players.countryId))
    .groupBy(players.id, players.name, players.position, countries.code)
    .orderBy(desc(sql`SUM(${playerRoundPoints.points})`));

  const pool: XiPlayer[] = acumulado.map((p) => ({
    name: p.name,
    position: p.position,
    pts: Number(p.pts ?? 0),
    countryCode: p.countryCode,
  }));

  // XI ideal: probamos TODAS las formaciones y nos quedamos con la que suma más
  // puntos (mismo criterio que lib/stories/round-recap-data.ts). Con 4-2-4 fijo
  // se perdían puntos cuando el torneo dejaba, p. ej., muchos mediocampistas top.
  const byPos: Record<string, XiPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of pool) byPos[p.position]?.push(p);

  let best: { formation: string; xi: XiPlayer[]; total: number } | null = null;
  for (const [formation, shape] of Object.entries(FORMATIONS)) {
    const xi = [
      ...(byPos.GK ?? []).slice(0, shape.GK),
      ...(byPos.DEF ?? []).slice(0, shape.DEF),
      ...(byPos.MID ?? []).slice(0, shape.MID),
      ...(byPos.FWD ?? []).slice(0, shape.FWD),
    ];
    // Formación incompleta (no hay jugadores suficientes en alguna línea) → se descarta.
    if (xi.length < shape.GK + shape.DEF + shape.MID + shape.FWD) continue;
    const total = xi.reduce((s, p) => s + p.pts, 0);
    if (!best || total > best.total) best = { formation, xi, total };
  }
  if (!best) throw new Error("No se pudo armar el XI ideal (faltan jugadores con puntos)");

  // ─── Números del torneo ───
  const [{ dts }] = await db.select({ dts: sql<number>`COUNT(*)` }).from(entries);

  const [goleador] = await db
    .select({
      name: players.name,
      countryCode: countries.code,
      goles: sql<number>`SUM(pms.goals)`,
    })
    .from(sql`player_match_stats pms`)
    .innerJoin(players, sql`${players.id} = pms.player_id`)
    .innerJoin(countries, eq(countries.id, players.countryId))
    .groupBy(players.id, players.name, countries.code)
    .orderBy(desc(sql`SUM(pms.goals)`))
    .limit(1);

  const [masElegido] = await db
    .select({
      name: players.name,
      countryCode: countries.code,
      veces: sql<number>`COUNT(*)`,
    })
    .from(sql`entry_round_players erp`)
    .innerJoin(players, sql`${players.id} = erp.player_id`)
    .innerJoin(countries, eq(countries.id, players.countryId))
    .groupBy(players.id, players.name, countries.code)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  const mejorJugador = pool[0]!;

  return {
    podio,
    desempate,
    xi: best.xi,
    formation: best.formation,
    xiTotal: best.total,
    dts: Number(dts ?? 0),
    goleador,
    masElegido,
    mejorJugador,
  };
}

// ─── Chrome común (slides 2-4) ───────────────────────────────────────────────
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

// ─── Slide 1: portada ────────────────────────────────────────────────────────
// Chrome propio: sin badge de página, tag oscuro arriba a la derecha, barra
// "DESLIZÁ »»" abajo (nunca "→", ver docs/social/PLACAS-GUIDELINES.md).
function coverDoc(logoB64: string, titleFontCss: string, tag: string, campeon: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--dark:#101726;}
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
  .tagpill{position:absolute;right:60px;top:54px;font-weight:800;font-size:15px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;background:var(--dark);border:2px solid var(--ink);border-radius:8px;padding:12px 18px;box-shadow:3px 3px 0 rgba(17,24,39,0.2);z-index:3;}
  .eyebrow{font-weight:800;font-size:34px;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold-ink);}
  .title{line-height:0.93;letter-spacing:0.005em;color:var(--ink);text-transform:uppercase;}
  .title .g{color:var(--gold-ink);}
  .body{font-weight:500;color:var(--ink2);} .body b{font-weight:800;color:var(--ink);}
  .swipe{display:inline-flex;align-items:center;gap:14px;background:var(--gold-bg);border:2px solid var(--gold-border);border-radius:10px;padding:16px 26px;box-shadow:5px 5px 0 rgba(200,162,75,0.5);}
  .swipe span{font-weight:800;font-size:26px;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold-ink);}
  .foot{position:absolute;left:60px;right:60px;bottom:46px;display:flex;align-items:center;z-index:2;}
  .url{background:var(--ink);color:#fff;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:6px;padding:13px 20px;font-size:19px;}
  ${titleFontCss}
  </style></head><body>
  <div class="wrap">
    <div class="texture"></div><div class="ghost">11</div>
    <div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div></div>
    <div class="tagpill">${tag}</div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:1180px;gap:26px;">
      <div class="eyebrow">MUNDIAL 2026 · TERMINÓ</div>
      <div class="title" style="font-size:126px;">
        SE TERMINÓ<br>EL <span class="g">MUNDIAL</span>
      </div>
      <p class="body" style="font-size:40px;line-height:1.32;font-weight:700;color:var(--ink);max-width:840px;">
        Así quedó Los 11 de Sampa: el podio, el XI ideal del torneo y todos los números.
      </p>
      <p class="body" style="font-size:32px;line-height:1.3;max-width:840px;">
        Campeón: <b>@${campeon}</b>
      </p>
      <div><div class="swipe"><span>DESLIZÁ »»</span></div></div>
    </div>
    <div class="foot"><div class="url">LOS11DESAMPA.COM</div></div>
  </div></body></html>`;
}

// ─── Slide 2: podio final ────────────────────────────────────────────────────
function slidePodio(podio: Array<{ entryName: string; username: string | null; pts: number | null }>, desempate: string | null): string {
  function row(i: number, name: string, user: string, pts: number) {
    const isFirst = i === 0;
    const borderB = i < podio.length - 1 ? "border-bottom:2px solid #E5E7EB;" : "";
    const pad = isFirst ? "34px 30px" : "26px 30px";
    return `<div style="display:flex;align-items:center;gap:22px;padding:${pad};${borderB}background:${isFirst ? "var(--gold-bg)" : "transparent"};">
      <div style="flex:0 0 auto;width:${isFirst ? 70 : 56}px;height:${isFirst ? 70 : 56}px;border-radius:50%;background:${isFirst ? "#fff" : "var(--bg)"};border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 rgba(17,24,39,0.2);">
        <span class="num" style="font-size:${isFirst ? "36px" : "28px"};color:var(--gold-ink);">${i + 1}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:${isFirst ? "36px" : "29px"};color:var(--ink);text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">@${user}</div>
        <div style="font-weight:600;font-size:${isFirst ? "23px" : "20px"};color:var(--ink3);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:baseline;gap:6px;">
        <span class="num" style="font-size:${isFirst ? "72px" : "52px"};color:var(--gold-ink);">${pts}</span>
        <span style="font-weight:700;font-size:21px;color:var(--ink3);">pts</span>
      </div>
    </div>`;
  }

  return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:1120px;padding-top:20px;gap:34px;">
    <div>
      <div class="eyebrow" style="margin-bottom:14px;">RANKING GENERAL · 8 FECHAS</div>
      <div class="title" style="font-size:88px;">EL <span class="g">PODIO</span><br>FINAL</div>
    </div>
    <div class="card" style="overflow:hidden;padding:0;">
      ${podio.map((r, i) => row(i, r.entryName, r.username ?? "DT", Number(r.pts ?? 0))).join("")}
    </div>
    ${
      desempate
        ? `<div style="background:var(--gold-bg);border:2px solid var(--gold-border);border-radius:12px;padding:22px 26px;">
             <p class="body" style="font-size:27px;line-height:1.3;color:var(--gold-ink);font-weight:600;">${desempate}</p>
           </div>`
        : ""
    }
    <p class="body" style="font-size:31px;line-height:1.32;">
      Los DT que mejor la vieron durante todo el Mundial. Mirá la tabla completa en <b>los11desampa.com</b>
    </p>
  </div>`;
}

// ─── Slide 3: XI ideal del torneo ────────────────────────────────────────────
function slideXi(xi: XiPlayer[], total: number, formation: string, flags: Record<string, { b64: string }>): string {
  const POS: Record<string, { c: string; bg: string; label: string }> = {
    GK: { c: "#E6B400", bg: "#FEF3C7", label: "ARQ" },
    DEF: { c: "#1B4FD8", bg: "#DBEAFE", label: "DEF" },
    MID: { c: "#1E9E4B", bg: "#D1FAE5", label: "MED" },
    FWD: { c: "#D02B2B", bg: "#FEE2E2", label: "DEL" },
  };
  // El display name toma el ÚLTIMO token del nombre, que falla con apellidos
  // compuestos españoles (Pau Cubarsí Paredes → "PAREDES"). Escape hatch manual.
  const NAME_OVERRIDES: Record<string, string> = {
    "Vinícius Júnior": "VINI JR",
    "Pau Cubarsí Paredes": "CUBARSÍ",
  };

  function player(p: XiPlayer, scale = 1.5) {
    const col = POS[p.position] ?? POS.MID!;
    const code = (p.countryCode ?? "").toUpperCase();
    const f = flags[code]?.b64 ?? "";
    const fw = Math.round(72 * scale);
    const fh = Math.round(48 * scale);
    const parts = p.name.split(" ");
    const displayName =
      NAME_OVERRIDES[p.name] ??
      (parts.length > 1
        ? parts[parts.length - 1]!.substring(0, 11).toUpperCase()
        : p.name.substring(0, 11).toUpperCase());
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:${Math.round(5 * scale)}px;width:${Math.round(130 * scale)}px;">
      <div style="position:relative;">
        <div style="width:${fw}px;height:${fh}px;border-radius:${Math.round(7 * scale)}px;overflow:hidden;border:2px solid ${col.c};box-shadow:${Math.round(3 * scale)}px ${Math.round(3 * scale)}px 0 rgba(0,0,0,.4);">
          ${f ? `<img src="${f}" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<div style="width:100%;height:100%;background:${col.bg};"></div>`}
        </div>
        <div style="position:absolute;top:${-Math.round(10 * scale)}px;right:${-Math.round(10 * scale)}px;width:${Math.round(28 * scale)}px;height:${Math.round(28 * scale)}px;border-radius:50%;background:#111827;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,0,0,0.3);">
          <span style="font-family:'TitleHeavy',sans-serif;font-size:${Math.round(13 * scale)}px;color:#fff;letter-spacing:-0.02em;">${p.pts}</span>
        </div>
      </div>
      <div style="background:#fff;border-radius:${Math.round(5 * scale)}px;padding:${Math.round(3 * scale)}px ${Math.round(10 * scale)}px;box-shadow:1px 2px 0 rgba(0,0,0,.25);">
        <span style="font-weight:800;font-size:${Math.round(17 * scale)}px;color:#111827;white-space:nowrap;">${displayName}</span>
      </div>
      <div style="background:${col.bg};border:1px solid ${col.c};border-radius:${Math.round(4 * scale)}px;padding:${Math.round(2 * scale)}px ${Math.round(8 * scale)}px;">
        <span style="font-weight:800;font-size:${Math.round(13 * scale)}px;color:${col.c};">${col.label}</span>
      </div>
    </div>`;
  }

  const byPos: Record<string, XiPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of xi) byPos[p.position]?.push(p);
  const row = (ps: XiPlayer[]) =>
    `<div style="display:flex;justify-content:space-around;align-items:center;width:100%;">${ps.map((p) => player(p)).join("")}</div>`;

  const pitchLines = `<svg viewBox="0 0 960 820" style="position:absolute;inset:0;width:100%;height:100%;" preserveAspectRatio="none">
    <rect x="2" y="2" width="956" height="816" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="14"/>
    <line x1="2" y1="410" x2="958" y2="410" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <circle cx="480" cy="410" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <rect x="310" y="2" width="340" height="96" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
    <rect x="310" y="722" width="340" height="96" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  </svg>`;

  return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;height:1120px;padding-top:24px;gap:18px;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div class="title" style="font-size:62px;line-height:0.9;">
        EL <span class="g">XI</span> IDEAL<br>
        <span style="font-size:44px;color:var(--ink3);">DEL MUNDIAL</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
        <div class="card" style="padding:12px 22px;display:flex;align-items:baseline;gap:6px;box-shadow:5px 5px 0 rgba(17,24,39,0.85);">
          <span style="font-weight:800;font-size:14px;letter-spacing:0.12em;color:var(--ink3);text-transform:uppercase;margin-right:4px;">TOTAL</span>
          <span class="num" style="font-size:62px;color:var(--gold-ink);">${total}</span>
          <span style="font-weight:700;font-size:22px;color:var(--ink3);">pts</span>
        </div>
        <div style="background:var(--dark);border:2px solid var(--ink);border-radius:8px;padding:8px 16px;box-shadow:3px 3px 0 rgba(17,24,39,0.7);">
          <span style="font-weight:800;font-size:20px;color:#fff;letter-spacing:0.12em;">${formation}</span>
        </div>
      </div>
    </div>

    <div style="flex:1;position:relative;border-radius:16px;overflow:hidden;border:2px solid #111827;box-shadow:9px 9px 0 rgba(17,24,39,.9);background:repeating-linear-gradient(180deg,#2E7D4F 0 64px,#287348 64px 128px);">
      ${pitchLines}
      <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:space-around;padding:18px 6px;">
        ${row(byPos.FWD ?? [])}
        ${row(byPos.MID ?? [])}
        ${row(byPos.DEF ?? [])}
        ${row(byPos.GK ?? [])}
      </div>
    </div>

    <div style="display:flex;gap:24px;justify-content:center;">
      ${Object.values(POS)
        .map(
          (p) =>
            `<div style="display:flex;align-items:center;gap:8px;">
          <div style="width:14px;height:14px;border-radius:3px;background:${p.c};border:1px solid rgba(0,0,0,0.15);"></div>
          <span style="font-weight:700;font-size:18px;color:var(--ink2);">${p.label}</span>
        </div>`,
        )
        .join("")}
    </div>
  </div>`;
}

// ─── Slide 4: los números del torneo ─────────────────────────────────────────
function slideNumeros(d: {
  dts: number;
  goleador?: { name: string; countryCode: string | null; goles: number };
  masElegido?: { name: string; countryCode: string | null; veces: number };
  mejorJugador: XiPlayer;
  flags: Record<string, { b64: string }>;
}): string {
  function statCard(label: string, big: string, sub: string, code: string | null, unit = "") {
    const f = code ? (d.flags[code.toUpperCase()]?.b64 ?? "") : "";
    const flagHtml = f
      ? `<div style="flex:0 0 auto;width:92px;height:62px;border-radius:9px;overflow:hidden;border:2px solid var(--ink);box-shadow:4px 4px 0 rgba(17,24,39,0.35);">
           <img src="${f}" style="width:100%;height:100%;object-fit:cover;display:block;">
         </div>`
      : "";
    return `<div class="card" style="display:flex;align-items:center;gap:26px;padding:30px 32px;">
      ${flagHtml}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:19px;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold-ink);">${label}</div>
        <div style="font-weight:800;font-size:38px;color:var(--ink);line-height:1.1;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${big}</div>
      </div>
      <div style="flex:0 0 auto;text-align:right;">
        <div class="num" style="font-size:58px;color:var(--gold-ink);">${sub}</div>
        ${unit ? `<div style="font-weight:700;font-size:19px;color:var(--ink3);letter-spacing:0.06em;text-transform:uppercase;margin-top:2px;">${unit}</div>` : ""}
      </div>
    </div>`;
  }

  return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:1120px;padding-top:20px;gap:30px;">
    <div>
      <div class="eyebrow" style="margin-bottom:14px;">MUNDIAL 2026 · BALANCE</div>
      <div class="title" style="font-size:88px;">LOS <span class="g">NÚMEROS</span><br>DEL TORNEO</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;">
      ${statCard("DT que jugaron", "Armaron su equipo", String(d.dts), null, "equipos")}
      ${
        d.goleador
          ? statCard("Goleador del Mundial", d.goleador.name, `${d.goleador.goles}`, d.goleador.countryCode, "goles")
          : ""
      }
      ${
        d.masElegido
          ? statCard("El más elegido", d.masElegido.name, `${d.masElegido.veces}`, d.masElegido.countryCode, "veces")
          : ""
      }
      ${statCard("Más puntos fantasy", d.mejorJugador.name, `${d.mejorJugador.pts}`, d.mejorJugador.countryCode, "pts")}
    </div>

    <p class="body" style="font-size:29px;line-height:1.32;">
      Gracias por jugar. Nos vemos en la próxima. <b>los11desampa.com</b>
    </p>
  </div>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const [assets, data] = await Promise.all([loadAssets(), getData()]);
  const { logoB64, titleFontCss, flags } = assets;
  const { podio, desempate, xi, formation, xiTotal, dts, goleador, masElegido, mejorJugador } = data;

  const outDir = path.join(ROOT, "out/final");
  await mkdir(outDir, { recursive: true });

  const campeon = podio[0]?.username ?? "DT";
  const slides = [
    coverDoc(logoB64, titleFontCss, "BALANCE · MUNDIAL", campeon),
    doc(logoB64, titleFontCss, 2, slidePodio(podio, desempate), "PODIO FINAL"),
    doc(logoB64, titleFontCss, 3, slideXi(xi, xiTotal, formation, flags), "XI IDEAL"),
    doc(logoB64, titleFontCss, 4, slideNumeros({ dts, goleador, masElegido, mejorJugador, flags }), "LOS NÚMEROS"),
  ];

  for (let i = 0; i < slides.length; i++) {
    const buf = await renderPng(slides[i]!, SIZE);
    const file = path.join(outDir, `final_${String(i + 1).padStart(2, "0")}.png`);
    await writeFile(file, buf);
    console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  console.log("\n── Caption data ──────────────────────────────");
  if (desempate) console.log(`DESEMPATE: ${desempate}`);
  console.log("Podio final:");
  podio.forEach((r, i) => console.log(`  ${i + 1}. @${r.username} (${r.entryName}) — ${r.pts} pts`));
  console.log(`XI ideal (${formation}): ${xiTotal} pts`);
  xi.forEach((p) => console.log(`  ${p.position.padEnd(3)} ${p.name} — ${p.pts} pts`));
  console.log(`DT que jugaron: ${dts}`);
  if (goleador) console.log(`Goleador: ${goleador.name} — ${goleador.goles} goles`);
  if (masElegido) console.log(`Más elegido: ${masElegido.name} — ${masElegido.veces} veces`);
  console.log(`Más puntos fantasy: ${mejorJugador.name} — ${mejorJugador.pts} pts`);
  console.log("\nListo → out/final/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
