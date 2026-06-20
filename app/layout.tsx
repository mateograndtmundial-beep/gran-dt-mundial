import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bebas_Neue, Manrope, Archivo_Black } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { SiteNav } from "@/components/site-nav";
import { ChangeReminder } from "@/components/change-reminder";
import { SITE } from "@/lib/site";

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
  metadataBase: new URL(SITE.url),
  title: "Los 11 de Sampa — El juego de los DT del Mundial 2026",
  description:
    "Ponete el buzo de Sampa: armá tu equipo del Mundial 2026 con 15 jugadores, elegí capitán y DT, y competí con amigos por el primer puesto.",
  openGraph: {
    title: "Los 11 de Sampa",
    description: "Ponete el buzo de Sampa: armá tu equipo del Mundial 2026 y competí con amigos.",
    // La imagen sale de app/opengraph-image.tsx (1200×630, generada con ImageResponse).
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

  const content = (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:pb-10">
        {children}
      </main>
      {/* Recordatorio de cierre de cambios (popup 24 h). Server-async: corta
          barato si no aplica. Solo se monta con Clerk activo (necesita sesión).
          En Suspense para que su lectura de sesión (auth) no fuerce el render
          dinámico de las páginas estáticas que comparten este layout. */}
      {clerkEnabled && (
        <Suspense fallback={null}>
          <ChangeReminder />
        </Suspense>
      )}
    </>
  );

  const tree = (
    <html lang="es" className={fontVars}>
      <body className="min-h-screen antialiased">{content}</body>
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
