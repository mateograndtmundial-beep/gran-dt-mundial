import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * Footer global, deliberadamente discreto (gris, al pie, sin protagonismo). Su razón
 * de ser es de cumplimiento: dar un punto de acceso permanente a las páginas legales y
 * exponer el "Botón de arrepentimiento" exigido por la Res. SCI 424/2020 (visible desde
 * el inicio, sin login y en todas las páginas). La holgura inferior de mobile vive acá
 * (no en <main>) para no quedar tapado por la barra de navegación fija (ver layout.tsx).
 */

const LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/bases", label: "Bases y Condiciones" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/soporte", label: "Soporte" },
  { href: "/arrepentimiento", label: "Botón de arrepentimiento" },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-canvas pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7 md:pb-8">
      <div className="mx-auto w-full max-w-5xl px-4">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-3">
          {LINKS.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </Link>
            ),
          )}
        </nav>
        <p className="mt-4 text-xs leading-relaxed text-ink-3">
          © {new Date().getFullYear()} {SITE.name}.
        </p>
      </div>
    </footer>
  );
}
