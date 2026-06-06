"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Shirt, Trophy, ListOrdered } from "lucide-react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/jugadores", label: "Jugadores", icon: Users },
  { href: "/mi-equipo", label: "Equipo", icon: Shirt },
  { href: "/ligas", label: "Ligas", icon: Trophy },
  { href: "/ranking", label: "Ranking", icon: ListOrdered },
];

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthArea() {
  if (!clerkEnabled) {
    return (
      <Link
        href="/sign-in"
        className="rounded-md bg-gold px-3 py-1.5 text-sm font-bold text-pitch"
      >
        Ingresar
      </Link>
    );
  }
  return <AuthAreaInner />;
}

function AuthAreaInner() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="h-7 w-7" />;
  if (isSignedIn) return <UserButton />;
  return (
    <SignInButton mode="modal">
      <button className="rounded-md bg-gold px-3 py-1.5 text-sm font-bold text-pitch">Ingresar</button>
    </SignInButton>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-pitch/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
            <span className="text-gold">DT</span> Mundial
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white",
                  isActive(l.href) && "bg-white/10 text-white",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <AuthArea />
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-pitch/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] text-white/60",
                  isActive(l.href) && "text-gold",
                )}
              >
                <Icon size={20} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
