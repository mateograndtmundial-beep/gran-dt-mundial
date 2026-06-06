import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getProvider, type ProviderName } from "@/lib/payments";
import { creditOrder } from "@/lib/payments/credit";

async function handle(req: Request, providerName: string) {
  if (providerName !== "mercadopago" && providerName !== "dlocal") {
    return new Response("provider inválido", { status: 400 });
  }
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
    }
  }
  // Siempre 200 para que el proveedor no reintente en loop.
  return new Response("ok");
}

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  return handle(req, provider);
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  return handle(req, provider);
}
