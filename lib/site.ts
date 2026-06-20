/** Datos públicos del sitio (contacto, redes). Fuente única reutilizable. */
export const SITE = {
  name: "Los 11 de Sampa",
  url: "https://www.los11desampa.com",
  contactEmail: "soporte@los11desampa.com",
  instagram: {
    url: "https://www.instagram.com/los11desampa/",
    handle: "@los11desampa",
  },
  twitter: {
    url: "https://x.com/los11desampa",
    handle: "@los11desampa",
  },
} as const;

/**
 * Base URL absoluta para links/redirects/webhooks armados en el SERVIDOR. Resuelve por
 * entorno para que Mercado Pago (back_urls + notification_url) funcione también en los
 * previews de Vercel:
 * - Preview (Vercel): la URL estable de la rama (VERCEL_BRANCH_URL) → el retorno del pago
 *   y el webhook vuelven a ESTE deploy de preview (con MP sandbox), no a producción.
 * - Producción / local: NEXT_PUBLIC_APP_URL (dominio real) o localhost.
 * Nota: solo server-side (las VERCEL_* no existen en el cliente).
 */
export function getAppBaseUrl(): string {
  if (process.env.VERCEL_ENV === "preview") {
    const previewUrl = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
    if (previewUrl) return `https://${previewUrl}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
