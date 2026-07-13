import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
  const result = await db.execute(sql`
    SELECT
      u.username,
      u.id as user_id,
      u.is_premium,
      COALESCE(er.changes_made, 0) as changes_made,
      COALESCE(er.pins_spent, 0) as pins_spent,
      r.name as round_name,
      r.sort_order as round_order,
      r.status as round_status
    FROM league_members lm
    JOIN leagues l ON l.id = lm.league_id
    JOIN users u ON u.id = lm.user_id
    LEFT JOIN entries e ON e.user_id = u.id
    LEFT JOIN rounds r ON r.sort_order = 4
    LEFT JOIN entry_rounds er ON er.entry_id = e.id AND er.round_id = r.id
    WHERE l.kind = 'golden_ticket'
      AND LOWER(u.username) NOT IN ('dino', 'ginza')
    ORDER BY u.username
  `);

  console.log("\n=== Copa members R16 changes (excl. Dino/Ginza) ===\n");
  for (const row of result.rows) {
    const changes = Number(row.changes_made);
    const pins = Number(row.pins_spent);
    const premium = row.is_premium;
    // Con 5 cambios gratuitos (en vez de 1), si hicieron >1 cambio gratis fue por la copa
    // Cambios gratis normales = 1, cambios gratis copa = 5
    // Cambios que exceden el free normal = changes - 1 (si > 1)
    const extraFreeUsed = Math.max(0, changes - 1); // cambios que solo pudieron ser gratis por la copa
    console.log(`${String(row.username).padEnd(20)} | changes: ${changes} | pins_spent: ${pins} | is_premium: ${premium} | extra_free_from_copa: ${extraFreeUsed}`);
  }
  console.log("\nRound status:", result.rows[0]?.round_status, "| Round:", result.rows[0]?.round_name);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
