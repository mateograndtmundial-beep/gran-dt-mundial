import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookResult } from "./types";

// dLocal Go — resto de LatAm (Paraguay, Bolivia, etc.) con métodos locales.
// Verificado contra docs.dlocalgo.com: POST /v1/payments · auth "Bearer API_KEY:SECRET_KEY"
// · estados PENDING/PAID/REJECTED/CANCELLED/EXPIRED · webhook = POST con { payment_id }.
// Sandbox: DLOCAL_GO_BASE_URL=https://api-sbx.dlocalgo.com
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
    // Integridad (fail-closed): el payload del webhook NUNCA decide el estado ni el
    // order_id — solo nos sirve para extraer el payment_id a re-consultar. El estado y
    // order_id finales salen EXCLUSIVAMENTE de la respuesta confirmada de la API de
    // dLocal (auth con KEY:SECRET). Si no hay payment_id o la API no confirma con `ok`,
    // el pago se trata como no pagado — un webhook forjado con `status: "PAID"` no
    // acredita nada por sí solo.
    let paymentId: string | null = null;

    try {
      const body = (await req.json()) as { payment_id?: string; id?: string };
      paymentId = body.payment_id ?? body.id ?? null;
    } catch {
      const url = new URL(req.url);
      paymentId = url.searchParams.get("payment_id") ?? url.searchParams.get("id");
    }

    if (!paymentId) return { orderId: null, status: "failed", providerRef: undefined };

    const res = await fetch(`${API}/v1/payments/${paymentId}`, { headers: { Authorization: authHeader() } });
    if (!res.ok) return { orderId: null, status: "failed", providerRef: paymentId };

    const p = (await res.json()) as { status?: string; order_id?: string };
    const orderId = p.order_id ? Number(p.order_id) : null;
    const s = (p.status ?? "").toUpperCase();
    const status: WebhookResult["status"] =
      s === "PAID" ? "paid" : s === "PENDING" ? "pending" : s === "EXPIRED" ? "expired" : "failed";
    return { orderId, status, providerRef: paymentId };
  },
};
