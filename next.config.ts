import type { NextConfig } from "next";

// Headers de seguridad base. Se evita una CSP por ahora para no romper Clerk ni los
// redirects de los proveedores de pago (queda como follow-up con allowlist).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Solo tiene efecto sobre HTTPS; inofensivo en localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Archivos que las funciones que renderan stories necesitan en runtime: Chromium
// (@sparticuz + playwright-core COMPLETO — incluye browsers.json, que coreBundle.js
// carga dinámicamente y el tracer de Next no detecta solo) + los assets (template,
// banderas, logo) que se leen por fs.
const STORY_TRACE = [
  "./assets/stories/**",
  "./public/images/logo/logo-badge-192.png",
  "./node_modules/@sparticuz/chromium/**",
  "./node_modules/playwright-core/**",
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // El generador de stories usa Chromium (vía @sparticuz/chromium + playwright-core)
  // en el cron y en la acción de admin. Estos paquetes no se bundlean: se cargan de
  // node_modules en runtime. (playwright/sharp idem.)
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "playwright", "sharp"],
  // Incluir Chromium + assets en TODAS las funciones que renderan: el cron, el botón
  // bulk (/admin) y el botón por partido (/admin/fecha/[roundId], donde corre la action).
  outputFileTracingIncludes: {
    "/api/cron/sync": STORY_TRACE,
    "/admin": STORY_TRACE,
    "/admin/fecha/[roundId]": STORY_TRACE,
  },
  images: {
    // Banderas y fotos de jugadores vienen de la CDN de API-Football (seed.ts:
    // `team.flag`/`team.photo`/`p.photo`). Las dejamos remotas (la mayoría son
    // SVG, que Next no optimiza sin `dangerouslyAllowSVG` — riesgo de XSS que no
    // vale la pena para banderitas de 28×20). Esto solo habilita el proxy/caché
    // de Vercel si en algún momento se migra a next/image.
    remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io" }],
  },
};

export default nextConfig;
