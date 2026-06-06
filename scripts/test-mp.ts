import "dotenv/config";
import { mercadopago } from "../lib/payments/mercadopago";

// Smoke test: crea una preferencia de Checkout Pro y muestra la URL de pago.
async function main() {
  const r = await mercadopago.createCheckout({
    orderId: 999999,
    product: { sku: "pin_5", name: "5 pines", pins: 5 },
    amount: 6000,
    currency: "ARS",
    country: "AR",
    successUrl: "http://localhost:3000/pines?status=success",
    failureUrl: "http://localhost:3000/pines?status=failure",
    notificationUrl: "http://localhost:3000/api/payments/webhook/mercadopago",
  });
  console.log("✅ Preferencia creada");
  console.log("  providerRef:", r.providerRef);
  console.log("  url:", r.url);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  });
