import "dotenv/config";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { users, entries, entryRounds, entryRoundPlayers, players, coaches, rounds } from "../lib/db/schema";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Falta el username. Uso: npm run get-user-teams <username>");
    process.exit(1);
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user.length) {
    console.error(`No se encontró el usuario "${username}".`);
    process.exit(1);
  }

  const userData = user[0];
  const userTeams = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, userData.id));

  console.log("\n════════════════════════════════════════");
  console.log(`Usuario: ${userData.username}`);
  console.log(`ID: ${userData.id}`);
  console.log(`Admin: ${userData.isAdmin ? "✓" : "✗"}`);
  console.log(`Premium: ${userData.isPremium ? "✓" : "✗"}`);
  console.log(`Creado: ${new Date(userData.createdAt).toLocaleString("es-AR")}`);
  console.log("════════════════════════════════════════");

  if (!userTeams.length) {
    console.log("\nNo tiene equipos registrados.");
    process.exit(0);
  }

  console.log(`\nEquipos (${userTeams.length}):\n`);

  for (const team of userTeams) {
    console.log(`▶ ${team.name}`);
    console.log(`  ID: ${team.id} | Puntos totales: ${team.totalPoints}`);
    console.log(`  Creado: ${new Date(team.createdAt).toLocaleString("es-AR")}`);

    // Obtener la última alineación (por fecha más reciente)
    const latestLineup = await db
      .select()
      .from(entryRounds)
      .where(eq(entryRounds.entryId, team.id))
      .orderBy(desc(entryRounds.roundId))
      .limit(1);

    if (!latestLineup.length) {
      console.log("  (Sin alineación registrada)\n");
      continue;
    }

    const lineup = latestLineup[0];
    const round = await db.select().from(rounds).where(eq(rounds.id, lineup.roundId)).limit(1);
    const roundName = round.length ? round[0].name : `Fecha ${lineup.roundId}`;

    console.log(`  📋 Alineación: ${roundName}`);
    console.log(`     Formación: ${lineup.formation} | Presupuesto: ${lineup.budgetUsed} | Puntos: ${lineup.points}`);

    // Obtener jugadores
    const rosterRaw = await db
      .select({
        slot: entryRoundPlayers.slot,
        isStarter: entryRoundPlayers.isStarter,
        playerId: entryRoundPlayers.playerId,
        playerName: players.name,
        position: players.position,
        price: players.price,
      })
      .from(entryRoundPlayers)
      .innerJoin(players, eq(entryRoundPlayers.playerId, players.id))
      .where(eq(entryRoundPlayers.entryRoundId, lineup.id));

    const starters = rosterRaw.filter((p) => p.isStarter);
    const subs = rosterRaw.filter((p) => !p.isStarter);

    // Ordenar titulares por posición: GK, DEF, MID, FWD
    const positionOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
    starters.sort((a, b) => (positionOrder[a.position] ?? 4) - (positionOrder[b.position] ?? 4));

    // Obtener DT
    const coach = lineup.coachId
      ? await db.select().from(coaches).where(eq(coaches.id, lineup.coachId)).limit(1)
      : null;

    // Obtener capitán
    const captain = lineup.captainPlayerId
      ? rosterRaw.find((p) => p.playerId === lineup.captainPlayerId)
      : null;

    // Mostrar titulares
    if (starters.length) {
      console.log(`\n     👥 TITULARES (${starters.length}):`);
      starters.forEach((p) => {
        const isCaptain = captain?.playerId === p.playerId;
        const badge = isCaptain ? " 🎖️ CAP" : "";
        console.log(`        ${p.position} | ${p.playerName} (${p.price})${badge}`);
      });
    }

    // Mostrar suplentes
    if (subs.length) {
      console.log(`\n     🔄 SUPLENTES (${subs.length}):`);
      subs.forEach((p) => {
        console.log(`        ${p.position} | ${p.playerName} (${p.price})`);
      });
    }

    // Mostrar DT
    if (coach && coach.length) {
      console.log(`\n     🏆 DT: ${coach[0].name}`);
    }

    console.log();
  }

  console.log("════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
