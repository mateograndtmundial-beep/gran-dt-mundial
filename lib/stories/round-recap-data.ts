import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, entryRounds, users, players, countries, playerRoundPoints, playerMatchStats, matches, rounds } from "@/lib/db/schema";
import { getGlobalLeaderboard } from "@/lib/queries";
import { FORMATIONS, ROUNDS, SCORING } from "@/lib/game/config";
import { POS, type Pos, type FlagMap } from "./recap-data";

// Datos + HTML del carrusel "resumen de fecha" (se postea DESPUÉS de publicar, los
// puntos salen de entry_rounds / player_round_points que llena publishRound):
//   1) aviso "ya están los puntos"  2) Top 3 fecha + Top 3 global  3) Mejor XI.

export type RankRow = { name: string; username?: string | null; points: number };
// `base` = calificación base de la fecha (suma de ratings ≥20'); el capitán la duplica.
export type XIPlayer = { name: string; position: Pos; code: string; points: number; base: number };
export type RoundRecapData = {
  roundOrder: number;
  topFecha: RankRow[];
  topGlobal: RankRow[];
  mejorXI: XIPlayer[];
  formation: string;
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
  ).map((r) => ({ name: r.name ?? r.username ?? "—", username: r.username, points: r.points }));

  const topGlobal: RankRow[] = (await getGlobalLeaderboard(3)).map((r) => ({
    name: r.name ?? r.username ?? "—",
    username: r.username,
    points: r.totalPoints,
  }));

  // Calificación base por jugador en la fecha (suma de ratings ≥20'), igual que
  // publishRound: la usa el capitán (duplica solo la calificación, no el puntaje).
  const baseRows = await db
    .select({ playerId: playerMatchStats.playerId, rating: playerMatchStats.rating, minutes: playerMatchStats.minutes })
    .from(playerMatchStats)
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .where(eq(matches.roundId, roundId));
  const baseBy = new Map<number, number>();
  for (const s of baseRows) {
    if (s.minutes >= SCORING.minMinutes && s.rating != null) {
      baseBy.set(s.playerId, (baseBy.get(s.playerId) ?? 0) + Math.round(s.rating));
    }
  }

  // Candidatos de la fecha, ordenados por puntos. El "mejor XI" elige la formación
  // (entre las permitidas) que maximiza el puntaje total del once.
  const rows = await db
    .select({ playerId: playerRoundPoints.playerId, name: players.name, position: players.position, code: countries.code, points: playerRoundPoints.points })
    .from(playerRoundPoints)
    .innerJoin(players, eq(playerRoundPoints.playerId, players.id))
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(eq(playerRoundPoints.roundId, roundId))
    .orderBy(desc(playerRoundPoints.points));
  const byPos = (p: Pos): XIPlayer[] =>
    rows
      .filter((r) => r.position === p)
      .map((r) => ({ name: r.name, position: p, code: r.code ?? "", points: r.points, base: baseBy.get(r.playerId) ?? 0 }));
  const pool: Record<Pos, XIPlayer[]> = { GK: byPos("GK"), DEF: byPos("DEF"), MID: byPos("MID"), FWD: byPos("FWD") };

  let best: { formation: string; mejorXI: XIPlayer[]; total: number } | null = null;
  for (const [formation, shape] of Object.entries(FORMATIONS)) {
    if (pool.GK.length < shape.GK || pool.DEF.length < shape.DEF || pool.MID.length < shape.MID || pool.FWD.length < shape.FWD) {
      continue; // no alcanzan jugadores para llenar esta formación
    }
    const mejorXI = [
      ...pool.GK.slice(0, shape.GK),
      ...pool.DEF.slice(0, shape.DEF),
      ...pool.MID.slice(0, shape.MID),
      ...pool.FWD.slice(0, shape.FWD),
    ];
    const total = mejorXI.reduce((s, p) => s + p.points, 0);
    if (!best || total > best.total) best = { formation, mejorXI, total };
  }

  if (!topFecha.length && !best) return null;
  return { roundOrder: round.order, topFecha, topGlobal, mejorXI: best?.mejorXI ?? [], formation: best?.formation ?? "4-3-3" };
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

// Etiqueta de la fecha: en grupos "Fecha N · Fase de grupos"; en mata-mata, la
// instancia ("16vos de Final", etc.). Sale de ROUNDS (config) por orden.
function roundLabel(order: number): string {
  const r = ROUNDS.find((x) => x.order === order);
  if (!r) return `Fecha ${order}`;
  return r.type === "group" ? `Fecha ${order} · Fase de grupos` : r.name;
}

