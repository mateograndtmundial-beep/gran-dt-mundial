"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getProvider, providerForCountry } from "@/lib/payments";
import { getPinBalance } from "@/lib/pins";

/**
 * Crea una orden de compra de pines y devuelve la URL de checkout del proveedor
 * (Mercado Pago para AR, dLocal para el resto). El frontend redirige a esa URL.
 */
export async function createPinOrder(productSku: string, country: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };

  const product = (
    await db
      .select()
      .from(products)
      .where(and(eq(products.sku, productSku), eq(products.active, true)))
      .limit(1)
  )[0];
  if (!product) return { ok: false as const, error: "product" as const };

  const providerName = providerForCountry(country);
  const isAr = providerName === "mercadopago";
  const amount = isAr ? product.priceArs : product.priceUsd;
  const currency = isAr ? "ARS" : "USD";
  if (amount == null) return { ok: false as const, error: "price" as const };

  const order = (
    await db
      .insert(orders)
      .values({
        userId: user.id,
        productId: product.id,
        pins: product.pins,
        amount,
        currency,
        provider: providerName,
        status: "pending",
      })
      .returning()
  )[0];
  if (!order) throw new Error("No se pudo crear la orden");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const provider = getProvider(providerName);
  try {
    const checkout = await provider.createCheckout({
      orderId: order.id,
      product: { sku: product.sku, name: product.name, pins: product.pins },
      amount,
      currency,
      country: country.toUpperCase(),
      successUrl: `${base}/pines?status=success`,
      failureUrl: `${base}/pines?status=failure`,
      notificationUrl: `${base}/api/payments/webhook/${providerName}`,
    });
    await db.update(orders).set({ providerRef: checkout.providerRef }).where(eq(orders.id, order.id));
    return { ok: true as const, url: checkout.url, orderId: order.id };
  } catch (e) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return { ok: false as const, error: (e as Error).message };
  }
}

/** Saldo de pines del usuario logueado (para mostrar en el front). */
export async function getMyPins(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return getPinBalance(user.id);
}
