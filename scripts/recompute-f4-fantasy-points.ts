import "dotenv/config";
import { db } from "@/lib/db";
import { players, countries, entryRoundPlayers, playerMatchStats, matches, rounds } from "@/lib/db/schema";
import { eq, isNotNull, inArray } from "drizzle-orm";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import type { Position } from "@/lib/game/config";

/*
 * Recalcula playerMatchStats.fantasyPoints de F4 (16vos) para los jugadores cuya
 * posición fue restaurada (scripts/restore-player-positions.ts), a partir de los
 * stats crudos YA guardados + la posición ACTUAL de la DB (ya corregida). Sin
 * capitán (así se guarda en el sync). Salta filas manualEdit. F4 no está publicada,
 * así que no hay playerRoundPoints ni entries.totalPoints que tocar todavía.
 *
 *   npx tsx scripts/recompute-f4-fantasy-points.ts          # DRY
 *   npx tsx scripts/recompute-f4-fantasy-points.ts --apply  # aplica
 */

type Pos = "GK" | "DEF" | "MID" | "FWD";
const POSSET = ["GK", "DEF", "MID", "FWD"];
const APPLY = process.argv.includes("--apply");

function slotPos(slot: string | null): Pos | null {
  if (!slot) return null;
  for (const p of slot.split("_")) if (POSSET.includes(p)) return p as Pos;
  return null;
}

async function main() {
  // Jugadores afectados = los que tienen algún slot histórico ≠ su posición... pero
  // como YA restauramos, el criterio ahora es: jugadores rosterados (universo seguro).
  // Recomputamos TODOS los rosterados de F4: es idempotente (solo cambia lo que estaba mal).
  const erps = await db
    .select({ playerId: entryRoundPlayers.playerId, slot: entryRoundPlayers.slot })
    .from(entryRoundPlayers)
    .where(isNotNull(entryRoundPlayers.slot));
  const rosterIds = [...new Set(erps.map((e) => e.playerId))];

  const f4 = (await db.select().from(rounds).where(eq(rounds.order, 4)))[0];
  if (!f4) { console.log("No hay F4"); return; }
  const f4matches = await db.select({ id: matches.id }).from(matches).where(eq(matches.roundId, f4.id));
  const f4ids = f4matches.map((m) => m.id);
  if (!f4ids.length) { console.log("F4 sin partidos"); return; }

  const st = await db.select().from(playerMatchStats).where(inArray(playerMatchStats.matchId, f4ids));
  const rosterSet = new Set(rosterIds);
  const rows = st.filter((s) => rosterSet.has(s.playerId));

  const pl = await db.select({ id: players.id, name: players.name, pos: players.position, countryId: players.countryId }).from(players).where(inArray(players.id, rows.map((r) => r.playerId)));
  const pById = new Map(pl.map((p) => [p.id, p]));
  const cs = await db.select({ id: countries.id, name: countries.name }).from(countries);
  const cName = new Map(cs.map((c) => [c.id, c.name]));

  const changes: { id: number; name: string; country: string; pos: string; from: number; to: number }[] = [];
  const ops = [];
  for (const s of rows) {
    if (s.manualEdit) continue;
    const p = pById.get(s.playerId);
    if (!p) continue;
    const recomputed = calcularPuntos({
      position: p.pos as Position,
      minutes: s.minutes, rating: s.rating, goals: s.goals, penaltyGoals: s.penaltyGoals,
      assists: s.assists, yellow: s.yellow, red: s.red, ownGoals: s.ownGoals,
      penaltiesSaved: s.penaltiesSaved, penaltiesMissed: s.penaltiesMissed,
      goalsConceded: s.goalsConceded, cleanSheet: s.cleanSheet, isMotm: s.isMotm, isCaptain: false,
    }).total;
    const stored = Number(s.fantasyPoints);
    if (Math.abs(recomputed - stored) > 0.001) {
      changes.push({ id: s.id, name: p.name, country: cName.get(p.countryId) ?? "?", pos: p.pos, from: stored, to: recomputed });
      ops.push(db.update(playerMatchStats).set({ fantasyPoints: recomputed }).where(eq(playerMatchStats.id, s.id)));
    }
  }

  console.log(`\n=== Recompute F4 ${APPLY ? "(APLICANDO)" : "(DRY)"} ===`);
  console.log(`Filas rosteradas revisadas: ${rows.length} | a corregir: ${changes.length}\n`);
  for (const c of changes) console.log(`  ${c.name} (${c.country}) [${c.pos}]: ${c.from} → ${c.to}`);

  if (!APPLY) { console.log("\nDRY. Nada escrito."); return; }
  if (ops.length) {
    await db.batch(ops as unknown as [typeof ops[number], ...typeof ops[number][]]);
    console.log(`\nOK: ${ops.length} filas de fantasyPoints corregidas.`);
  } else {
    console.log("\nNada que corregir.");
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
