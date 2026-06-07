import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookResult } from "./types";

// Mercado Pago — Checkout Pro (Argentina). Vía REST API con access token.
const MP_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";
const MP_API = "https://api.mercadopago.com";

/**
 * Verifica la firma `x-signature` del webhook (HMAC-SHA256 sobre el manifest
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`). Opt-in: solo se exige si está
 * configurado MP_WEBHOOK_SECRET; sin secreto (dev/pre-lanzamiento) no se bloquea.
 */
function verifyMpSignature(req: Request, dataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!sig || !dataId) return false;
  const parts = Object.fromEntries(
    sig.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  // MP: si data.id es alfanumérico, va en minúsculas en el manifest.
  const id = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

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
    const dataIdQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    // Firma sobre el data.id de la query (lo que MP firma en la IPN).
    if (!verifyMpSignature(req, dataIdQuery)) return null;
    let paymentId = dataIdQuery;
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
