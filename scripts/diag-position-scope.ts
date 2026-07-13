import "dotenv/config";
import { db } from "@/lib/db";
import { players, entryRoundPlayers, rounds, playerRoundPoints } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";

function slotPos(slot: string | null): string | null {
  if (!slot) return null;
  for (const p of slot.split("_")) if (["GK", "DEF", "MID", "FWD"].includes(p)) return p;
  return null;
}

async function main() {
  const rows = await db
    .select({ playerId: entryRoundPlayers.playerId, slot: entryRoundPlayers.slot })
    .from(entryRoundPlayers)
    .where(isNotNull(entryRoundPlayers.slot));
  const allPlayers = await db.select({ id: players.id, pos: players.position }).from(players);
  const posById = new Map(allPlayers.map((p) => [p.id, p.pos]));

  const slotPosByPlayer = new Map<number, Set<string>>();
  for (const r of rows) {
    const sp = slotPos(r.slot);
    if (!sp) continue;
    if (!slotPosByPlayer.has(r.playerId)) slotPosByPlayer.set(r.playerId, new Set());
    slotPosByPlayer.get(r.playerId)!.add(sp);
  }

  const transitions = new Map<string, number>();
  let changed = 0;
  for (const [pid, sps] of slotPosByPlayer) {
    const cur = posById.get(pid);
    if (!cur) continue;
    for (const sp of sps) {
      if (sp !== cur) {
        transitions.set(`${sp}→${cur}`, (transitions.get(`${sp}→${cur}`) ?? 0) + 1);
        changed++;
      }
    }
  }
  console.log("=== Transiciones (jugadores rosterados) ===");
  for (const [t, n] of [...transitions.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);
  console.log(`  TOTAL transiciones: ${changed}`);

  // ¿Algún arquero involucrado?
  const gkInvolved = [...transitions.keys()].filter((t) => t.includes("GK"));
  console.log("  Transiciones con GK:", gkInvolved.length ? gkInvolved : "ninguna");

  // Distribución global de posiciones actuales (para ver si hay sobre-representación de MID por el default)
  const dist = new Map<string, number>();
  for (const p of allPlayers) dist.set(p.pos, (dist.get(p.pos) ?? 0) + 1);
  console.log("\n=== Distribución de posiciones en TODA la DB ===", Object.fromEntries(dist));

  // Estado de las fechas
  const rs = await db.select({ order: rounds.order, name: rounds.name, status: rounds.status }).from(rounds);
  console.log("\n=== Fechas ===");
  for (const r of rs.sort((a, b) => a.order - b.order)) console.log(`  F${r.order} ${r.name}: ${r.status}`);

  // ¿Cuántos jugadores ya tienen puntos agregados (playerRoundPoints)?
  const prp = await db.select({ playerId: playerRoundPoints.playerId }).from(playerRoundPoints);
  console.log(`\nRegistros en playerRoundPoints: ${prp.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
