import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { entries, users, entryRounds } from "../lib/db/schema";
import { renderPng } from "../lib/stories/render";

/*
 * Story 9:16 (1080×1920) — "SE TERMINÓ EL MUNDIAL":
 *   corona al campeón del juego (top 1 del ranking general) y muestra el 2° y 3°.
 *
 * Misma familia visual que generate-story-8vos.ts / generate-highlights.ts:
 * chrome con header badge + wordmark, ghost "11", textura, sombras duras,
 * Archivo Black en títulos, Poppins en el cuerpo, íconos Lucide oficiales,
 * zonas seguras de Story. UN solo acento: DORADO (campeón).
 *
 * Correr DESPUÉS de publicar la Fecha 8 (la Final): antes el podio es provisorio.
 *
 *   npx tsx scripts/generate-story-final.ts   # → out/final/
 *
 * OJO: se consulta la DB con drizzle CRUDO a propósito. Los helpers de
 * lib/queries.ts están envueltos en `unstable_cache`, que fuera de un request de
 * Next tira "Invariant: incrementalCache missing" — no se pueden usar desde tsx.
 */

const ROOT = process.cwd();
const SIZE = { width: 1080, height: 1920 };

// ─── Íconos: paths OFICIALES de Lucide ───
function lucide(paths: string, s: number, c: string, sw = 2): string {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const P = {
  trophy:
    '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
  medal:
    '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
};
const ic = (paths: string, c: string, s = 40) => lucide(paths, s, c);

// ─── Chrome 9:16 ───
type Foot = { url: string; tag: string };
function doc(logoB64: string, titleFontCss: string, inner: string, foot: Foot): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--blue:#1B4FD8;--blue-light:#EFF4FF;--blue-border:#BFCFFF;--gold:#C8A24B;--gold-ink:#7A5C10;--gold-bg:#FBF5E6;--gold-border:#E8D4A0;--ink:#111827;--ink2:#374151;--ink3:#6B7280;--bg:#F0F2F0;--surf:#FFFFFF;--border:#111827;--dark:#101726;--green:#16713F;}
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
  .title .b{color:var(--blue);} .title .g{color:var(--gold-ink);}
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

type Tones = { accent: string; accentBg: string; accentBorder: string };

/** Card protagonista: franja tintada + numeral gigante + barra de acento + bajada. */
function heroNumeralCard(iconPaths: string, labelText: string, bigHtml: string, subHtml: string, t: Tones): string {
  return `<div class="card" style="margin-top:40px;padding:0;overflow:hidden;">
    <div style="background:${t.accentBg};border-bottom:2px solid var(--ink);padding:24px 0;display:flex;align-items:center;justify-content:center;gap:14px;">
      ${lucide(iconPaths, 34, t.accent)}
      <span style="font-weight:800;font-size:33px;letter-spacing:0.14em;text-transform:uppercase;color:${t.accent};">${labelText}</span>
    </div>
    <div style="padding:40px 40px 44px;text-align:center;">
      <div style="display:flex;align-items:flex-start;justify-content:center;gap:16px;">${bigHtml}</div>
      <div style="width:330px;height:11px;background:${t.accent};border-radius:6px;margin:24px auto 0;box-shadow:5px 5px 0 ${t.accentBorder};"></div>
      <div class="title" style="font-size:50px;margin-top:24px;">${subHtml}</div>
    </div>
  </div>`;
}

/** Fila del 2°/3° puesto. */
function podiumRow(pos: number, user: string, team: string, pts: number): string {
  return `<div class="card" style="display:flex;align-items:center;gap:24px;padding:26px 32px;">
    <div style="flex:0 0 auto;width:76px;height:76px;border-radius:50%;background:var(--gold-bg);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;">
      <span class="num" style="font-size:38px;color:var(--gold-ink);">${pos}</span>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:800;font-size:36px;color:var(--ink);line-height:1.08;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">@${user}</div>
      <p class="body" style="font-size:25px;line-height:1.3;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${team}</p>
    </div>
    <div style="flex:0 0 auto;display:flex;align-items:baseline;gap:6px;">
      <span class="num" style="font-size:52px;color:var(--gold-ink);">${pts}</span>
      <span style="font-weight:700;font-size:24px;color:var(--ink3);">pts</span>
    </div>
  </div>`;
}

const GOLD: Tones = { accent: "#7A5C10", accentBg: "var(--gold-bg)", accentBorder: "var(--gold-border)" };

async function loadAssets() {
  const [logoBuf, titleFont] = await Promise.all([
    readFile(path.join(ROOT, "public/images/logo/logo-badge-192.png")),
    readFile(path.join(ROOT, "assets/stories/fonts/archivo-black-latin.woff2")),
  ]);
  const logoB64 = logoBuf.toString("base64");
  const titleFontCss = `@font-face{font-family:'TitleHeavy';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${titleFont.toString("base64")}) format('woff2');}`;
  return { logoB64, titleFontCss };
}

async function getPodium() {
  return db
    .select({ entryId: entries.id, entryName: entries.name, username: users.username, pts: entries.totalPoints })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .orderBy(desc(entries.totalPoints), asc(entries.id))
    .limit(3);
}

/**
 * Si el 1er puesto está empatado en puntos, el orden lo estaría dando entries.id
 * (orden de alta), que es arbitrario y no se puede publicar como criterio. Las
 * Bases definen el desempate real: MEJOR PUNTAJE EN UNA SOLA FECHA. Lo calculamos
 * para poder mostrarlo — si no, la placa muestra dos totales iguales y un campeón
 * sin explicación.
 */
async function getDesempate(podio: Awaited<ReturnType<typeof getPodium>>): Promise<string | null> {
  if (podio.length < 2 || podio[0]!.pts !== podio[1]!.pts) return null;
  const empatados = podio.filter((p) => p.pts === podio[0]!.pts).map((p) => p.entryId);
  const picos = await db
    .select({ best: sql<number>`MAX(${entryRounds.points})` })
    .from(entryRounds)
    .where(inArray(entryRounds.entryId, empatados))
    .groupBy(entryRounds.entryId)
    .orderBy(desc(sql`MAX(${entryRounds.points})`));
  const [mejor, segundo] = [picos[0]?.best, picos[1]?.best];
  if (mejor == null || segundo == null || Number(mejor) === Number(segundo)) return null;
  return `Empate en ${podio[0]!.pts} pts: define el mejor puntaje en una sola fecha (${mejor} vs ${segundo}).`;
}

async function main() {
  const [{ logoB64, titleFontCss }, podio] = await Promise.all([loadAssets(), getPodium()]);
  const desempate = await getDesempate(podio);
  const campeon = podio[0];
  if (!campeon) throw new Error("No hay equipos en el ranking: ¿ya se publicó la Fecha 8?");

  const resto = podio.slice(1);
  const html = `
    ${eyebrow(ic(P.flag, "#7A5C10", 30), "Mundial 2026 · Terminó", "#7A5C10")}
    <div class="title" style="font-size:104px;margin-top:16px;">SE TERMINÓ<br>EL <span class="g">MUNDIAL</span></div>
    <p class="body" style="font-size:32px;line-height:1.36;margin-top:24px;">Después de <b>8 fechas</b>, ya tenemos campeón en Los 11 de Sampa. Este es el DT que mejor la vio.</p>
    ${heroNumeralCard(
      P.trophy,
      "Campeón",
      `<span class="num" style="font-size:150px;color:var(--ink);line-height:0.82;">${campeon.pts ?? 0}</span><span style="font-weight:700;font-size:40px;color:var(--ink3);align-self:flex-end;margin-bottom:14px;">pts</span>`,
      `<span class="g">@${campeon.username ?? "DT"}</span>`,
      GOLD,
    )}
    ${
      resto.length > 0
        ? `<div style="display:flex;flex-direction:column;gap:16px;margin-top:34px;">
             ${resto.map((r, i) => podiumRow(i + 2, r.username ?? "DT", r.entryName, Number(r.pts ?? 0))).join("")}
           </div>`
        : ""
    }
    ${
      desempate
        ? `<div style="margin-top:30px;background:var(--gold-bg);border:2px solid var(--gold-border);border-radius:14px;padding:24px 28px;">
             <p class="body" style="font-size:26px;line-height:1.3;color:var(--gold-ink);font-weight:600;text-align:center;">${desempate}</p>
           </div>`
        : ""
    }
    <p class="body" style="font-size:30px;line-height:1.32;margin-top:30px;text-align:center;">Mirá el ranking final completo en <b>los11desampa.com</b></p>`;

  const outDir = path.join(ROOT, "out/final");
  await mkdir(outDir, { recursive: true });
  const buf = await renderPng(doc(logoB64, titleFontCss, html, { url: "LOS11DESAMPA.COM", tag: "Ranking final" }), SIZE);
  const file = path.join(outDir, "story_final.png");
  await writeFile(file, buf);
  console.log(`✓ ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);

  console.log("\n── Caption data ──────────────────────────────");
  if (desempate) console.log(`DESEMPATE: ${desempate}`);
  podio.forEach((r, i) => console.log(`  ${i + 1}. @${r.username} (${r.entryName}) — ${r.pts} pts`));
  console.log("\nListo → out/final/");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
