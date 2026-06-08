import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope, Archivo_Black } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { SiteNav } from "@/components/site-nav";
import { PostHogProvider } from "./providers";
import { PostHogIdentify } from "@/components/posthog-identify";

/* ─── Fuentes (next/font/google → CSS variables) ─── */
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/* ─── Viewport ─── */
// maximumScale: 1 evita el auto-zoom de iOS Safari al enfocar inputs (campos
// con texto < 16px). iOS moderno sigue permitiendo el pinch-zoom manual por
// accesibilidad, así que sólo desactivamos el zoom automático indeseado.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/* ─── Metadatos ─── */
export const metadata: Metadata = {
  metadataBase: new URL("https://los11desampa.vercel.app"),
  title: "Los 11 de Sampa — El juego de los DT del Mundial 2026",
  description:
    "Ponete el buzo de Sampa: armá tu equipo del Mundial 2026 con 15 jugadores, elegí capitán y DT, y competí con amigos por el primer puesto.",
  openGraph: {
    title: "Los 11 de Sampa",
    description: "Ponete el buzo de Sampa: armá tu equipo del Mundial 2026 y competí con amigos.",
    images: [{ url: "/images/logo/logo-square-512.png", width: 512, height: 512 }],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const fontVars = [bebasNeue.variable, manrope.variable, archivoBlack.variable].join(" ");
  // PostHog (analytics + session replay) se activa sólo si hay key configurada.
  const posthogEnabled = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

  const content = (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:pb-10">
        {children}
      </main>
      {/* Ata cada replay/evento al usuario logueado (necesita Clerk + PostHog). */}
      {posthogEnabled && clerkEnabled && <PostHogIdentify />}
    </>
  );

  const tree = (
    <html lang="es" className={fontVars}>
      <body className="min-h-screen antialiased">
        {posthogEnabled ? <PostHogProvider>{content}</PostHogProvider> : content}
      </body>
    </html>
  );

  return clerkEnabled ? (
    <ClerkProvider
      localization={esES}
      appearance={{
        variables: {
          colorPrimary: "#1B4FD8",
          colorBackground: "#FFFFFF",
          colorText: "#111827",
          colorTextSecondary: "#6B7280",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#111827",
          borderRadius: "8px",
          fontFamily: "Manrope, sans-serif",
        },
        elements: {
          card: "shadow-none border border-[#D4D9D4] rounded-[8px]",
          formButtonPrimary:
            "bg-[#1B4FD8] hover:bg-[#1640B8] text-white font-semibold",
          socialButtonsBlockButton:
            "border border-[#D4D9D4] hover:bg-[#E8EBE8] text-[#111827]",
        },
      }}
    >
      {tree}
    </ClerkProvider>
  ) : (
    tree
  );
}
