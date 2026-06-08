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

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
