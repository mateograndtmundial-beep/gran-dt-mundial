"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "sampa.deadlineNoticeDismissed";

/**
 * Leyenda del arranque de la fecha editable para /mi-equipo: "{Fecha} empieza en
 * 20h 18m". Cambia de color según urgencia — ROJA si falta menos de 24 h,
 * AMARILLA si falta más. Solo minutos (sin segundos). Tickea cada 30 s.
 *
 * Cerrable con la cruz: el descarte se recuerda en localStorage por fecha Y por
 * nivel de urgencia (`deadline` + tier), así que si la cerrás en amarillo vuelve
 * a aparecer una vez cuando pasa a rojo (<24 h), sin volverse molesta.
 */
export function DeadlineNotice({
  deadline,
  roundName,
  className,
}: {
  deadline: string;
  roundName: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 30000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const target = new Date(deadline).getTime();
  const diff = now === null ? null : Math.max(0, target - now);
  const urgent = diff !== null && diff < DAY_MS;
  const storageKey = `${STORAGE_PREFIX}.${deadline}.${urgent ? "urgent" : "soon"}`;

  // Relee el descarte cada vez que cambia la fecha o el tier (amarillo→rojo).
  useEffect(() => {
    if (now === null) return;
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey, now]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  // No renderizamos hasta montar (evita mismatch de hidratación), si ya pasó el
  // cierre, o si el usuario la cerró para este tier.
  if (diff === null || diff <= 0 || dismissed) return null;

  const d = Math.floor(diff / DAY_MS);
  const h = Math.floor((diff % DAY_MS) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const parts = d > 0 ? [`${d}d`, `${h}h`, `${m}m`] : h > 0 ? [`${h}h`, `${m}m`] : [`${m}m`];
  const time = `en ${parts.join(" ")}`;

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-r-[6px] border-l-4 py-2.5 pl-3.5 pr-9",
        urgent ? "border-danger bg-danger-bg text-danger" : "border-warning bg-warning-bg text-warning",
        className,
      )}
    >
      <Clock size={16} strokeWidth={2.25} className="shrink-0" aria-hidden />
      <p className="text-[13px] font-semibold leading-snug">
        {roundName} empieza <span className="tabular-nums">{time}</span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 rounded-[6px] p-1 transition-colors",
          urgent ? "text-danger/70 hover:bg-danger/10 hover:text-danger" : "text-warning/70 hover:bg-warning/10 hover:text-warning",
        )}
      >
        <X size={15} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
