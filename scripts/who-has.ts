import { db } from "@/lib/db";
import { players, countries, entryRoundPlayers, entryRounds, entries, users, leagues, leagueMembers, rounds } from "@/lib/db/schema";
import { eq, inArray, ilike, and } from "drizzle-orm";

async function main() {
  const q = process.argv[2] ?? "mbapp";
  const found = await db.select({ id: players.id, name: players.name, pos: players.position, country: countries.name })
    .from(players).innerJoin(countries, eq(players.countryId, countries.id))
    .where(ilike(players.name, `%${q}%`));
  console.log("Candidatos:", found);
  const target = found.find((p) => p.country === "France") ?? found[0];
  if (!target) { console.log("No encontrado"); return; }
  console.log("\n=> Usando:", target);

  const f3 = (await db.select().from(rounds).where(eq(rounds.order, 3)))[0];
  const league = (await db.select().from(leagues).where(eq(leagues.code, "CXBEYQ")))[0];
  const members = await db.select().from(leagueMembers).where(eq(leagueMembers.leagueId, league.id));
  const memberUserIds = members.map((m) => m.userId);
  const memberUsers = await db.select().from(users).where(inArray(users.id, memberUserIds));
  const userById = new Map(memberUsers.map((u) => [u.id, u.username]));
  const memberEntries = await db.select().from(entries).where(inArray(entries.userId, memberUserIds));
  const entryById = new Map(memberEntries.map((e) => [e.id, e.userId]));
  const ers = await db.select().from(entryRounds)
    .where(and(inArray(entryRounds.entryId, memberEntries.map((e)=>e.id)), eq(entryRounds.roundId, f3.id)));
  const erInfo = new Map(ers.map((e) => [e.id, { entryId: e.entryId, cap: e.captainPlayerId }]));
  const erp = await db.select().from(entryRoundPlayers)
    .where(and(inArray(entryRoundPlayers.entryRoundId, ers.map((e)=>e.id)), eq(entryRoundPlayers.playerId, target.id)));

  console.log(`\n=== En Zonallaunior, ${target.name} en F3 ===`);
  if (!erp.length) { console.log("Nadie lo tiene."); return; }
  for (const r of erp) {
    const info = erInfo.get(r.entryRoundId)!;
    const uname = userById.get(entryById.get(info.entryId)!);
    const role = r.isStarter ? "TITULAR" : "SUPLENTE";
    const cap = info.cap === target.id ? " (CAPITÁN)" : "";
    console.log(`- ${uname}: ${role} [${r.slot}]${cap}`);
  }
}
main().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1);});
