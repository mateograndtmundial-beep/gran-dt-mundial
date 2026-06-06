import type { PaymentProvider, ProviderName } from "./types";
import { mercadopago } from "./mercadopago";
import { dlocal } from "./dlocal";

export function getProvider(name: ProviderName): PaymentProvider {
  return name === "mercadopago" ? mercadopago : dlocal;
}

/** Argentina → Mercado Pago; resto de LatAm → dLocal. */
export function providerForCountry(country: string): ProviderName {
  return country.toUpperCase() === "AR" ? "mercadopago" : "dlocal";
}

export * from "./types";
