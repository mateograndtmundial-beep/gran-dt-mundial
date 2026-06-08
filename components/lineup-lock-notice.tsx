"use client";

import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";

const STORAGE_KEY = "sampa.lineupLockNoticeDismissed";

export function LineupLockNotice() {
  const [show, setShow] = useState(false);

  // Lee localStorage solo en el cliente para evitar el flash (mismo patrón que WelcomeBanner).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        setShow(localStorage.getItem(STORAGE_KEY) !== "1");
      } catch {
        setShow(true);
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

  if (!show) return null;

  return (
    <div className="relative flex items-start gap-2.5 rounded-r-[6px] border-l-4 border-danger bg-danger-bg px-4 py-3 pr-10">
      <Lock size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" aria-hidden />
      <p className="text-sm font-semibold leading-relaxed text-danger">
        Cuando arranca cada fecha, tu equipo de esa fecha queda cerrado: no vas a poder cambiarlo
        hasta que se publiquen los puntos. Hacé tus cambios antes de que empiece el primer partido.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="absolute right-2.5 top-2.5 rounded-[6px] p-1 text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <X size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
