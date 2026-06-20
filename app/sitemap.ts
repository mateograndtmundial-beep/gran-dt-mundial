import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/equipo",
    "/jugadores",
    "/ranking",
    "/ligas",
    "/pines",
    "/como-funciona",
    "/bases",
    "/privacidad",
    "/soporte",
    "/arrepentimiento",
  ];
  return routes.map((route) => ({
    url: `${SITE.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
