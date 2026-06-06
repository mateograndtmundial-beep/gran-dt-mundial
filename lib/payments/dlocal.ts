import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookResult } from "./types";

// dLocal Go — resto de LatAm (Paraguay, Bolivia, etc.) con métodos locales.
// NOTA: verificar endpoints/campos exactos y firma del webhook contra la doc de
// dLocal Go cuando tengas la cuenta real; dejé la forma estándar de su API.
const API = process.env.DLOCAL_GO_BASE_URL ?? "https://api.dlocalgo.com";
const KEY = process.env.DLOCAL_GO_API_KEY ?? "";
const SECRET = process.env.DLOCAL_GO_SECRET_KEY ?? "";
const authHeader = () => `Bearer ${KEY}:${SECRET}`;

export const dlocal: PaymentProvider = {
  name: "dlocal",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!KEY || !SECRET) throw new Error("Faltan DLOCAL_GO_API_KEY/SECRET");
    const res = await fetch(`${API}/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        country: input.country,
        order_id: String(input.orderId),
        description: input.product.name,
        success_url: input.successUrl,
        back_url: input.failureUrl,
        notification_url: input.notificationUrl,
      }),
    });
    if (!res.ok) throw new Error(`dLocal payment ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { id: string; redirect_url: string };
    return { url: json.redirect_url, providerRef: json.id };
  },

  async parseWebhook(req: Request): Promise<WebhookResult | null> {
    if (!KEY || !SECRET) return null;
    let paymentId: string | null = null;
    let orderId: number | null = null;
    let statusRaw: string | undefined;

    try {
      const body = (await req.json()) as {
        payment_id?: string;
        id?: string;
        order_id?: string;
        status?: string;
      };
      paymentId = body.payment_id ?? body.id ?? null;
      orderId = body.order_id ? Number(body.order_id) : null;
      statusRaw = body.status;
    } catch {
      const url = new URL(req.url);
      paymentId = url.searchParams.get("payment_id") ?? url.searchParams.get("id");
    }

    // Confirmar contra la API (no confiar solo en el payload del webhook).
    if (paymentId) {
      const res = await fetch(`${API}/v1/payments/${paymentId}`, { headers: { Authorization: authHeader() } });
      if (res.ok) {
        const p = (await res.json()) as { status?: string; order_id?: string };
        statusRaw = p.status ?? statusRaw;
        if (p.order_id) orderId = Number(p.order_id);
      }
    }

    const s = (statusRaw ?? "").toUpperCase();
    const status: WebhookResult["status"] =
      s === "PAID" ? "paid" : s === "PENDING" ? "pending" : s === "EXPIRED" ? "expired" : "failed";
    return { orderId, status, providerRef: paymentId ?? undefined };
  },
};
