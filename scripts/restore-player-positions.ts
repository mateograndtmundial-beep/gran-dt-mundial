import "dotenv/config";
import path from "node:path";
import { db } from "@/lib/db";
import { players, countries, entryRoundPlayers, playerMatchStats, matches, rounds } from "@/lib/db/schema";
import { eq, isNotNull, inArray } from "drizzle-orm";
import { normalizeName } from "@/lib/pricing/normalize";
import { streamCsv } from "./lib/csv";

/*
 * Restaura la posición ORIGINAL de los jugadores cuya posición fue pisada por un
 * `npm run seed` completo (~28/06). El seed reescribía players.position con la
 * clasificación de API-Football (que reclasifica extremos "Attacker"→"Midfielder"
 * y cae en default MID), cambiando en silencio la posición de jugadores que los
 * usuarios YA tenían en su equipo. (El seed ya quedó arreglado: no vuelve a pisar
 * position — ver scripts/seed.ts.)
 *
 * La posición original se reconstruye del SLOT histórico donde los usuarios pusieron
 * a cada jugador en el armador (el armador obliga a que el slot coincida con la
 * posición). Como el seed solo hace flip, la posición ACTUAL es la equivocada y
 * cualquier slot ≠ actual es la original. Se cruza además contra Transfermarkt
 * (data/players.csv) como segunda opinión.
 *
 *   npx tsx scripts/restore-player-positions.ts          # DRY (no escribe)
 *   npx tsx scripts/restore-player-positions.ts --apply  # aplica los UPDATE
 *
 * OJO (scoring): esto arregla players.position, pero NO recalcula puntajes ya
 * guardados. Después de aplicar hay que RE-SINCRONIZAR F4 (16vos, aún `open`) para
 * que playerMatchStats.fantasyPoints se recomputen con la posición corregida.
 * Caso conocido: Ismaïla Sarr (gol en F4 contado como MID). Ver el listado que
 * imprime al final ("YA tienen stats en F4").
 */

type Pos = "GK" | "DEF" | "MID" | "FWD";
const POSSET = ["GK", "DEF", "MID", "FWD"];
const APPLY = process.argv.includes("--apply");

function slotPos(slot: string | null): Pos | null {
  if (!slot) return null;
  for (const p of slot.split("_")) if (POSSET.includes(p)) return p as Pos;
  return null;
}

// Transfermarkt "position" → nuestra enum
function tmToPos(p: string): Pos | null {
  switch (p.trim().toLowerCase()) {
    case "goalkeeper": return "GK";
    case "defender": return "DEF";
    case "midfield": return "MID";
    case "attack": return "FWD";
    default: return null;
  }
}

