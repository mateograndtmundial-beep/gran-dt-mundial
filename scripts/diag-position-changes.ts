import "dotenv/config";
import { db } from "@/lib/db";
import { players, countries, entryRoundPlayers } from "@/lib/db/schema";
import { eq, ilike, isNotNull } from "drizzle-orm";

// Puntos por gol según puesto (lib/game/config SCORING)
const GOAL_BY_POS: Record<string, number> = { GK: 12, DEF: 9, MID: 6, FWD: 4 };

function slotPos(slot: string | null): string | null {
  if (!slot) return null;
  // formatos: "DEF_2", "SUB_GK", "FWD_1", "SUB_FWD"
  const parts = slot.split("_");
  for (const p of parts) if (["GK", "DEF", "MID", "FWD"].includes(p)) return p;
  return null;
}

async function main() {
  // 1) Doku
  const doku = await db
    .select({ id: players.id, name: players.name, pos: players.position, country: countries.name })
    .from(players)
    .innerJoin(countries, eq(players.countryId, countries.id))
    .where(ilike(players.name, "%doku%"));
  console.log("=== Jeremy Doku ===");
  console.log(doku);
  for (const d of doku) {
    console.log(
      `  ${d.name}: posición actual en DB = ${d.pos}. Gol como ${d.pos} = ${GOAL_BY_POS[d.pos]} pts; como FWD = ${GOAL_BY_POS.FWD} pts.`
    );
  }

  // 2) Detectar cambios de posición: slot histórico vs posición actual
  console.log("\n=== Escaneando entryRoundPlayers (jugadores rosterados) ===");
  const rows = await db
    .select({
      playerId: entryRoundPlayers.playerId,
      slot: entryRoundPlayers.slot,
    })
    .from(entryRoundPlayers)
    .where(isNotNull(entryRoundPlayers.slot));

  // posición actual de todos los jugadores rosterados
  const rosterIds = [...new Set(rows.map((r) => r.playerId))];
  const allPlayers = await db
    .select({ id: players.id, name: players.name, pos: players.position, countryId: players.countryId })
    .from(players);
  const posById = new Map(allPlayers.map((p) => [p.id, p]));

  // por jugador, juntar las posiciones que aparecen en sus slots históricos
  const slotPosByPlayer = new Map<number, Set<string>>();
  for (const r of rows) {
    const sp = slotPos(r.slot);
    if (!sp) continue;
    if (!slotPosByPlayer.has(r.playerId)) slotPosByPlayer.set(r.playerId, new Set());
    slotPosByPlayer.get(r.playerId)!.add(sp);
  }

  const changed: { name: string; historic: string[]; current: string }[] = [];
  for (const [pid, slotPositions] of slotPosByPlayer) {
    const cur = posById.get(pid)?.pos;
    if (!cur) continue;
    // si alguna posición histórica difiere de la actual => cambió
    if (![...slotPositions].every((s) => s === cur)) {
      changed.push({ name: posById.get(pid)?.name ?? String(pid), historic: [...slotPositions], current: cur });
    }
  }

  console.log(`Jugadores rosterados con posición cambiada vs su slot histórico: ${changed.length} (de ${rosterIds.length} rosterados)`);
  for (const c of changed) {
    console.log(`  - ${c.name}: slot histórico=${c.historic.join("/")} → posición actual=${c.current}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
