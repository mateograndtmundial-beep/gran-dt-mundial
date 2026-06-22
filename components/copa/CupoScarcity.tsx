"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { getCopasStatus } from "@/lib/payment-actions";
import { cn } from "@/lib/utils";

type Scarcity = "none" | "low" | "last";

/**
 * Señal de escasez de una copa premium para usuarios NO inscriptos. A propósito NO
 * muestra el número de inscriptos ni una barra de progreso (eso delataría que la copa
 * recién arranca y daría sensación de "vacío"). Solo enciende una leyenda cuando de
 * verdad falta poco:
 *   - "low"  (≥80% lleno) → "Quedan pocos cupos"
 *   - "last" (≥95% lleno) → "Últimos lugares"
 * Cuando hay lugar de sobra ("none") no renderiza nada.
 *
 * Arranca con el valor del server y refresca por polling (cada 30s). El server
 * (getCopasStatus) ya oculta enrolled/spotsLeft para no inscriptos, así que ni siquiera
 * el número exacto viaja al cliente: solo este flag.
 */
export function CupoScarcity({
  copaId,
  initialScarcity,
}: {
  copaId: number;
  initialScarcity: Scarcity;
}) {
  const [scarcity, setScarcity] = useState<Scarcity>(initialScarcity);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const copas = await getCopasStatus();
        const me = copas.find((c) => c.id === copaId);
        if (alive && me) setScarcity(me.scarcity);
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

  if (scarcity === "none") return null;

  const isLast = scarcity === "last";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
        isLast
          ? "bg-red-100 text-red-700 animate-pulse"
          : "bg-amber-100 text-amber-800",
      )}
    >
      <Flame size={13} className="shrink-0" aria-hidden />
      {isLast ? "Últimos lugares" : "Quedan pocos cupos"}
    </div>
  );
}
