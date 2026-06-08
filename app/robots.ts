import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Páginas privadas/de sesión: no aportan a la búsqueda y exponen rutas de auth/admin.
        disallow: ["/admin", "/mi-equipo", "/equipo", "/bienvenida", "/sign-in", "/sign-up", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
