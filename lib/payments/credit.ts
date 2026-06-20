import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products, users, leagues, leagueMembers } from "@/lib/db/schema";
import { addPins, isUniqueViolation } from "@/lib/pins";
import { notifyPaymentPaid, notifyError } from "@/lib/notify/slack";
import { isCopaPastDeadline, markCopaFullAndActivateNext } from "@/lib/copa/lifecycle";

/**
 * Acredita los pines de una orden pagada. Idempotente: solo transiciona si la
 * orden estaba 'pending', así un webhook repetido no acredita dos veces.
 *
 * El pack "ilimitado" no acredita saldo: marca al usuario como `isPremium`,
 * lo que lo exime de pagar pines por cambios extra (ver saveLineup).
 *
 * Las entradas a copas premium (GOLDEN TICKET) tampoco acreditan saldo: inscriben
 * al usuario en la liga (ver enrollInLeague).
 */
export async function creditOrder(orderId: number, providerRef?: string): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), ...(providerRef ? { providerRef } : {}) })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning();

  if (updated.length && updated[0]) {
    const o = updated[0];
    const product = (
      await db
        .select({ unlimited: products.unlimited, entryLeagueId: products.entryLeagueId })
        .from(products)
        .where(eq(products.id, o.productId))
        .limit(1)
    )[0];
    if (product?.entryLeagueId != null) {
      // Entrada a una copa premium: inscribe en la liga en vez de acreditar pines.
      await enrollInLeague(o.userId, product.entryLeagueId, o.id);
    } else if (product?.unlimited) {
      await db.update(users).set({ isPremium: true }).where(eq(users.id, o.userId));
    } else {
      try {
        await addPins(o.userId, o.pins, "purchase", { orderId: o.id });
      } catch (e) {
        // Blindaje: el índice único `pin_tx_order_purchase_unique` rechaza un
        // segundo "purchase" para la misma orden (carrera entre webhooks que
        // pasaron el UPDATE atómico de arriba, p.ej. si éste corriera fuera
        // de un lock de fila). Tratamos la violación como "ya acreditado":
        // no hay nada más que hacer, no perdemos ni duplicamos pines.
        if (!isUniqueViolation(e)) throw e;
      }
    }
    // Notifica a Slack una sola vez (va dentro del path idempotente).
    notifyPaymentPaid({ orderId: o.id });
    return true;
  }
  return false;
}

/**
 * Inscribe a un usuario en una copa premium al confirmarse el pago de su entrada.
 * Idempotente (si el webhook se repite, el chequeo de "ya inscripto" + el
 * onConflictDoNothing evitan duplicar) y respeta el cupo y el cierre por tiempo.
 *
 * Si el usuario pagó pero NO entra (copa llena por la carrera del último lugar, o el
 * pago llegó después del kickoff de los 16vos), la orden se marca `refunded` y se avisa
 * a Slack para REEMBOLSAR a mano en Mercado Pago (ver markOrderForRefund + la vista de
 * reconciliación en /admin). Al inscribir al último cupo, marca la copa `full` y activa
 * la copa de reserva. Ver docs/MONETIZACION.md.
 */
async function enrollInLeague(userId: number, leagueId: number, orderId: number) {
  const existing = (
    await db
      .select({ id: leagueMembers.id })
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
      .limit(1)
  )[0];
  if (existing) return; // webhook repetido: ya estaba inscripto

  const league = (
    await db
      .select({ capacity: leagues.capacity, scoringStartRoundId: leagues.scoringStartRoundId })
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1)
  )[0];
  if (!league) {
    notifyError({ source: "golden_ticket", message: `Orden ${orderId}: copa ${leagueId} inexistente` });
    return;
  }

  // Cierre por tiempo: si el pago llegó después del kickoff de los 16vos, no se inscribe.
  if (await isCopaPastDeadline(league)) {
    await markOrderForRefund(orderId, leagueId, userId, "pagó fuera de término (inscripción cerrada por tiempo)");
    return;
  }

  if (league.capacity != null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leagueMembers)
      .where(eq(leagueMembers.leagueId, leagueId));
    if (Number(count) >= league.capacity) {
      await markOrderForRefund(orderId, leagueId, userId, "copa LLENA (carrera por el último lugar)");
      return;
    }
  }

  await db.insert(leagueMembers).values({ leagueId, userId }).onConflictDoNothing();

  // ¿Esta inscripción llenó la copa? → marcarla `full` y activar la de reserva.
  if (league.capacity != null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leagueMembers)
      .where(eq(leagueMembers.leagueId, leagueId));
    if (Number(count) >= league.capacity) await markCopaFullAndActivateNext(leagueId);
  }
}

/**
 * Marca una orden de entrada como `refunded` (el usuario pagó pero no entró) y avisa a
 * Slack con todos los datos para ejecutar el reembolso a mano en Mercado Pago. El
 * reembolso automático vía API de MP queda como follow-up; hoy es manual.
 */
async function markOrderForRefund(orderId: number, leagueId: number, userId: number, reason: string) {
  const o = (
    await db
      .select({ amount: orders.amount, currency: orders.currency, providerRef: orders.providerRef })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
  )[0];
  await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, orderId));
  notifyError({
    source: "golden_ticket_full",
    message:
      `Orden ${orderId}: ${reason}. user ${userId}, copa ${leagueId}, ` +
      `${o?.amount ?? "?"} ${o?.currency ?? ""} (ref ${o?.providerRef ?? "?"}). ` +
      `Marcada 'refunded' → REEMBOLSAR a mano en Mercado Pago. Ver reconciliación en /admin.`,
  });
}
