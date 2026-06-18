import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, entryRounds, users, players, countries, playerRoundPoints, rounds } from "@/lib/db/schema";
import { getGlobalLeaderboard } from "@/lib/queries";
import { POS, type Pos, type FlagMap } from "./recap-data";

// Datos + HTML del carrusel "resumen de fecha" (se postea DESPUÉS de publicar, los
// puntos salen de entry_rounds / player_round_points que llena publishRound):
//   1) aviso "ya están los puntos"  2) Top 3 fecha + Top 3 global  3) Mejor XI.

export type RankRow = { name: string; points: number };
export type XIPlayer = { name: string; position: Pos; code: string; points: number };
export type RoundRecapData = {
  roundOrder: number;
  topFecha: RankRow[];
  topGlobal: RankRow[];
  mejorXI: XIPlayer[];
};

/** Resumen de una fecha YA publicada. null si no existe o todavía no tiene puntos. */
export async function getRoundRecapData(roundId: number): Promise<RoundRecapData | null> {
  const round = (await db.select({ order: rounds.order }).from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
  if (!round) return null;

  const topFecha: RankRow[] = (
    await db
      .select({ name: entries.name, username: users.username, points: entryRounds.points })
      .from(entryRounds)
      .innerJoin(entries, eq(entryRounds.entryId, entries.id))
      .innerJoin(users, eq(entries.userId, users.id))
      .where(eq(entryRounds.roundId, roundId))
      .orderBy(desc(entryRounds.points), asc(entries.id))
      .limit(3)
  ).map((r) => ({ name: r.name ?? r.username ?? "—", points: r.points }));

  const topGlobal: RankRow[] = (await getGlobalLeaderboard(3)).map((r) => ({
    name: r.name ?? r.username ?? "—",
    points: r.totalPoints,
  }));

  // Mejor XI: por posición, los de más puntos de la fecha. Formación 4-3-3.
  const rows = await db
    .select({ name: players.name, position: players.position, code: countries.code, points: playerRoundPoints.points })
    .from(playerRoundPoints)
    .innerJoin(players, eq(playerRoundPoints.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(playerRoundPoints.roundId, roundId))
    .orderBy(desc(playerRoundPoints.points));
  const pick = (p: Pos, n: number): XIPlayer[] =>
    rows.filter((r) => r.position === p).slice(0, n).map((r) => ({ name: r.name, position: p, code: r.code ?? "", points: r.points }));
  const mejorXI = [...pick("GK", 1), ...pick("DEF", 4), ...pick("MID", 3), ...pick("FWD", 3)];

  if (!topFecha.length && !mejorXI.length) return null;
  return { roundOrder: round.order, topFecha, topGlobal, mejorXI };
}

// ─── HTML (1080×1350, mismo lenguaje visual: Poppins, sombras duras, ghost "11") ───

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function chrome(inner: string, logoB64: string, tag: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
.wrap{position:relative;width:1080px;height:1350px;background:#F0F2F0;overflow:hidden;padding:70px;display:flex;flex-direction:column;}
.ghost{position:absolute;right:-50px;bottom:-140px;font-weight:800;font-size:560px;color:#111827;opacity:0.04;letter-spacing:-0.06em;line-height:1;}
.hd{display:flex;align-items:center;gap:16px;}
.hd .lg{width:72px;height:72px;border-radius:50%;border:3px solid #1B4FD8;overflow:hidden;background:#fff;box-shadow:3px 3px 0 rgba(17,24,39,0.18);flex:0 0 72px;}
.hd .lg img{width:100%;height:100%;display:block;}
.hd .wm{font-weight:800;font-size:30px;text-transform:uppercase;}
.hd .wm span{color:#1B4FD8;}
.tag{margin-left:auto;background:#111827;color:#fff;font-weight:800;font-size:18px;letter-spacing:0.12em;text-transform:uppercase;padding:12px 18px;border-radius:6px;}
.ftr{margin-top:auto;padding-top:24px;}
.url{display:inline-block;background:#111827;color:#fff;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:6px;padding:14px 22px;font-size:21px;}
</style></head><body><div class="wrap">
<div class="ghost">11</div>
<div class="hd"><div class="lg"><img src="data:image/png;base64,${logoB64}"></div><div class="wm">LOS <span>11</span> DE SAMPA</div><div class="tag">${tag}</div></div>
${inner}
<div class="ftr"><span class="url">LOS11DESAMPA.COM</span></div>
</div></body></html>`;
}

export function coverHtml(d: RoundRecapData, logoB64: string): string {
  const inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="color:#1B4FD8;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;font-size:30px;">Fecha ${d.roundOrder} · Mundial 2026</div>
    <div style="font-weight:800;font-size:128px;line-height:0.9;letter-spacing:-0.03em;text-transform:uppercase;margin-top:14px;">Ya están<br>los <span style="color:#1B4FD8;">puntos</span></div>
    <div style="margin-top:30px;font-weight:700;font-size:36px;color:#374151;max-width:780px;line-height:1.25;">Entrá a ver cuánto sumó tu equipo y tu puesto en el ranking 👀</div>
  </div>`;
  return chrome(inner, logoB64, `Resumen · Fecha ${d.roundOrder}`);
}

function rankRows(rows: RankRow[], accent: string): string {
  const medals = ["🥇", "🥈", "🥉"];
  if (!rows.length) return `<div style="font-size:26px;color:#9AA6BF;font-weight:700;">Sin datos todavía.</div>`;
  return rows
    .map(
      (r, i) =>
        `<div style="display:flex;align-items:center;gap:18px;background:#fff;border:2px solid #111827;border-radius:12px;box-shadow:4px 4px 0 rgba(17,24,39,0.7);padding:18px 22px;margin-bottom:14px;">
      <span style="font-size:40px;width:48px;text-align:center;">${medals[i] ?? i + 1}</span>
      <span style="flex:1;min-width:0;font-weight:800;font-size:34px;text-transform:uppercase;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.name)}</span>
      <span style="font-weight:800;font-size:38px;color:${accent};white-space:nowrap;">${r.points}<span style="font-size:20px;color:#9AA6BF;font-weight:700;"> pts</span></span>
    </div>`,
    )
    .join("");
}

export function podiumHtml(d: RoundRecapData, logoB64: string): string {
  const inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:44px;">
    <div><div style="font-weight:800;font-size:42px;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:22px;">Top 3 de la <span style="color:#1B4FD8;">fecha</span></div>${rankRows(d.topFecha, "#1B4FD8")}</div>
    <div><div style="font-weight:800;font-size:42px;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:22px;">Top 3 <span style="color:#C8A24B;">global</span></div>${rankRows(d.topGlobal, "#C8A24B")}</div>
  </div>`;
  return chrome(inner, logoB64, `Top · Fecha ${d.roundOrder}`);
}

function xiChip(p: XIPlayer, flags: FlagMap): string {
  const c = POS[p.position];
  const flag = flags[p.code]?.b64 ?? "";
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:160px;">
    <div style="position:relative;width:88px;height:88px;border-radius:16px;background:${c.color};display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 #111827;border:3px solid #fff;">
      ${flag ? `<img src="${flag}" style="width:48px;height:32px;object-fit:cover;border-radius:3px;">` : ""}
      <span style="position:absolute;top:-12px;right:-12px;background:#111827;color:#fff;font-weight:800;font-size:20px;border-radius:9px;padding:2px 9px;border:2px solid #fff;">${p.points}</span>
    </div>
    <span style="font-weight:800;font-size:19px;color:#fff;text-transform:uppercase;text-align:center;line-height:1;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.name)}</span>
  </div>`;
}

export function xiHtml(d: RoundRecapData, flags: FlagMap, logoB64: string): string {
  const row = (ps: XIPlayer[]) =>
    `<div style="display:flex;justify-content:space-around;align-items:center;">${ps.map((p) => xiChip(p, flags)).join("")}</div>`;
  const fwd = d.mejorXI.filter((p) => p.position === "FWD");
  const mid = d.mejorXI.filter((p) => p.position === "MID");
  const def = d.mejorXI.filter((p) => p.position === "DEF");
  const gk = d.mejorXI.filter((p) => p.position === "GK");
  const inner = `<div style="font-weight:800;font-size:50px;text-transform:uppercase;letter-spacing:-0.02em;margin-top:24px;">Mejor <span style="color:#1B4FD8;">XI</span> de la fecha</div>
    <div style="flex:1;margin-top:24px;background:#16713F;border:2px solid #111827;border-radius:18px;box-shadow:7px 7px 0 rgba(17,24,39,0.5);padding:40px 18px;display:flex;flex-direction:column;justify-content:space-around;">
      ${row(fwd)}${row(mid)}${row(def)}${row(gk)}
    </div>`;
  return chrome(inner, logoB64, `Mejor XI · Fecha ${d.roundOrder}`);
}

// Demo para testear el render sin DB publicada: `--round-recap --demo`.
export const DEMO_ROUND_RECAP: RoundRecapData = {
  roundOrder: 1,
  topFecha: [
    { name: "El Codo de Costas", points: 142 },
    { name: "Los Galácticos", points: 138 },
    { name: "Sampaoli FC", points: 131 },
  ],
  topGlobal: [
    { name: "El Codo de Costas", points: 142 },
    { name: "Messi y los Pibes", points: 140 },
    { name: "Los Galácticos", points: 138 },
  ],
  mejorXI: [
    { name: "Simón", position: "GK", code: "ESP", points: 11 },
    { name: "Hincapié", position: "DEF", code: "ECU", points: 14 },
    { name: "Muharemović", position: "DEF", code: "BIH", points: 12 },
    { name: "Pedri", position: "DEF", code: "ESP", points: 11 },
    { name: "Dumfries", position: "DEF", code: "NED", points: 10 },
    { name: "Hwang", position: "MID", code: "KOR", points: 21 },
    { name: "Quiñones", position: "MID", code: "MEX", points: 19 },
    { name: "Reijnders", position: "MID", code: "NED", points: 15 },
    { name: "Balogun", position: "FWD", code: "USA", points: 21 },
    { name: "Díaz", position: "FWD", code: "COL", points: 17 },
    { name: "Williams", position: "FWD", code: "ESP", points: 14 },
  ],
};
