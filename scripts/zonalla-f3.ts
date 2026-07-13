import { db } from "@/lib/db";
import {
  rounds, matches, playerMatchStats, players,
  entries, entryRounds, entryRoundPlayers,
  users, coaches, leagues, leagueMembers,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { SCORING } from "@/lib/game/config";
import { calcularPuntosTecnico } from "@/lib/scoring/calcular-puntos";
import {
  computeEffectiveStarters,
  type ScoringContext,
  type LineupSlot,
} from "@/lib/scoring/puntos-equipo";

const LEAGUE_CODE = "CXBEYQ"; // Zonallaunior

function roundTenths(values: number[]): number {
  const t = values.reduce((s, v) => s + Math.round(v * 10), 0);
  return t / 10;
}

async function getScoringContext(roundId: number): Promise<{ ctx: ScoringContext; nFinished: number; nTotal: number }> {
  const ms = await db.select().from(matches).where(eq(matches.roundId, roundId));
  const finished = ms.filter((m) => m.status === "finished");
  const finishedIds = finished.map((m) => m.id);

  const pts = new Map<number, number>();
  const base = new Map<number, number>();
  const minutesByPlayer = new Map<number, number>();

  if (finishedIds.length) {
    const stats = await db.select().from(playerMatchStats).where(inArray(playerMatchStats.matchId, finishedIds));
    for (const s of stats) {
      pts.set(s.playerId, (pts.get(s.playerId) ?? 0) + s.fantasyPoints);
      minutesByPlayer.set(s.playerId, (minutesByPlayer.get(s.playerId) ?? 0) + s.minutes);
      if (s.minutes >= SCORING.minMinutes && s.rating != null) {
        base.set(s.playerId, (base.get(s.playerId) ?? 0) + Math.round(s.rating));
      }
    }
  }

  const countryResult = new Map<number, "win" | "loss" | "draw">();
  for (const m of finished) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const h = m.homeScore, a = m.awayScore;
    if (m.homeCountryId != null) countryResult.set(m.homeCountryId, h > a ? "win" : h < a ? "loss" : "draw");
    if (m.awayCountryId != null) countryResult.set(m.awayCountryId, a > h ? "win" : a < h ? "loss" : "draw");
  }

  const coachRows = await db.select().from(coaches);
  const coachCountry = new Map<number, number>();
  for (const c of coachRows) coachCountry.set(c.id, c.countryId);

  const played = (pid: number) => (minutesByPlayer.get(pid) ?? 0) >= SCORING.minMinutes;

  return {
    ctx: { pts, base, played, coachCountry, countryResult },
    nFinished: finished.length,
    nTotal: ms.length,
  };
}

function computeEntry(lineup: LineupSlot[], captainPlayerId: number | null, coachId: number | null, ctx: ScoringContext) {
  const starters = lineup.filter((l) => l.isStarter);
  const effectiveOf = computeEffectiveStarters(lineup, ctx.played);
  const terms: number[] = [];
  let scoring = 0;
  for (const st of starters) {
    const eff = effectiveOf.get(st.playerId) ?? st.playerId;
    const p = ctx.pts.get(eff) ?? 0;
    terms.push(p);
    if (p !== 0) scoring++;
  }
  if (captainPlayerId != null) terms.push(ctx.base.get(captainPlayerId) ?? 0);
  if (coachId != null) {
    const cc = ctx.coachCountry.get(coachId);
    const res = cc != null ? ctx.countryResult.get(cc) : undefined;
    if (res) terms.push(calcularPuntosTecnico(res));
  }
  return { points: roundTenths(terms), playersScoring: scoring };
}

