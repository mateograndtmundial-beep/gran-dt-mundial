import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
  // --- 1. Buho30: entry_round ids for rounds 3 and 4 ---
  const buhoRes = await db.execute(sql`
    SELECT u.id as user_id, e.id as entry_id
    FROM users u
    JOIN entries e ON e.user_id = u.id
    WHERE LOWER(u.username) = 'buho30'
  `);
  const { entry_id } = buhoRes.rows[0];

  const erRes = await db.execute(sql`
    SELECT er.id as er_id, r.sort_order
    FROM entry_rounds er
    JOIN rounds r ON r.id = er.round_id
    WHERE er.entry_id = ${entry_id} AND r.sort_order IN (3, 4)
  `);
  const er3 = erRes.rows.find((r) => Number(r.sort_order) === 3);
  const er4 = erRes.rows.find((r) => Number(r.sort_order) === 4);

  if (!er3 || !er4) throw new Error("No se encontraron entry_rounds para Buho30");

  const er3Id = Number(er3.er_id);
  const er4Id = Number(er4.er_id);

  console.log(`Buho30 entry_id=${entry_id} | er_round3=${er3Id} | er_round4=${er4Id}`);

  // --- 2. Leer meta de Fecha 3 ---
  const meta3Res = await db.execute(sql`
    SELECT formation, captain_player_id, coach_id
    FROM entry_rounds WHERE id = ${er3Id}
  `);
  const meta3 = meta3Res.rows[0];

  // --- 3. Leer jugadores de Fecha 3 ---
  const players3Res = await db.execute(sql`
    SELECT player_id, is_starter, slot
    FROM entry_round_players WHERE entry_round_id = ${er3Id}
  `);

  console.log(`Fecha 3: ${players3Res.rows.length} jugadores, formación ${meta3.formation}, capitán ${meta3.captain_player_id}`);

  // --- 4. Batch atómico ---
  await db.batch([
    // 4a. Actualizar meta de er_round4 = igual que er_round3 + resetear cambios
    db.execute(sql`
      UPDATE entry_rounds
      SET
        formation = ${meta3.formation},
        captain_player_id = ${Number(meta3.captain_player_id)},
        coach_id = ${Number(meta3.coach_id)},
        changes_made = 0,
        pins_spent = 0
      WHERE id = ${er4Id}
    `),

    // 4b. Borrar jugadores actuales de 16vos
    db.execute(sql`
      DELETE FROM entry_round_players WHERE entry_round_id = ${er4Id}
    `),
  ]);

  // 4c. Insertar jugadores de Fecha 3 en 16vos
  for (const p of players3Res.rows) {
    await db.execute(sql`
      INSERT INTO entry_round_players (entry_round_id, player_id, is_starter, slot)
      VALUES (${er4Id}, ${Number(p.player_id)}, ${Boolean(p.is_starter)}, ${String(p.slot)})
    `);
  }

  console.log("✅ Buho30: lineup de 16vos restaurado al de Fecha 3, changes_made=0, pins_spent=0");

  // --- 5. Resetear changes_made a 0 para los demás miembros de la copa (excl. Dino, Ginza, Buho30) ---
  const otherRes = await db.execute(sql`
    UPDATE entry_rounds er
    SET changes_made = 0
    FROM entries e, users u, league_members lm, leagues l, rounds r
    WHERE er.entry_id = e.id
      AND e.user_id = u.id
      AND lm.user_id = u.id
      AND lm.league_id = l.id
      AND er.round_id = r.id
      AND r.sort_order = 4
      AND l.kind = 'golden_ticket'
      AND LOWER(u.username) NOT IN ('dino', 'ginza', 'buho30')
    RETURNING u.username, er.changes_made
  `);

  console.log(`✅ Otros miembros de la copa reseteados: ${otherRes.rows.length} filas`);
  for (const row of otherRes.rows) {
    console.log(`   ${row.username}: changes_made=${row.changes_made}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
