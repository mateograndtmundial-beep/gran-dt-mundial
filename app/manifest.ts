import type { MetadataRoute } from "next";

/**
 * Web App Manifest → hace la app instalable como PWA ("Agregar a inicio" en
 * iOS/Android). En iOS el ícono de home screen sale de apple-touch-icon.png
 * (ver layout.tsx); estos icons los usan Android/Chrome y el splash.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Los 11 de Sampa",
    short_name: "Los 11 de Sampa",
    description:
      "Armá tu equipo del Mundial 2026 con 15 jugadores, elegí capitán y DT, y competí con amigos por el primer puesto.",
    start_url: "/",
    display: "standalone",
    background_color: "#F0F2F0",
    theme_color: "#F0F2F0",
    lang: "es",
    icons: [
      {
        src: "/images/logo/logo-square-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/logo/logo-square-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