async function main() {
  const allRounds = await db.select().from(rounds);
  allRounds.sort((a, b) => a.order - b.order);
  console.log("Rounds:", allRounds.map((r) => `${r.order}:${r.name}[${r.status}]`).join("  "));

  // F3 = order 3 (3a fecha de grupos)
  const f3 = allRounds.find((r) => r.order === 3)!;
  const prior = allRounds.filter((r) => r.order < 3);

  // League members
  const league = (await db.select().from(leagues).where(eq(leagues.code, LEAGUE_CODE)))[0];
  const members = await db.select().from(leagueMembers).where(eq(leagueMembers.leagueId, league.id));
  const memberUserIds = members.map((m) => m.userId);

  const memberUsers = await db.select().from(users).where(inArray(users.id, memberUserIds));
  const userById = new Map(memberUsers.map((u) => [u.id, u]));
  const memberEntries = await db.select().from(entries).where(inArray(entries.userId, memberUserIds));
  const entryIds = memberEntries.map((e) => e.id);

  // entryRounds for all relevant rounds
  const allRoundIds = [...prior.map((r) => r.id), f3.id];
  const ers = await db.select().from(entryRounds).where(inArray(entryRounds.entryId, entryIds));
  const ersInScope = ers.filter((e) => allRoundIds.includes(e.roundId));
  const erIds = ersInScope.map((e) => e.id);
  const erp = await db.select().from(entryRoundPlayers).where(inArray(entryRoundPlayers.entryRoundId, erIds));
  const lineupByEr = new Map<number, LineupSlot[]>();
  for (const r of erp) {
    if (!lineupByEr.has(r.entryRoundId)) lineupByEr.set(r.entryRoundId, []);
    lineupByEr.get(r.entryRoundId)!.push({ playerId: r.playerId, isStarter: r.isStarter, slot: r.slot });
  }
  const erByEntryRound = new Map<string, typeof ersInScope[number]>();
  for (const e of ersInScope) erByEntryRound.set(`${e.entryId}:${e.roundId}`, e);

  // contexts
  const ctxByRound = new Map<number, ScoringContext>();
  let f3info = { nFinished: 0, nTotal: 0 };
  for (const r of allRounds.filter((r) => allRoundIds.includes(r.id))) {
    const { ctx, nFinished, nTotal } = await getScoringContext(r.id);
    ctxByRound.set(r.id, ctx);
    if (r.id === f3.id) f3info = { nFinished, nTotal };
  }

  type Row = { name: string; prior: number; f3: number; total: number; scoring: number };
  const out: Row[] = [];
  for (const e of memberEntries) {
    const u = userById.get(e.userId);
    const name = u?.username ?? `user${e.userId}`;
    let priorPts = 0;
    for (const r of prior) {
      const er = erByEntryRound.get(`${e.id}:${r.id}`);
      if (!er) continue;
      const lu = lineupByEr.get(er.id) ?? [];
      priorPts += computeEntry(lu, er.captainPlayerId, er.coachId, ctxByRound.get(r.id)!).points;
    }
    priorPts = roundTenths([priorPts]);
    const erF3 = erByEntryRound.get(`${e.id}:${f3.id}`);
    let f3pts = 0, scoring = 0;
    if (erF3) {
      const res = computeEntry(lineupByEr.get(erF3.id) ?? [], erF3.captainPlayerId, erF3.coachId, ctxByRound.get(f3.id)!);
      f3pts = res.points; scoring = res.playersScoring;
    }
    out.push({ name, prior: priorPts, f3: f3pts, total: roundTenths([priorPts, f3pts]), scoring });
  }

  console.log(`\n=== ZONALLAUNIOR — Fecha 3 EN VIVO (${f3info.nFinished}/${f3info.nTotal} partidos jugados) ===\n`);
  console.log("--- Ranking por F3 ---");
  out.slice().sort((a, b) => b.f3 - a.f3).forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${r.name.padEnd(20)} F3=${String(r.f3).padStart(6)}  (${r.scoring}/11)`);
  });
  console.log("\n--- Ranking GENERAL (acumulado F1+F2+F3 en vivo) ---");
  out.slice().sort((a, b) => b.total - a.total).forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${r.name.padEnd(20)} F1+F2=${String(r.prior).padStart(6)}  F3=${String(r.f3).padStart(6)}  TOTAL=${String(r.total).padStart(7)}`);
  });
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
