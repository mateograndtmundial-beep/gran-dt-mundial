import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, rounds } from "@/lib/db/schema";
import { notifyError } from "@/lib/notify/slack";

/**
 * Ciclo de vida de las copas premium (GOLDEN TICKET). Ver docs/MONETIZACION.md.
 * Todo event-driven (sin cron): el cierre por tiempo se chequea al vender/inscribir,
 * y el cierre por cupo se dispara al llenarse la copa. Hay UNA sola copa activa: al
 * llenarse, la inscripción queda cerrada y NO se abre otra automáticamente (abrir una
 * Liga II/III es una decisión manual del admin desde /admin).
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
 * Tras inscribir al último cupo: marca la copa `full` (cierra la inscripción).
 * Idempotente (solo transiciona si venía `open`). NO abre ninguna otra copa: hay una
 * sola Liga Premium; si se quiere abrir una Liga II/III, es una decisión manual del
 * admin (`setCopaStatus`, draft → open desde /admin). Las próximas órdenes pagas que
 * lleguen sin lugar se reembolsan (ver enrollInLeague). Avisa a Slack para tener
 * registro del cierre por cupo.
 */
export async function markCopaFull(leagueId: number): Promise<void> {
  // Marca esta copa `full` (solo si venía `open`, así es idempotente).
  await db
    .update(leagues)
    .set({ status: "full" })
    .where(and(eq(leagues.id, leagueId), eq(leagues.status, "open")));

  notifyError({
    source: "golden_ticket",
    message:
      `Copa ${leagueId} LLENA (cupo completo) → inscripción CERRADA. No se abre otra copa ` +
      `automáticamente. Si querés abrir una Liga II, hacelo a mano desde /admin. Las próximas ` +
      `órdenes pagas que lleguen sin lugar se reembolsan.`,
  });
}
