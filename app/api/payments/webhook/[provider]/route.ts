import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getProvider, type ProviderName } from "@/lib/payments";
import { creditOrder } from "@/lib/payments/credit";
import { notifyPaymentFailed, notifyError } from "@/lib/notify/slack";

async function handle(req: Request, providerName: string) {
  if (providerName !== "mercadopago" && providerName !== "dlocal") {
    return new Response("provider inválido", { status: 400 });
  }
  try {
    const provider = getProvider(providerName as ProviderName);
    const result = await provider.parseWebhook(req);

    if (result?.orderId) {
      if (result.status === "paid") {
        await creditOrder(result.orderId, result.providerRef);
      } else if (result.status === "failed" || result.status === "expired") {
        await db
          .update(orders)
          .set({ status: result.status })
          .where(and(eq(orders.id, result.orderId), eq(orders.status, "pending")));
        notifyPaymentFailed({ orderId: result.orderId, status: result.status });
      }
    }
  } catch (e) {
    // Avisamos a Slack y re-lanzamos: el 500 hace que el proveedor reintente
    // (no perdemos la acreditación ante un fallo transitorio).
    notifyError({ source: `webhook:${providerName}`, message: (e as Error).message });
    throw e;
  }
  // Siempre 200 para que el proveedor no reintente en loop.
  return new Response("ok");
}

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  return handle(req, provider);
}

// Solo POST: un webhook nunca llega por GET. Aceptarlo abría un vector tipo
// `<img src=".../webhook?...">` (CSRF) y exposición vía query params en logs.
export function GET() {
  return new Response("método no permitido", { status: 405, headers: { Allow: "POST" } });
}
