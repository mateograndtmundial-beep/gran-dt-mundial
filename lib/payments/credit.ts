import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products, users, leagues, leagueMembers } from "@/lib/db/schema";
import { addPins, isUniqueViolation } from "@/lib/pins";
import { notifyPaymentPaid, notifyError } from "@/lib/notify/slack";

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
 * onConflictDoNothing evitan duplicar) y respeta el cupo: si la copa ya está llena
 * (carrera por el último lugar), NO mete al usuario a la fuerza y avisa para
 * resolverlo a mano (reembolso o alta en la copa de reserva). Ver docs/MONETIZACION.md.
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
    await db.select({ capacity: leagues.capacity }).from(leagues).where(eq(leagues.id, leagueId)).limit(1)
  )[0];
  if (!league) {
    notifyError({ source: "golden_ticket", message: `Orden ${orderId}: copa ${leagueId} inexistente` });
    return;
  }
  if (league.capacity != null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leagueMembers)
      .where(eq(leagueMembers.leagueId, leagueId));
    if (Number(count) >= league.capacity) {
      notifyError({
        source: "golden_ticket_full",
        message: `Orden ${orderId}: copa ${leagueId} LLENA, user ${userId} pagó sin lugar → reembolsar o mover a la copa de reserva`,
      });
      return;
    }
  }
  await db.insert(leagueMembers).values({ leagueId, userId }).onConflictDoNothing();
}
