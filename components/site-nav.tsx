"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Users, Shirt, Trophy, ListOrdered, HelpCircle } from "lucide-react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { PinBalance } from "@/components/pin-balance";

const links = [
  { href: "/",          label: "Inicio",    icon: Home },
  { href: "/jugadores", label: "Jugadores", icon: Users },
  { href: "/mi-equipo", label: "Equipo",    icon: Shirt },
  { href: "/ligas",     label: "Ligas",     icon: Trophy },
  { href: "/ranking",   label: "Ranking",   icon: ListOrdered },
  { href: "/como-funciona", label: "Ayuda", icon: HelpCircle },
];

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthArea() {
  if (!clerkEnabled) {
    return (
      <Link
        href="/sign-in"
        className="rounded-[6px] border border-border card-shadow px-3 py-1.5 text-sm font-semibold text-ink hover:border-border-strong hover:card-shadow-md transition-all"
      >
        Ingresar
      </Link>
    );
  }
  return <AuthAreaInner />;
}

function AuthAreaInner() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="h-7 w-7 rounded-full bg-surface-2 animate-pulse-skeleton" />;
  if (isSignedIn) return <UserButton />;
  return (
    <SignInButton mode="modal">
      <button className="rounded-[6px] border border-border card-shadow px-3 py-1.5 text-sm font-semibold text-ink hover:border-border-strong hover:card-shadow-md transition-all">
        Ingresar
      </button>
    </SignInButton>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ─── Header desktop ─── */}
      <header className="sticky top-0 z-40 border-b border-border bg-canvas">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo + wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/images/logo/logo-badge-512.png"
              alt="Los 11 de Sampa"
              width={32}
              height={32}
              className="rounded-full transition-transform duration-150 group-hover:scale-110"
              priority
            />
            <span className="text-xl font-display text-ink leading-none [-webkit-text-stroke:0.4px_currentColor] [paint-order:stroke_fill]">
              LOS <span className="text-blue">11</span> DE SAMPA
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium rounded-[6px] transition-colors",
                    active
                      ? "text-blue bg-blue-light"
                      : "text-ink-2 hover:text-ink hover:bg-surface-2",
                  )}
                >
                  {/* Active indicator: regla azul arriba */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 -top-[13px] h-[2px] rounded-full bg-blue"
                    />
                  )}
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {clerkEnabled && <PinBalance />}
            <AuthArea />
          </div>
        </div>
      </header>

      {/* ─── Bottom nav mobile ─── */}
      <nav
        aria-label="Navegación principal"
        // translateZ(0)+backface-hidden: promueve la barra a su propia capa GPU
        // para evitar el glitch de iOS Safari (backdrop-filter sobre fixed se
        // "despega" durante el scroll por inercia). pb safe-area: home indicator.
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-canvas md:hidden pb-[env(safe-area-inset-bottom)] [transform:translateZ(0)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-6">
          {links.map((l) => {
            const Icon = l.icon;
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-blue" : "text-ink-3",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} aria-hidden />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
