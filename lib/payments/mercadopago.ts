import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookResult } from "./types";

// Mercado Pago — Checkout Pro (Argentina). Vía REST API con access token.
const MP_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";
const MP_API = "https://api.mercadopago.com";

export const mercadopago: PaymentProvider = {
  name: "mercadopago",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!MP_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN");
    const body: Record<string, unknown> = {
      items: [
        {
          title: input.product.name,
          quantity: 1,
          unit_price: input.amount,
          currency_id: input.currency,
        },
      ],
      external_reference: String(input.orderId),
      back_urls: { success: input.successUrl, failure: input.failureUrl, pending: input.successUrl },
      notification_url: input.notificationUrl,
      metadata: { order_id: input.orderId, pins: input.product.pins },
    };
    // auto_return solo es válido con URLs https públicas (falla con localhost en dev).
    if (input.successUrl.startsWith("https://")) body.auto_return = "approved";

    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`MP preference ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { id: string; init_point: string };
    return { url: json.init_point, providerRef: json.id };
  },

  async parseWebhook(req: Request): Promise<WebhookResult | null> {
    if (!MP_TOKEN) return null;
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
    let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    if (!paymentId) {
      try {
        const body = (await req.json()) as { data?: { id?: string } };
        paymentId = body?.data?.id ?? null;
      } catch {
        paymentId = null;
      }
    }
    if (!paymentId) return null;
    if (type && type !== "payment") return null;

    const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!res.ok) return null;
    const p = (await res.json()) as { status: string; external_reference?: string };
    const orderId = p.external_reference ? Number(p.external_reference) : null;
    const status: WebhookResult["status"] =
      p.status === "approved"
        ? "paid"
        : p.status === "in_process" || p.status === "pending"
          ? "pending"
          : "failed";
    return { orderId, status, providerRef: String(paymentId) };
  },
};
