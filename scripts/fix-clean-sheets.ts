import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, players, playerMatchStats, rounds } from "@/lib/db/schema";
import { apiFootball } from "@/lib/api-football/client";
import { parseMatchTiming, concededWhileOnPitch } from "@/lib/api-football/timing";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import { chunkedBatch, type BatchOp } from "@/lib/db/batch";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Corrección puntual de la VALLA INVICTA a nivel jugador sobre datos ya
 * sincronizados (sin re-sincronizar todo el partido). Recalcula, a partir de los
 * eventos de API-Football, los goles que recibió cada jugador MIENTRAS estuvo en
 * cancha y, si cambia, actualiza SOLO `cleanSheet`, `goalsConceded` y
 * `fantasyPoints` de esa fila. No toca ningún otro dato.
 *
 * Seguridad:
 *  - Aborta si hay alguna fecha PUBLICADA (no tocamos scoring ya consolidado).
 *  - Saltea filas `manualEdit` (correcciones manuales del admin), salvo
 *    `--include-manual`, que corrige SOLO la valla/recibidos/puntos de esas filas
 *    sin tocar el resto de sus stats cargadas a mano.
 *  - Dry-run por defecto; escribe solo con `--apply`.
 *
 * Uso:  npx tsx scripts/fix-clean-sheets.ts                      (simula)
 *       npx tsx scripts/fix-clean-sheets.ts --apply              (escribe, respeta manualEdit)
 *       npx tsx scripts/fix-clean-sheets.ts --include-manual --apply (incluye manualEdit)
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const includeManual = process.argv.includes("--include-manual");

  // Guarda: si una fecha ya se publicó, los puntos pasaron a entries/playerRoundPoints.
  // Una corrección suelta de playerMatchStats dejaría el ranking inconsistente → abortar.
  const published = await db.select({ id: rounds.id, name: rounds.name }).from(rounds).where(eq(rounds.status, "published"));
  if (published.length) {
    console.error(`ABORTADO: hay ${published.length} fecha(s) publicada(s): ${published.map((r) => r.name).join(", ")}.`);
    console.error("Corregir vallas tras publicar requiere re-publicar (no cubierto por este script).");
    process.exit(1);
  }

  const finished = await db.select().from(matches).where(eq(matches.status, "finished"));
  const allPlayers = await db
    .select({ id: players.id, name: players.name, apiId: players.apiFootballId, position: players.position, countryId: players.countryId })
    .from(players);
  const pmap = new Map(allPlayers.map((p) => [p.id, p]));

  const ops: BatchOp[] = [];
  let scanned = 0;
  let skippedManual = 0;
  let changed = 0;
  let pointsDelta = 0;
  const log: string[] = [];

  for (const m of finished) {
    if (!m.apiFootballFixtureId) continue;
    const fx: any[] = (await apiFootball.fixtureById(m.apiFootballFixtureId)) as any;
    const events: any[] = (await apiFootball.fixtureEvents(m.apiFootballFixtureId)) as any;
    const f = fx?.[0];
    const homeTeamApi = f?.teams?.home?.id;
    const homeScore = f?.goals?.home ?? m.homeScore ?? 0;
    const awayScore = f?.goals?.away ?? m.awayScore ?? 0;

    const timing = parseMatchTiming(events ?? [], homeTeamApi);
    const concededFinal = { home: awayScore, away: homeScore };
    const timingOk = {
      home: timing.concededMinutes.home.length === concededFinal.home,
      away: timing.concededMinutes.away.length === concededFinal.away,
    };

    const stored = await db.select().from(playerMatchStats).where(eq(playerMatchStats.matchId, m.id));
    for (const s of stored) {
      const p = pmap.get(s.playerId);
      if (!p) continue;
      scanned++;
      if (s.manualEdit && !includeManual) {
        skippedManual++;
        continue;
      }

      const isHome = p.countryId === m.homeCountryId;
      const side = isHome ? "home" : "away";
      let newConceded: number;
      if (!timingOk[side]) {
        newConceded = concededFinal[side]; // fallback a nivel equipo si los eventos no cuadran
      } else {
        const iv = (p.apiId != null ? timing.intervals.get(p.apiId) : undefined) ?? { enter: 0, exit: Infinity };
        newConceded = concededWhileOnPitch(iv, timing.concededMinutes[side]);
      }
      const newCleanSheet = newConceded === 0;
      const newGoalsConceded = p.position === "GK" ? newConceded : 0;

      const newFantasy = calcularPuntos({
        position: p.position,
        minutes: s.minutes,
        rating: s.rating,
        goals: s.goals,
        penaltyGoals: s.penaltyGoals,
        assists: s.assists,
        yellow: s.yellow,
        red: s.red,
        ownGoals: s.ownGoals,
        penaltiesSaved: s.penaltiesSaved,
        penaltiesMissed: s.penaltiesMissed,
        goalsConceded: newGoalsConceded,
        cleanSheet: newCleanSheet,
        isMotm: s.isMotm,
        isCaptain: false,
      }).total;

      const differs =
        newCleanSheet !== s.cleanSheet || newGoalsConceded !== s.goalsConceded || newFantasy !== s.fantasyPoints;
      if (!differs) continue;

      changed++;
      pointsDelta += newFantasy - s.fantasyPoints;
      log.push(
        `  match ${m.id} ${p.position} ${p.name}: pts ${s.fantasyPoints}→${newFantasy} | valla ${s.cleanSheet}→${newCleanSheet}` +
          (p.position === "GK" ? ` | recibidos ${s.goalsConceded}→${newGoalsConceded}` : "") +
          ` | min ${s.minutes}`,
      );

      // Por defecto, doble guarda para NUNCA pisar una fila manualEdit. Con
      // --include-manual sí actualizamos esas filas (solo estos 3 campos).
      const where = includeManual
        ? eq(playerMatchStats.id, s.id)
        : and(eq(playerMatchStats.id, s.id), eq(playerMatchStats.manualEdit, false));
      ops.push(
        db
          .update(playerMatchStats)
          .set({ cleanSheet: newCleanSheet, goalsConceded: newGoalsConceded, fantasyPoints: newFantasy })
          .where(where),
      );
    }
  }

  console.log(`Partidos finished: ${finished.length}`);
  console.log(`Filas escaneadas: ${scanned} (saltadas por manualEdit: ${skippedManual})`);
  console.log(`Filas a corregir: ${changed} (delta de puntos ${pointsDelta >= 0 ? "+" : ""}${pointsDelta})`);
  for (const l of log) console.log(l);

  if (!apply) {
    console.log("\nDRY-RUN. Nada se escribió. Volvé a correr con --apply para aplicar.");
    return;
  }
  if (!ops.length) {
    console.log("\nNada que aplicar.");
    return;
  }
  await chunkedBatch(ops);
  console.log(`\n✅ Aplicado: ${ops.length} fila(s) actualizada(s) en playerMatchStats.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
