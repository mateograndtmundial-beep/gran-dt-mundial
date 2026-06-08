"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getProvider, providerForCountry, isProviderConfigured } from "@/lib/payments";
import { getPinBalance } from "@/lib/pins";
import { notifyCheckoutStarted, notifyError } from "@/lib/notify/slack";
import { headers } from "next/headers";

/**
 * Crea una orden de compra de pines y devuelve la URL de checkout del proveedor
 * (Mercado Pago para AR, dLocal para el resto). El frontend redirige a esa URL.
 */
export async function createPinOrder(productSku: string, country?: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "auth" as const };

  // País: lo manda el front, o lo autodetectamos por geo (header de Vercel) → fallback AR.
  let cc = (country ?? "").toUpperCase();
  if (!cc) {
    const h = await headers();
    cc = (h.get("x-vercel-ip-country") ?? "AR").toUpperCase();
  }

  const product = (
    await db
      .select()
      .from(products)
      .where(and(eq(products.sku, productSku), eq(products.active, true)))
      .limit(1)
  )[0];
  if (!product) return { ok: false as const, error: "product" as const };

  const providerName = providerForCountry(cc);
  // dLocal: cuenta en trámite, sin credenciales todavía → no ofrecemos compra fuera de AR
  // (evitamos crear órdenes que nunca van a poder cobrarse).
  if (!isProviderConfigured(providerName)) return { ok: false as const, error: "unavailable" as const };
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
      country: cc,
      successUrl: `${base}/pines?status=success`,
      failureUrl: `${base}/pines?status=failure`,
      notificationUrl: `${base}/api/payments/webhook/${providerName}`,
    });
    await db.update(orders).set({ providerRef: checkout.providerRef }).where(eq(orders.id, order.id));
    // Funnel: checkout iniciado (todavía sin pagar; el webhook avisa la acreditación).
    notifyCheckoutStarted({
      orderId: order.id,
      userId: user.id,
      username: user.username,
      productName: product.name,
      pins: product.pins,
      amount,
      currency,
      provider: providerName,
    });
    return { ok: true as const, url: checkout.url, orderId: order.id };
  } catch (e) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    notifyError({ source: "checkout", message: (e as Error).message });
    return { ok: false as const, error: (e as Error).message };
  }
}

/** Saldo de pines del usuario logueado (para mostrar en el front). */
export async function getMyPins(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return getPinBalance(user.id);
}

/** Estado de una orden (para la página de retorno /pines?status=...&order=...). */
export async function getOrderStatus(orderId: number) {
  const user = await getCurrentUser();
  if (!user) return null;
  const o = (
    await db
      .select({ status: orders.status, pins: orders.pins, userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
  )[0];
  if (!o || o.userId !== user.id) return null;
  return { status: o.status, pins: o.pins };
}
