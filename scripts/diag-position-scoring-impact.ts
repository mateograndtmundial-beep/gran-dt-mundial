import "dotenv/config";
import { db } from "@/lib/db";
import {
  players,
  countries,
  entryRoundPlayers,
  entryRounds,
  rounds,
  matches,
  playerMatchStats,
} from "@/lib/db/schema";
import { eq, isNotNull, inArray } from "drizzle-orm";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import type { Position } from "@/lib/game/config";

type Pos = "GK" | "DEF" | "MID" | "FWD";
const POSSET = ["GK", "DEF", "MID", "FWD"];

function slotPos(slot: string | null): Pos | null {
  if (!slot) return null;
  for (const p of slot.split("_")) if (POSSET.includes(p)) return p as Pos;
  return null;
}

async function main() {
  // ---- 1) Detectar afectados + posición original (slot ≠ actual) ----
  const erps = await db
    .select({ playerId: entryRoundPlayers.playerId, slot: entryRoundPlayers.slot })
    .from(entryRoundPlayers)
    .where(isNotNull(entryRoundPlayers.slot));
  const allPlayers = await db
    .select({ id: players.id, name: players.name, pos: players.position, countryId: players.countryId })
    .from(players);
  const pById = new Map(allPlayers.map((p) => [p.id, p]));

  // por jugador: conteo de posiciones vistas en slots
  const slotCounts = new Map<number, Map<Pos, number>>();
  for (const r of erps) {
    const sp = slotPos(r.slot);
    if (!sp) continue;
    if (!slotCounts.has(r.playerId)) slotCounts.set(r.playerId, new Map());
    const m = slotCounts.get(r.playerId)!;
    m.set(sp, (m.get(sp) ?? 0) + 1);
  }

  // afectados: la posición actual difiere de alguna posición histórica.
  // "original" = la posición histórica ≠ actual más frecuente.
  const affected = new Map<number, { name: string; countryId: number; current: Pos; original: Pos; ambiguous: boolean }>();
  for (const [pid, counts] of slotCounts) {
    const p = pById.get(pid);
    if (!p) continue;
    const cur = p.pos as Pos;
    const others = [...counts.entries()].filter(([pos]) => pos !== cur).sort((a, b) => b[1] - a[1]);
    if (others.length === 0) continue;
    affected.set(pid, {
      name: p.name,
      countryId: p.countryId,
      current: cur,
      original: others[0][0],
      ambiguous: others.length > 1,
    });
  }

  console.log(`Afectados (rosterados): ${affected.size}`);
  const ambig = [...affected.values()].filter((a) => a.ambiguous);
  if (ambig.length) console.log("  AMBIGUOS (más de una posición histórica ≠ actual):", ambig.map((a) => a.name));

  // ---- 2) Rounds F1..F4 y sus partidos ----
  const rs = await db.select().from(rounds);
  const roundByOrder = new Map(rs.map((r) => [r.order, r]));
  const targetOrders = [1, 2, 3, 4];
  const roundIds = targetOrders.map((o) => roundByOrder.get(o)?.id).filter(Boolean) as number[];

  const ms = await db.select().from(matches).where(inArray(matches.roundId, roundIds));
  const matchesByRound = new Map<number, typeof ms>();
  for (const m of ms) {
    if (!matchesByRound.has(m.roundId)) matchesByRound.set(m.roundId, []);
    matchesByRound.get(m.roundId)!.push(m);
  }
  const matchRound = new Map(ms.map((m) => [m.id, m.roundId]));
  const matchIds = ms.map((m) => m.id);

  console.log("\n=== Estado de partidos por fecha ===");
  for (const o of targetOrders) {
    const r = roundByOrder.get(o)!;
    const mm = matchesByRound.get(r.id) ?? [];
    const byStatus = mm.reduce((acc, m) => { acc[m.status] = (acc[m.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    console.log(`  F${o} ${r.name} [${r.status}]: ${mm.length} partidos`, byStatus);
  }

  // ---- 3) Stats de los afectados en esos partidos ----
  const affectedIds = [...affected.keys()];
  const stats = matchIds.length
    ? await db.select().from(playerMatchStats)
        .where(inArray(playerMatchStats.matchId, matchIds))
    : [];
  const affStats = stats.filter((s) => affected.has(s.playerId));

  console.log(`\nStats de afectados en F1-F4: ${affStats.length} filas`);

  // recompute helper
  function recompute(s: typeof affStats[number], pos: Pos): number {
    return calcularPuntos({
      position: pos as Position,
      minutes: s.minutes,
      rating: s.rating,
      goals: s.goals,
      penaltyGoals: s.penaltyGoals,
      assists: s.assists,
      yellow: s.yellow,
      red: s.red,
      ownGoals: s.ownGoals,
      penaltiesSaved: s.penaltiesSaved,
      penaltiesMissed: s.penaltiesMissed,
      goalsConceded: s.goalsConceded,
      cleanSheet: s.cleanSheet,
      isMotm: s.isMotm,
      isCaptain: false,
    }).total;
  }

  const orderOfRound = new Map(rs.map((r) => [r.id, r.order]));
  const rows: {
    round: number; name: string; country: string; cur: Pos; orig: Pos;
    stored: number; withCur: number; withOrig: number; scoredWith: string; deltaIfFixed: number; min: number; goals: number; rating: number | null;
  }[] = [];

  const countryIds = [...new Set([...affected.values()].map((a) => a.countryId))];
  const cs = await db.select({ id: countries.id, name: countries.name }).from(countries).where(inArray(countries.id, countryIds));
  const countryName = new Map(cs.map((c) => [c.id, c.name]));

  for (const s of affStats) {
    const a = affected.get(s.playerId)!;
    const withCur = recompute(s, a.current);
    const withOrig = recompute(s, a.original);
    const stored = Number(s.fantasyPoints);
    const eq = (x: number, y: number) => Math.abs(x - y) < 0.001;
    let scoredWith = "?";
    if (eq(stored, withCur) && eq(stored, withOrig)) scoredWith = "igual (pos no cambia pts)";
    else if (eq(stored, withCur)) scoredWith = "ACTUAL (mal)";
    else if (eq(stored, withOrig)) scoredWith = "original (ok)";
    else scoredWith = "otra";
    rows.push({
      round: orderOfRound.get(matchRound.get(s.matchId)!)!,
      name: a.name,
      country: countryName.get(a.countryId) ?? "?",
      cur: a.current, orig: a.original,
      stored, withCur, withOrig, scoredWith,
      deltaIfFixed: withOrig - stored,
      min: s.minutes, goals: s.goals, rating: s.rating,
    });
  }

  rows.sort((x, y) => x.round - y.round || y.deltaIfFixed - x.deltaIfFixed || Math.abs(y.deltaIfFixed) - Math.abs(x.deltaIfFixed));

  console.log("\n=== Detalle por jugador/partido (F1-F4) ===");
  console.log("fecha | jugador (país) | orig→actual | min | goles | rating | guardado | c/actual | c/orig | puntuado con | Δ si se corrige");
  for (const r of rows) {
    console.log(
      `F${r.round} | ${r.name} (${r.country}) | ${r.orig}→${r.cur} | ${r.min}' | ${r.goals}g | ${r.rating ?? "-"} | ` +
      `${r.stored} | ${r.withCur} | ${r.withOrig} | ${r.scoredWith} | ${r.deltaIfFixed >= 0 ? "+" : ""}${r.deltaIfFixed.toFixed(1)}`
    );
  }

  // ---- Resumen ----
  const mism = rows.filter((r) => r.scoredWith === "ACTUAL (mal)");
  const byRound = new Map<number, number>();
  for (const r of rows) byRound.set(r.round, (byRound.get(r.round) ?? 0) + 1);
  console.log("\n=== RESUMEN ===");
  console.log("Filas afectadas por fecha:", Object.fromEntries([...byRound.entries()].sort()));
  console.log(`Filas donde el puntaje YA se calculó con la posición ACTUAL (posible error): ${mism.length}`);
  if (mism.length) {
    const affPlayers = [...new Set(mism.map((r) => `${r.name} (F${r.round}, Δ ${(r.withOrig - r.stored).toFixed(1)})`))];
    for (const p of affPlayers) console.log("   -", p);
  }

  // F4 específico
  const f4 = rows.filter((r) => r.round === 4);
  console.log(`\nAfectados que YA jugaron en F4 (16vos): ${new Set(f4.map((r) => r.name)).size}`);
  for (const r of f4) console.log(`   - ${r.name} (${r.country}) ${r.orig}→${r.cur}: ${r.min}' ${r.goals}g rating ${r.rating ?? "-"} | pts guardado ${r.stored} (c/orig ${r.withOrig}, Δ ${(r.withOrig - r.stored).toFixed(1)})`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