async function main() {
  // ---- 1) Afectados + posición original (slot ≠ actual, la más frecuente) ----
  const erps = await db
    .select({ playerId: entryRoundPlayers.playerId, slot: entryRoundPlayers.slot })
    .from(entryRoundPlayers)
    .where(isNotNull(entryRoundPlayers.slot));
  const allPlayers = await db
    .select({ id: players.id, name: players.name, pos: players.position, club: players.club, birthYear: players.birthYear, countryId: players.countryId })
    .from(players);
  const pById = new Map(allPlayers.map((p) => [p.id, p]));

  const slotCounts = new Map<number, Map<Pos, number>>();
  for (const r of erps) {
    const sp = slotPos(r.slot);
    if (!sp) continue;
    if (!slotCounts.has(r.playerId)) slotCounts.set(r.playerId, new Map());
    const m = slotCounts.get(r.playerId)!;
    m.set(sp, (m.get(sp) ?? 0) + 1);
  }

  type Aff = { id: number; name: string; club: string | null; countryId: number; current: Pos; original: Pos; ambiguous: boolean };
  const affected: Aff[] = [];
  for (const [pid, counts] of slotCounts) {
    const p = pById.get(pid);
    if (!p) continue;
    const cur = p.pos as Pos;
    const others = [...counts.entries()].filter(([pos]) => pos !== cur).sort((a, b) => b[1] - a[1]);
    if (others.length === 0) continue;
    affected.push({
      id: pid, name: p.name, club: p.club, countryId: p.countryId,
      current: cur, original: others[0][0], ambiguous: others.length > 1,
    });
  }

  // ---- 2) Segunda opinión: Transfermarkt ----
  const tmByName = new Map<string, Pos>();
  try {
    await streamCsv(path.join(process.cwd(), "data", "players.csv"), (row) => {
      const pos = tmToPos(row.position ?? "");
      if (!pos) return;
      const key = normalizeName(row.name ?? "");
      if (key && !tmByName.has(key)) tmByName.set(key, pos);
    });
  } catch (e) {
    console.warn("(no se pudo leer data/players.csv, sigo sin cross-check TM):", (e as Error).message);
  }

  const countryIds = [...new Set(affected.map((a) => a.countryId))];
  const cs = await db.select({ id: countries.id, name: countries.name }).from(countries).where(inArray(countries.id, countryIds.length ? countryIds : [-1]));
  const countryName = new Map(cs.map((c) => [c.id, c.name]));

  affected.sort((a, b) => (countryName.get(a.countryId) ?? "").localeCompare(countryName.get(b.countryId) ?? "") || a.name.localeCompare(b.name));

  console.log(`\n=== PLAN DE RESTORE ${APPLY ? "(APLICANDO)" : "(DRY — no escribe)"} ===`);
  console.log(`Jugadores a corregir: ${affected.length}\n`);
  console.log("jugador (país) | actual→original | Transfermarkt | ¿coincide?");
  let tmAgree = 0, tmDisagree = 0, tmUnknown = 0, ambiguous = 0;
  for (const a of affected) {
    const tm = tmByName.get(normalizeName(a.name)) ?? null;
    let mark = "";
    if (!tm) { mark = "TM:? "; tmUnknown++; }
    else if (tm === a.original) { mark = "✓ TM=orig"; tmAgree++; }
    else { mark = `⚠ TM dice ${tm}`; tmDisagree++; }
    if (a.ambiguous) { mark += " ‼AMBIGUO"; ambiguous++; }
    console.log(`  ${a.name} (${countryName.get(a.countryId)}) | ${a.current}→${a.original} | ${tm ?? "-"} | ${mark}`);
  }
  console.log(`\nResumen cross-check TM: coincide=${tmAgree}, difiere=${tmDisagree}, sin dato=${tmUnknown}, ambiguos=${ambiguous}`);

  // ---- 3) Jugadores afectados que YA tienen stats en F4 (necesitan re-sync) ----
  const f4 = (await db.select().from(rounds).where(eq(rounds.order, 4)))[0];
  if (f4) {
    const f4matches = await db.select({ id: matches.id }).from(matches).where(eq(matches.roundId, f4.id));
    const f4ids = f4matches.map((m) => m.id);
    if (f4ids.length) {
      const affIds = affected.map((a) => a.id);
      const st = await db.select({ playerId: playerMatchStats.playerId, matchId: playerMatchStats.matchId, fp: playerMatchStats.fantasyPoints, goals: playerMatchStats.goals })
        .from(playerMatchStats).where(inArray(playerMatchStats.matchId, f4ids));
      const affF4 = st.filter((s) => affIds.includes(s.playerId));
      const nameById = new Map(affected.map((a) => [a.id, a]));
      console.log(`\n=== Afectados que YA tienen stats en F4 (recomputar al re-sincronizar): ${new Set(affF4.map((s) => s.playerId)).size} ===`);
      for (const s of affF4.filter((x) => x.goals > 0)) {
        const a = nameById.get(s.playerId)!;
        console.log(`  ⚠ ${a.name} (${countryName.get(a.countryId)}) ${a.current}→${a.original}: ${s.goals}g, fantasyPoints guardado ${s.fp} — re-sync obligatorio`);
      }
    }
  }

  // ---- 4) Aplicar ----
  if (!APPLY) {
    console.log("\nDRY. Nada escrito. Corré con --apply para aplicar (y después re-sincronizá F4).");
    return;
  }
  console.log("\nAplicando UPDATEs...");
  const ops = affected.map((a) => db.update(players).set({ position: a.original }).where(eq(players.id, a.id)));
  await db.batch(ops as unknown as [typeof ops[number], ...typeof ops[number][]]);
  console.log(`OK: ${affected.length} jugadores restaurados. Ahora RE-SINCRONIZÁ F4 para recomputar fantasyPoints.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
