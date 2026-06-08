"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn, formatPoints } from "@/lib/utils";
import { PositionChip } from "@/components/editorial";
import { getRoundBreakdownAction } from "@/lib/breakdown-actions";
import type { RoundBreakdown, BreakdownLine, BreakdownChip } from "@/lib/scoring/desglose";

type RoundPoints = { id: number; roundName: string; points: number };

type CacheEntry = RoundBreakdown | "loading" | "error";

const CHIP_STYLE: Record<BreakdownChip["kind"], string> = {
  base: "bg-blue-light text-blue",
  cap: "bg-gold-bg text-gold-ink",
  pos: "bg-success-bg text-success",
  neg: "bg-danger-bg text-danger",
};

function Chip({ chip }: { chip: BreakdownChip }) {
  return (
    <span className={cn("inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold", CHIP_STYLE[chip.kind])}>
      {chip.label}
    </span>
  );
}

function Flag({ url, alt }: { url: string | null; alt: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} width={24} height={16} loading="lazy" decoding="async" className="mt-0.5 h-4 w-6 shrink-0 rounded-sm object-cover" />
  ) : (
    <div className="mt-0.5 h-4 w-6 shrink-0 rounded-sm bg-surface-2" />
  );
}

function PlayerRow({ line, muted }: { line: BreakdownLine; muted?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2.5 py-2", (muted || line.eliminated) && "opacity-50")}>
      <Flag url={line.flagUrl} alt={line.countryName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink">{line.name}</span>
          <PositionChip position={line.position} />
          {line.isCaptain && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gold font-display text-[9px] leading-none text-gold-ink">
              C
            </span>
          )}
        </div>
        {line.note && <p className="mt-0.5 text-[11px] text-ink-3">{line.note}</p>}
        {line.chips.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {line.chips.map((c, i) => (
              <Chip key={i} chip={c} />
            ))}
          </div>
        )}
      </div>
      <span className={cn("jersey-numeral shrink-0 text-sm leading-none", line.total < 0 ? "text-danger" : "text-ink")}>
        {formatPoints(line.total)}
      </span>
    </div>
  );
}

function Detail({ data }: { data: Extract<RoundBreakdown, { published: true }> }) {
  const coachLabel =
    data.coach?.result === "win" ? "Ganó" :
    data.coach?.result === "loss" ? "Perdió" :
    data.coach?.result === "draw" ? "Empató" : "Sin resultado";

  return (
    <div className="space-y-4 pt-1">
      <div>
        <p className="eyebrow mb-1">Titulares</p>
        <div className="divide-y divide-border/60">
          {data.starters.map((l, i) => (
            <PlayerRow key={`s-${i}-${l.playerId}`} line={l} />
          ))}
        </div>
      </div>

      {data.coach && (
        <div>
          <p className="eyebrow mb-1">Técnico</p>
          <div className="flex items-center gap-2.5 py-1.5">
            <Flag url={data.coach.flagUrl} alt={data.coach.countryName} />
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-semibold text-ink">{data.coach.name}</span>
              <p className="text-[11px] text-ink-3">
                {coachLabel}
                {data.coach.result ? ` · ${data.coach.countryName}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "jersey-numeral shrink-0 text-sm leading-none",
                data.coach.points < 0 ? "text-danger" : data.coach.points > 0 ? "text-success" : "text-ink-3",
              )}
            >
              {data.coach.points > 0 ? `+${formatPoints(data.coach.points)}` : formatPoints(data.coach.points)}
            </span>
          </div>
        </div>
      )}

      {data.benchUnused.length > 0 && (
        <div>
          <p className="eyebrow mb-1">Suplentes (no entraron)</p>
          <div className="divide-y divide-border/60">
            {data.benchUnused.map((l, i) => (
              <PlayerRow key={`b-${i}-${l.playerId}`} line={l} muted />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PointsBreakdown({ rounds }: { rounds: RoundPoints[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [cache, setCache] = useState<Record<number, CacheEntry>>({});

  if (rounds.length === 0) {
    return <p className="py-4 text-sm text-ink-3">Todavía no hay fechas jugadas.</p>;
  }

  async function toggle(id: number) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next == null || cache[next] !== undefined) return;
    setCache((c) => ({ ...c, [next]: "loading" }));
    try {
      const r = await getRoundBreakdownAction(next);
      setCache((c) => ({ ...c, [next]: r ?? "error" }));
    } catch {
      setCache((c) => ({ ...c, [next]: "error" }));
    }
  }

  return (
    <div className="divide-y divide-border">
      {rounds.map((r) => {
        const isOpen = openId === r.id;
        const data = cache[r.id];
        return (
          <div key={r.id}>
            <button
              onClick={() => toggle(r.id)}
              className="flex w-full items-center justify-between rounded-[4px] px-1 py-3 text-left transition-colors hover:bg-surface-2/50"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  size={16}
                  className={cn("text-ink-3 transition-transform duration-150", isOpen && "rotate-180")}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-ink">{r.roundName}</span>
              </div>
              <span className="jersey-numeral text-base leading-none tracking-tight text-ink">
                {formatPoints(r.points)}
                <span className="ml-0.5 text-xs font-normal text-ink-3">pts</span>
              </span>
            </button>

            {isOpen && (
              <div className="animate-fade-in pb-3 pl-8 pr-1">
                {data === undefined || data === "loading" ? (
                  <p className="flex items-center gap-2 py-2 text-xs italic text-ink-3">
                    <Loader2 size={13} className="animate-spin" aria-hidden /> Cargando detalle…
                  </p>
                ) : data === "error" ? (
                  <p className="py-2 text-xs italic text-ink-3">No se pudo cargar el detalle.</p>
                ) : data.published === false ? (
                  <p className="py-2 text-xs italic text-ink-3">
                    El detalle por jugador aparece cuando se publican los puntajes de la fecha.
                  </p>
                ) : (
                  <Detail data={data} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