export function coverHtml(d: RoundRecapData, logoB64: string): string {
  const inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="color:#1B4FD8;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;font-size:30px;">${esc(roundLabel(d.roundOrder))} · Mundial 2026</div>
    <div style="font-weight:800;font-size:128px;line-height:0.9;letter-spacing:-0.03em;text-transform:uppercase;margin-top:14px;">Ya están<br>los <span style="color:#1B4FD8;">puntos</span></div>
    <div style="margin-top:30px;font-weight:700;font-size:36px;color:#374151;max-width:780px;line-height:1.25;">Entrá a ver cuánto sumó tu equipo y tu puesto en el ranking 👀</div>
  </div>`;
  return chrome(inner, logoB64, `Resumen · Fecha ${d.roundOrder}`);
}

function rankRows(rows: RankRow[], accent: string): string {
  const medals = ["🥇", "🥈", "🥉"];
  if (!rows.length) return `<div style="font-size:26px;color:#9AA6BF;font-weight:700;">Sin datos todavía.</div>`;
  return rows
    .map((r, i) => {
      const handle = r.username && r.username !== r.name ? r.username : null;
      return `<div style="display:flex;align-items:center;gap:18px;background:#fff;border:2px solid #111827;border-radius:12px;box-shadow:4px 4px 0 rgba(17,24,39,0.7);padding:18px 22px;margin-bottom:14px;">
      <span style="font-size:40px;width:48px;text-align:center;">${medals[i] ?? i + 1}</span>
      <span style="flex:1;min-width:0;">
        <span style="display:block;font-weight:800;font-size:34px;text-transform:uppercase;letter-spacing:-0.01em;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.name)}</span>
        ${handle ? `<span style="display:block;font-weight:600;font-size:19px;color:#9AA6BF;letter-spacing:0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@${esc(handle)}</span>` : ""}
      </span>
      <span style="font-weight:800;font-size:38px;color:${accent};white-space:nowrap;">${r.points}<span style="font-size:20px;color:#9AA6BF;font-weight:700;"> pts</span></span>
    </div>`;
    })
    .join("");
}

export function podiumHtml(d: RoundRecapData, logoB64: string): string {
  const inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:44px;">
    <div><div style="font-weight:800;font-size:42px;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:22px;">Top 3 de la <span style="color:#1B4FD8;">fecha</span></div>${rankRows(d.topFecha, "#1B4FD8")}</div>
    <div><div style="font-weight:800;font-size:42px;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:22px;">Top 3 <span style="color:#C8A24B;">global</span></div>${rankRows(d.topGlobal, "#C8A24B")}</div>
  </div>`;
  return chrome(inner, logoB64, `Top · Fecha ${d.roundOrder}`);
}

