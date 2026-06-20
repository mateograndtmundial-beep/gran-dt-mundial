"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Trophy } from "lucide-react";
import { formatArs } from "./format";

const STORAGE_KEY = "sampa.copaBannerDismissed";

/**
 * Banner SUTIL de la Liga Premium en la home, para usuarios no inscriptos. Discreto a
 * propósito (no invasivo para los free): una franja dorada angosta con CTA a /copa.
 * Dismissable (localStorage). Solo se renderiza desde el server si hay copa abierta y el
 * usuario no está dentro (ver app/page.tsx).
 */
export function CopaHomeBanner({ prizeArs }: { prizeArs: number }) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      try {
        setShow(localStorage.getItem(STORAGE_KEY) !== "1");
      } catch {
        setShow(false);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!mounted || !show) return null;

  return (
    <div className="relative mb-4 flex items-center gap-3 rounded-[8px] border border-gold-border bg-gold-bg px-4 py-3">
      <Trophy size={18} className="shrink-0 text-gold" aria-hidden />
      <Link href="/copa" className="min-w-0 flex-1 group">
        <p className="truncate text-sm font-semibold text-ink">
          Liga Premium · premio {formatArs(prizeArs)} garantizado
        </p>
        <p className="truncate text-xs text-ink-3 group-hover:text-gold-ink transition-colors">
          Cupos limitados — sumate antes de que se llene →
        </p>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="shrink-0 rounded-[6px] p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
