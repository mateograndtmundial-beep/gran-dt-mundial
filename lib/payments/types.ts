export type ProviderName = "mercadopago" | "dlocal";

export interface CheckoutInput {
  orderId: number;
  product: { sku: string; name: string; pins: number };
  amount: number;
  currency: string;
  country: string;
  successUrl: string;
  failureUrl: string;
  notificationUrl: string;
}

export interface CheckoutResult {
  url: string; // a dónde redirigir al usuario para pagar
  providerRef: string; // id de preferencia/pago en el proveedor
}

export interface WebhookResult {
  orderId: number | null;
  status: "paid" | "failed" | "pending" | "expired";
  providerRef?: string;
}

export interface PaymentProvider {
  name: ProviderName;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  parseWebhook(req: Request): Promise<WebhookResult | null>;
}