function xiChip(p: XIPlayer, flags: FlagMap, isCaptain: boolean): string {
  const c = POS[p.position];
  const flag = flags[p.code]?.b64 ?? "";
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:160px;">
    <div style="position:relative;width:88px;height:88px;border-radius:16px;background:${c.color};display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 #111827;border:3px solid #fff;">
      ${flag ? `<img src="${flag}" style="width:54px;height:36px;object-fit:cover;border-radius:4px;border:2px solid rgba(17,24,39,0.55);box-shadow:0 2px 4px rgba(0,0,0,0.45);filter:contrast(1.15) saturate(1.22) brightness(1.03);">` : ""}
      <span style="position:absolute;top:-12px;right:-12px;background:#111827;color:#fff;font-weight:800;font-size:20px;border-radius:9px;padding:2px 9px;border:2px solid #fff;">${p.points}</span>
      ${isCaptain ? `<span style="position:absolute;top:-12px;left:-12px;width:30px;height:30px;background:#C8A24B;color:#111827;font-weight:800;font-size:18px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:1px 1px 0 #111827;">C</span>` : ""}
    </div>
    <span style="font-weight:800;font-size:19px;color:#fff;text-transform:uppercase;text-align:center;line-height:1;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.name)}</span>
  </div>`;
}

export function xiHtml(d: RoundRecapData, flags: FlagMap, logoB64: string): string {
  // Capitán = el de mayor calificación base (a igualdad, el primero). El capitán
  // duplica solo su calificación → total = suma de puntos + calificación del capitán.
  const captain = d.mejorXI.reduce<XIPlayer | null>((best, p) => (!best || p.base > best.base ? p : best), null);
  const total = d.mejorXI.reduce((s, p) => s + p.points, 0) + (captain?.base ?? 0);
  const row = (ps: XIPlayer[]) =>
    `<div style="display:flex;justify-content:space-around;align-items:center;">${ps.map((p) => xiChip(p, flags, p === captain)).join("")}</div>`;
  const fwd = d.mejorXI.filter((p) => p.position === "FWD");
  const mid = d.mejorXI.filter((p) => p.position === "MID");
  const def = d.mejorXI.filter((p) => p.position === "DEF");
  const gk = d.mejorXI.filter((p) => p.position === "GK");
  const inner = `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-top:24px;">
      <div>
        <div style="font-weight:800;font-size:46px;text-transform:uppercase;letter-spacing:-0.02em;line-height:0.95;">Mejor <span style="color:#1B4FD8;">XI</span><br>de la fecha</div>
        <div style="margin-top:10px;display:inline-block;background:#1B4FD8;color:#fff;font-weight:800;font-size:20px;letter-spacing:0.06em;padding:5px 14px;border-radius:8px;">${d.formation}</div>
      </div>
      <div style="flex:0 0 auto;text-align:right;background:#111827;border-radius:12px;padding:12px 20px;box-shadow:4px 4px 0 rgba(17,24,39,0.45);">
        <div style="font-weight:700;font-size:15px;color:#C8A24B;text-transform:uppercase;letter-spacing:0.12em;">Total</div>
        <div style="font-weight:800;font-size:48px;color:#fff;line-height:1;">${total}<span style="font-size:22px;color:#9AA6BF;font-weight:700;"> pts</span></div>
      </div>
    </div>
    <div style="flex:1;margin-top:22px;background:#16713F;border:2px solid #111827;border-radius:18px;box-shadow:7px 7px 0 rgba(17,24,39,0.5);padding:36px 18px 20px;display:flex;flex-direction:column;justify-content:space-around;">
      ${row(fwd)}${row(mid)}${row(def)}${row(gk)}
    </div>
    <div style="margin-top:14px;display:flex;align-items:center;gap:10px;font-weight:600;font-size:18px;color:#374151;">
      <span style="width:26px;height:26px;flex:0 0 26px;background:#C8A24B;color:#111827;font-weight:800;font-size:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;">C</span>
      Capitán: duplica su calificación
    </div>`;
  return chrome(inner, logoB64, `Mejor XI · Fecha ${d.roundOrder}`);
}

// Demo para testear el render sin DB publicada: `--round-recap --demo`.
export const DEMO_ROUND_RECAP: RoundRecapData = {
  roundOrder: 1,
  topFecha: [
    { name: "El Codo de Costas", username: "mateo", points: 142 },
    { name: "Los Galácticos", username: "bruno_t", points: 138 },
    { name: "Sampaoli FC", username: "elsampa10", points: 131 },
  ],
  topGlobal: [
    { name: "El Codo de Costas", username: "mateo", points: 142 },
    { name: "Messi y los Pibes", username: "leo30", points: 140 },
    { name: "Los Galácticos", username: "bruno_t", points: 138 },
  ],
  formation: "4-3-3",
  mejorXI: [
    { name: "Simón", position: "GK", code: "ESP", points: 11, base: 8 },
    { name: "Hincapié", position: "DEF", code: "ECU", points: 14, base: 7 },
    { name: "Muharemović", position: "DEF", code: "BIH", points: 12, base: 7 },
    { name: "Pedri", position: "DEF", code: "ESP", points: 11, base: 7 },
    { name: "Dumfries", position: "DEF", code: "NED", points: 10, base: 6 },
    { name: "Hwang", position: "MID", code: "KOR", points: 21, base: 8 },
    { name: "Quiñones", position: "MID", code: "MEX", points: 19, base: 8 },
    { name: "Reijnders", position: "MID", code: "NED", points: 15, base: 7 },
    { name: "Balogun", position: "FWD", code: "USA", points: 21, base: 9 },
    { name: "Díaz", position: "FWD", code: "COL", points: 17, base: 8 },
    { name: "Williams", position: "FWD", code: "ESP", points: 14, base: 7 },
  ],
};
