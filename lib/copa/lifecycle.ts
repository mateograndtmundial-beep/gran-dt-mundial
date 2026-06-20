import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, rounds } from "@/lib/db/schema";
import { notifyError } from "@/lib/notify/slack";

/**
 * Ciclo de vida de las copas premium (GOLDEN TICKET). Ver docs/MONETIZACION.md.
 * Todo event-driven (sin cron): el cierre por tiempo se chequea al vender/inscribir,
 * y la auto-activación de la copa de reserva se dispara al llenarse una copa.
 */

/**
 * ¿La copa ya cerró por tiempo? El cierre es el kickoff de su fecha de arranque
 * (16vos), que coincide con el `deadline` de su `scoringStartRound`. Sin fecha de
 * arranque o sin deadline → no cierra por tiempo.
 */
export async function isCopaPastDeadline(league: {
  scoringStartRoundId: number | null;
}): Promise<boolean> {
  if (league.scoringStartRoundId == null) return false;
  const r = (
    await db
      .select({ deadline: rounds.deadline })
      .from(rounds)
      .where(eq(rounds.id, league.scoringStartRoundId))
      .limit(1)
  )[0];
  if (!r?.deadline) return false;
  return Date.now() >= new Date(r.deadline).getTime();
}

/**
 * Tras inscribir al último cupo de una copa: la marca `full` y activa la siguiente
 * copa premium en `draft` (draft → open), para que las próximas inscripciones caigan
 * ahí solas (getGoldenTicketCopas oculta las `draft`). Idempotente: si ya estaba
 * `full` o no hay copa de reserva, no rompe nada. Si NO hay reserva, avisa para
 * abrir otra a mano (las próximas órdenes pagas se reembolsan, ver enrollInLeague).
 */
export async function markCopaFullAndActivateNext(leagueId: number): Promise<void> {
  // Marca esta copa `full` (solo si venía `open`, así es idempotente).
  await db
    .update(leagues)
    .set({ status: "full" })
    .where(and(eq(leagues.id, leagueId), eq(leagues.status, "open")));

  // Activa la siguiente copa premium en `draft` (la de menor id).
  const next = (
    await db
      .select({ id: leagues.id, name: leagues.name })
      .from(leagues)
      .where(and(eq(leagues.kind, "golden_ticket"), eq(leagues.status, "draft")))
      .orderBy(asc(leagues.id))
      .limit(1)
  )[0];

  if (next) {
    await db
      .update(leagues)
      .set({ status: "open" })
      .where(and(eq(leagues.id, next.id), eq(leagues.status, "draft")));
    notifyError({
      source: "golden_ticket",
      message: `Copa ${leagueId} LLENA → activada la copa de reserva ${next.id} (${next.name}).`,
    });
  } else {
    notifyError({
      source: "golden_ticket",
      message: `Copa ${leagueId} LLENA y NO hay copa de reserva en draft. Las próximas órdenes pagas se reembolsan; avisar por Instagram si se quiere abrir otra copa.`,
    });
  }
}
