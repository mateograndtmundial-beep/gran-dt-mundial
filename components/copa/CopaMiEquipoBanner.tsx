"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Trophy } from "lucide-react";
import { formatArs, formatCopaStart } from "./format";

const STORAGE_KEY = "sampa.copaMiEquipoBannerDismissed";

/**
 * Recordatorio SUTIL y CHICO de la Liga Premium en /mi-equipo, para quien ya tiene equipo
 * pero no está inscripto. A propósito es una franja angosta (no la card grande con el
 * numeral), para no estorbar al equipo, que es el protagonista de la página. Dismissable
 * (localStorage, clave propia distinta del banner de la home). Linkea a /copa.
 */
export function CopaMiEquipoBanner({
  prizeArs,
  startsAt,
}: {
  prizeArs: number;
  startsAt: string | Date | null;
}) {
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

  const startDate = formatCopaStart(startsAt);

  return (
    <div className="relative flex items-center gap-2.5 rounded-[8px] border border-gold-border bg-gold-bg px-3 py-2">
      <Trophy size={15} className="shrink-0 text-gold" aria-hidden />
      <Link href="/copa" className="group min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">
          Sumate a la Liga Premium · premio {formatArs(prizeArs)}
        </p>
        <p className="truncate text-[11px] text-ink-3 transition-colors group-hover:text-gold-ink">
          {startDate ? `Arranca el ${startDate} con los 16vos` : "Cupos limitados"} →
        </p>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="shrink-0 rounded-[6px] p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X size={15} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
