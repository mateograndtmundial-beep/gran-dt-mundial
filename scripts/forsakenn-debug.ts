import { db } from '../lib/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  const user = await db.execute(sql`SELECT * FROM users WHERE username = 'Forsakenn'`);
  console.log('=== USER ===');
  console.log(JSON.stringify(user.rows, null, 2));

  if (!user.rows.length) { console.log('NO ENCONTRADO'); return; }
  const u = user.rows[0] as any;
  const userId = u.id;

  const entry = await db.execute(sql`SELECT * FROM entries WHERE user_id = ${userId}`);
  console.log('\n=== ENTRY ===');
  console.log(JSON.stringify(entry.rows, null, 2));

  const pins = await db.execute(sql`
    SELECT pt.id, pt.delta, pt.reason, pt.created_at, o.status as order_status, p.sku, p.price_ars
    FROM pin_transactions pt
    LEFT JOIN orders o ON pt.order_id = o.id
    LEFT JOIN products p ON o.product_id = p.id
    WHERE pt.user_id = ${userId}
    ORDER BY pt.created_at
  `);
  console.log('\n=== PIN TRANSACTIONS ===');
  console.log(JSON.stringify(pins.rows, null, 2));

  const orders = await db.execute(sql`
    SELECT o.id, o.status, o.amount, o.currency, o.provider, o.created_at, o.paid_at, p.sku, p.name, p.pins
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at
  `);
  console.log('\n=== ORDERS ===');
  console.log(JSON.stringify(orders.rows, null, 2));

  const entryId = (entry.rows[0] as any)?.id;
  if (entryId) {
    const rounds = await db.execute(sql`
      SELECT er.id, er.round_id, er.formation, er.captain_player_id, er.budget_used, er.points, er.pins_spent, er.changes_made, r.name as round_name, r.sort_order as round_order, r.status, r.type
      FROM entry_rounds er
      JOIN rounds r ON er.round_id = r.id
      WHERE er.entry_id = ${entryId}
      ORDER BY r.sort_order
    `);
    console.log('\n=== ENTRY ROUNDS ===');
    console.log(JSON.stringify(rounds.rows, null, 2));

    for (const round of rounds.rows as any[]) {
      const players = await db.execute(sql`
        SELECT erp.slot, erp.is_starter, pl.name, pl.position, pl.price, c.name as country
        FROM entry_round_players erp
        JOIN players pl ON erp.player_id = pl.id
        JOIN countries c ON pl.country_id = c.id
        WHERE erp.entry_round_id = ${round.id}
        ORDER BY erp.slot
      `);
      console.log(`\n--- Equipo ${round.round_name} ---`);
      console.log(JSON.stringify(players.rows, null, 2));
    }
  }

  const leagues = await db.execute(sql`
    SELECT lm.joined_at, lm.current_rank, l.name, l.code, l.kind, l.status
    FROM league_members lm
    JOIN leagues l ON lm.league_id = l.id
    WHERE lm.user_id = ${userId}
  `);
  console.log('\n=== LEAGUES ===');
  console.log(JSON.stringify(leagues.rows, null, 2));

  const balance = await db.execute(sql`SELECT COALESCE(SUM(delta), 0) as balance FROM pin_transactions WHERE user_id = ${userId}`);
  console.log('\n=== BALANCE PINES ===');
  console.log(JSON.stringify(balance.rows, null, 2));

  try {
    const log = await db.execute(sql`SELECT * FROM lineup_change_log WHERE user_id = ${userId} ORDER BY created_at`);
    console.log('\n=== LINEUP CHANGE LOG ===');
    console.log(JSON.stringify(log.rows, null, 2));
  } catch(e: any) { console.log('Sin lineup_change_log:', e.message); }
}

main().catch(console.error).finally(() => process.exit(0));
