import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { addPins } from "@/lib/pins";

/**
 * Acredita los pines de una orden pagada. Idempotente: solo transiciona si la
 * orden estaba 'pending', así un webhook repetido no acredita dos veces.
 */
export async function creditOrder(orderId: number, providerRef?: string): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), ...(providerRef ? { providerRef } : {}) })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning();

  if (updated.length && updated[0]) {
    const o = updated[0];
    await addPins(o.userId, o.pins, "purchase", { orderId: o.id });
    return true;
  }
  return false;
}
