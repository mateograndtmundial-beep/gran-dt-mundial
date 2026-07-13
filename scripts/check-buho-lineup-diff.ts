import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
  // Get Buho30's entry id
  const userRes = await db.execute(sql`
    SELECT u.id as user_id, e.id as entry_id
    FROM users u
    JOIN entries e ON e.user_id = u.id
    WHERE LOWER(u.username) = 'buho30'
  `);
  const { user_id, entry_id } = userRes.rows[0];
  console.log(`Buho30 user_id=${user_id} entry_id=${entry_id}\n`);

  // Get lineup for both rounds (3 = Fecha 3, 4 = 16vos)
  const lineupRes = await db.execute(sql`
    SELECT
      r.sort_order as round_order,
      r.name as round_name,
      er.formation,
      er.captain_player_id,
      er.coach_id,
      er.changes_made,
      er.pins_spent,
      p.id as player_id,
      p.name as player_name,
      p.position,
      c.name as country_name,
      erp.is_starter,
      erp.slot
    FROM entry_rounds er
    JOIN rounds r ON r.id = er.round_id
    JOIN entry_round_players erp ON erp.entry_round_id = er.id
    JOIN players p ON p.id = erp.player_id
    JOIN countries c ON c.id = p.country_id
    WHERE er.entry_id = ${entry_id}
      AND r.sort_order IN (3, 4)
    ORDER BY r.sort_order, erp.is_starter DESC, erp.slot
  `);

  // Also get coach names
  const coachRes = await db.execute(sql`
    SELECT co.id, co.name, ct.name as country
    FROM coaches co
    JOIN countries ct ON ct.id = co.country_id
  `);
  const coaches = Object.fromEntries(coachRes.rows.map((c) => [String(c.id), c]));

  const byRound: Record<number, typeof lineupRes.rows> = { 3: [], 4: [] };
  for (const row of lineupRes.rows) {
    byRound[Number(row.round_order)].push(row);
  }

  // Get meta per round (formation, captain, coach)
  const metaRes = await db.execute(sql`
    SELECT er.formation, er.captain_player_id, er.coach_id, r.sort_order
    FROM entry_rounds er
    JOIN rounds r ON r.id = er.round_id
    WHERE er.entry_id = ${entry_id} AND r.sort_order IN (3, 4)
  `);
  const meta: Record<number, { formation: string; captain_player_id: number; coach_id: number }> = {};
  for (const row of metaRes.rows) {
    meta[Number(row.sort_order)] = {
      formation: String(row.formation),
      captain_player_id: Number(row.captain_player_id),
      coach_id: Number(row.coach_id),
    };
  }

  function formatLineup(rows: typeof lineupRes.rows, order: number) {
    const m = meta[order];
    const coach = m ? coaches[String(m.coach_id)] : null;
    const starters = rows.filter((r) => r.is_starter).sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
    const subs = rows.filter((r) => !r.is_starter).sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
    const lines: string[] = [];
    if (m) {
      lines.push(`  Formación: ${m.formation} | DT: ${coach ? `${coach.name} (${coach.country})` : m.coach_id}`);
    }
    lines.push("  TITULARES:");
    for (const p of starters) {
      const isCap = m && Number(p.player_id) === m.captain_player_id;
      lines.push(`    [${String(p.slot).padEnd(8)}] ${String(p.position).padEnd(3)} ${String(p.player_name).padEnd(25)} (${p.country_name})${isCap ? " ©" : ""}`);
    }
    lines.push("  SUPLENTES:");
    for (const p of subs) {
      lines.push(`    [${String(p.slot).padEnd(8)}] ${String(p.position).padEnd(3)} ${String(p.player_name).padEnd(25)} (${p.country_name})`);
    }
    return lines.join("\n");
  }

  console.log("=== FECHA 3 (equipo base) ===");
  if (byRound[3].length === 0) {
    console.log("  ⚠️  Sin alineación guardada para Fecha 3");
  } else {
    console.log(formatLineup(byRound[3], 3));
  }

  console.log("\n=== 16VOS (equipo actual, con 5 cambios) ===");
  if (byRound[4].length === 0) {
    console.log("  ⚠️  Sin alineación guardada para 16vos");
  } else {
    console.log(formatLineup(byRound[4], 4));
  }

  // Diff
  if (byRound[3].length > 0 && byRound[4].length > 0) {
    const ids3 = new Set(byRound[3].map((r) => Number(r.player_id)));
    const ids4 = new Set(byRound[4].map((r) => Number(r.player_id)));

    const added = byRound[4].filter((r) => !ids3.has(Number(r.player_id)));
    const removed = byRound[3].filter((r) => !ids4.has(Number(r.player_id)));

    console.log("\n=== DIFERENCIAS (16vos vs Fecha 3) ===");
    if (added.length === 0 && removed.length === 0) {
      console.log("  Equipos idénticos.");
    } else {
      if (removed.length > 0) {
        console.log("  SALEN (están en Fecha 3, no en 16vos):");
        for (const p of removed) console.log(`    ❌ ${p.player_name} (${p.country_name}) [${p.position}]`);
      }
      if (added.length > 0) {
        console.log("  ENTRAN (están en 16vos, no en Fecha 3):");
        for (const p of added) console.log(`    ✅ ${p.player_name} (${p.country_name}) [${p.position}]`);
      }
    }

    // Captain / coach diff
    const m3 = meta[3];
    const m4 = meta[4];
    if (m3 && m4) {
      if (m3.captain_player_id !== m4.captain_player_id) {
        const cap3 = byRound[3].find((r) => Number(r.player_id) === m3.captain_player_id);
        const cap4 = byRound[4].find((r) => Number(r.player_id) === m4.captain_player_id);
        console.log(`  CAPITÁN: ${cap3?.player_name ?? m3.captain_player_id} → ${cap4?.player_name ?? m4.captain_player_id}`);
      }
      if (m3.coach_id !== m4.coach_id) {
        const co3 = coaches[String(m3.coach_id)];
        const co4 = coaches[String(m4.coach_id)];
        console.log(`  DT: ${co3?.name ?? m3.coach_id} → ${co4?.name ?? m4.coach_id}`);
      }
      if (m3.formation !== m4.formation) {
        console.log(`  FORMACIÓN: ${m3.formation} → ${m4.formation}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
