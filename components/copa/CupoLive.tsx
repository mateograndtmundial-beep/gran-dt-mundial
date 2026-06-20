"use client";

import { useEffect, useState } from "react";
import { getCopasStatus } from "@/lib/payment-actions";
import { Eyebrow } from "@/components/editorial";
import { cn } from "@/lib/utils";

/**
 * Barra de cupo EN VIVO de una copa premium: arranca con el valor del server y refresca
 * por polling (cada 30s) llamando getCopasStatus, para reforzar la escasez sin recargar.
 * Si el polling falla, se queda con el último valor conocido (no rompe la card).
 */
export function CupoLive({
  copaId,
  initialEnrolled,
  capacity,
}: {
  copaId: number;
  initialEnrolled: number;
  capacity: number;
}) {
  const [enrolled, setEnrolled] = useState(initialEnrolled);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const copas = await getCopasStatus();
        const me = copas.find((c) => c.id === copaId);
        if (alive && me) setEnrolled(me.enrolled);
      } catch {
        // mantené el último valor conocido
      }
    }
    const id = setInterval(refresh, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [copaId]);

  const pct = Math.min(100, Math.round((enrolled / capacity) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Eyebrow className="text-ink-3">Cupo</Eyebrow>
        <span className="jersey-numeral text-sm text-gold-ink">
          {enrolled}
          <span className="text-ink-3">/{capacity}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gold-border/40">
        <div className={cn("h-full rounded-full bg-gold transition-all")} style={{ width: `${pct}%` }} aria-hidden />
      </div>
    </div>
  );
}
