import "dotenv/config";
import { count } from "drizzle-orm";
import { db } from "../lib/db";
import { countries, players, coaches, matches, rounds } from "../lib/db/schema";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function c(t: any) {
  return (await db.select({ n: count() }).from(t))[0].n;
}

async function main() {
  console.log("selecciones:", await c(countries));
  console.log("jugadores: ", await c(players));
  console.log("técnicos:  ", await c(coaches));
  console.log("fechas:    ", await c(rounds));
  console.log("partidos:  ", await c(matches));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
