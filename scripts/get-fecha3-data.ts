import "dotenv/config";
import { eq, desc, asc, and, inArray, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { rounds, entries, entryRounds, entryRoundPlayers, playerRoundPoints, players, countries, matches, playerMatchStats } from "../lib/db/schema";

async function main() {
  // Find fecha 3
  const fecha3 = (await db.select().from(rounds).where(eq(rounds.order, 3)).limit(1))[0];
  console.log("Fecha 3:", fecha3.name, "status:", fecha3.status);

  // Top 3 de la fecha (puntos en esta fecha específica)
  const topFecha = await db
    .select({
      entryName: entries.name,
      username: sql<string>`(SELECT username FROM users WHERE id = ${entries}.user_id)`,
      pts: entryRounds.points,
    })
    .from(entryRounds)
    .innerJoin(entries, eq(entries.id, entryRounds.entryId))
    .where(eq(entryRounds.roundId, fecha3.id))
    .orderBy(desc(entryRounds.points))
    .limit(10);

  console.log("\n=== TOP 10 DE LA FECHA ===");
  topFecha.forEach((r, i) => console.log(`${i+1}. ${r.entryName} @${r.username} — ${r.pts} pts`));

  // Top 3 Global
  const topGlobal = await db
    .select({
      entryName: entries.name,
      username: sql<string>`(SELECT username FROM users WHERE id = ${entries}.user_id)`,
      pts: entries.totalPoints,
    })
    .from(entries)
    .orderBy(desc(entries.totalPoints))
    .limit(10);

  console.log("\n=== TOP 10 GLOBAL ===");
  topGlobal.forEach((r, i) => console.log(`${i+1}. ${r.entryName} @${r.username} — ${r.pts} pts`));

  // Mejor XI de la fecha: jugadores con más puntos en la fecha 3
  const mejorXI = await db
    .select({
      playerName: players.name,
      position: players.position,
      pts: playerRoundPoints.points,
      countryCode: countries.code,
      countryName: countries.name,
    })
    .from(playerRoundPoints)
    .innerJoin(players, eq(players.id, playerRoundPoints.playerId))
    .innerJoin(countries, eq(countries.id, players.countryId))
    .where(eq(playerRoundPoints.roundId, fecha3.id))
    .orderBy(desc(playerRoundPoints.points))
    .limit(15);

  console.log("\n=== TOP 15 JUGADORES DE LA FECHA ===");
  mejorXI.forEach((r, i) => console.log(`${i+1}. ${r.playerName} (${r.position}) ${r.countryName} — ${r.pts} pts`));

  // Stats de la fecha: promedio, máx, distribución
  const stats = await db
    .select({
      avg: sql<number>`AVG(points)`,
      max: sql<number>`MAX(points)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(entryRounds)
    .where(eq(entryRounds.roundId, fecha3.id));
  
  console.log("\n=== STATS GENERALES ===");
  console.log("Promedio:", Math.round(Number(stats[0].avg)), "pts");
  console.log("Máximo:", stats[0].max, "pts");
  console.log("Equipos:", stats[0].count);

  // Top goleadores del torneo (para highlights)
  console.log("\n=== FIGURAS FECHA 3 (motm) ===");
  const motm = await db
    .select({
      playerName: players.name,
      countryName: countries.name,
      position: players.position,
    })
    .from(matches)
    .innerJoin(players, eq(players.id, matches.motmPlayerId!))
    .innerJoin(countries, eq(countries.id, players.countryId))
    .where(eq(matches.roundId, fecha3.id));
  
  motm.forEach(m => console.log(`  ${m.playerName} (${m.position}) — ${m.countryName}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
