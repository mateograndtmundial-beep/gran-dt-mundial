"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Countdown compacto en texto ("Cierra en 2d 4h 12m") al cierre de la ventana de
 * cambios = kickoff del primer partido de la fecha editable. Versión liviana del
 * `Countdown` grande del hero, pensada para ir dentro de un chip o la barra del
 * armador. Tickea cada segundo pero solo muestra hasta minutos: nada de segundos,
 * para no hacer ruido.
 */
export function CloseCountdown({
  deadline,
  className,
  prefix = "Cierra en",
}: {
  deadline: string;
  className?: string;
  prefix?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick);
    // Solo mostramos minutos → con refrescar cada 30 s alcanza (sin renders por segundo).
    const id = setInterval(tick, 30000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  // Hasta montar (now === null) no renderizamos texto numérico para evitar el
  // mismatch de hidratación (el reloj del server difiere del cliente).
  const target = new Date(deadline).getTime();
  const diff = now === null ? null : Math.max(0, target - now);

  let label: string;
  if (diff === null) {
    label = "—";
  } else if (diff <= 0) {
    label = "Cerrando…";
  } else {
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const parts = d > 0 ? [`${d}d`, `${h}h`, `${m}m`] : h > 0 ? [`${h}h`, `${m}m`] : [`${m}m`];
    label = `${prefix} ${parts.join(" ")}`;
  }

  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", className)}>
      <Clock size={11} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
