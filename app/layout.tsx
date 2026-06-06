import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "DT Mundial — Fantasy del Mundial 2026",
  description: "Armá tu equipo del Mundial 2026, sumá puntos y competí con amigos.",
};

const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tree = (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <SiteNav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5 md:pb-10">{children}</main>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{tree}</ClerkProvider> : tree;
}
