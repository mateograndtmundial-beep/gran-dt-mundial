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

/** ¿Tiene el proveedor las credenciales cargadas? (dLocal: cuenta pendiente de aprobación) */
export function isProviderConfigured(name: ProviderName): boolean {
  if (name === "mercadopago") return !!process.env.MP_ACCESS_TOKEN;
  return !!process.env.DLOCAL_GO_API_KEY && !!process.env.DLOCAL_GO_SECRET_KEY;
}

export * from "./types";
