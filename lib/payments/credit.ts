import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products, users } from "@/lib/db/schema";
import { addPins, isUniqueViolation } from "@/lib/pins";
import { notifyPaymentPaid } from "@/lib/notify/slack";

/**
 * Acredita los pines de una orden pagada. Idempotente: solo transiciona si la
 * orden estaba 'pending', así un webhook repetido no acredita dos veces.
 *
 * El pack "ilimitado" no acredita saldo: marca al usuario como `isPremium`,
 * lo que lo exime de pagar pines por cambios extra (ver saveLineup).
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
      await db.select({ unlimited: products.unlimited }).from(products).where(eq(products.id, o.productId)).limit(1)
    )[0];
    if (product?.unlimited) {
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
