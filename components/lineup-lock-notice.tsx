"use client";

import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "sampa.lineupLockNoticeDismissed";

type Variant = "default" | "compact";

const MESSAGES: Record<Variant, string> = {
  default:
    "Cuando arranca cada fecha, tu equipo de esa fecha queda cerrado: no vas a poder cambiarlo " +
    "hasta que se publiquen los puntos. Hacé tus cambios antes de que empiece el primer partido.",
  compact:
    "Cuando arranca cada fecha, tu equipo de esa fecha queda cerrado. Guardá tus cambios antes " +
    "de que empiece el primer partido.",
};

export function LineupLockNotice({ variant = "default" }: { variant?: Variant }) {
  const [show, setShow] = useState(false);
  const storageKey = `${STORAGE_PREFIX}.${variant}`;

  // Lee localStorage solo en el cliente para evitar el flash (mismo patrón que WelcomeBanner).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        setShow(localStorage.getItem(storageKey) !== "1");
      } catch {
        setShow(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "relative flex items-start gap-2.5 rounded-r-[6px] border-l-4 border-danger bg-danger-bg",
        compact ? "px-3.5 py-2.5 pr-9" : "px-4 py-3 pr-10",
      )}
    >
      <Lock
        size={compact ? 16 : 18}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-danger"
        aria-hidden
      />
      <p
        className={cn(
          "font-semibold text-danger",
          compact ? "text-[13px] leading-snug" : "text-sm leading-relaxed",
        )}
      >
        {MESSAGES[variant]}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className={cn(
          "absolute rounded-[6px] p-1 text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger",
          compact ? "right-2 top-2" : "right-2.5 top-2.5",
        )}
      >
        <X size={compact ? 14 : 16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
