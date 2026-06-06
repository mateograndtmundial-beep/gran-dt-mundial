"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/utils";

type RoundPoints = {
  id: number;
  roundName: string;
  points: number;
};

export function PointsBreakdown({ rounds }: { rounds: RoundPoints[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (rounds.length === 0) {
    return (
      <p className="text-sm text-ink-3 py-4">Todavía no hay fechas jugadas.</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rounds.map((r) => {
        const isOpen = openId === r.id;
        return (
          <div key={r.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : r.id)}
              className="flex w-full items-center justify-between py-3 text-left hover:bg-surface-2/50 transition-colors px-1 rounded-[4px]"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-ink-3 transition-transform duration-150",
                    isOpen ? "rotate-180" : "",
                  )}
                  aria-hidden
                />
                <span className="font-semibold text-sm text-ink">{r.roundName}</span>
              </div>
              <span className="jersey-numeral text-base text-ink leading-none tracking-tight">
                {formatPoints(r.points)}
                <span className="text-xs font-normal text-ink-3 ml-0.5">pts</span>
              </span>
            </button>

            {isOpen && (
              <div className="pb-3 pl-8 animate-fade-in">
                <p className="text-xs text-ink-faint italic">
                  Detalle por jugador disponible al publicar los puntajes de la fecha.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
