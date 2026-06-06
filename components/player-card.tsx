import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { POSITION_COLORS, POSITION_BG, type Position } from "@/lib/game/config";
import { PositionChip } from "@/components/editorial";

export { PositionChip };

export function PlayerCard({
  name,
  position,
  price,
  club,
  countryName,
  flagUrl,
  eliminated,
  isCaptain,
  action,
  className,
}: {
  name: string;
  position: Position;
  price: number;
  club?: string | null;
  countryName: string;
  flagUrl?: string | null;
  eliminated?: boolean;
  isCaptain?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 bg-surface rounded-[8px] border card-shadow p-3",
        "border-l-4",
        "transition-all duration-150 hover:rotate-[1deg] hover:-translate-y-2 hover:card-shadow-lg",
        eliminated ? "opacity-50 grayscale" : "",
        isCaptain ? "border-gold" : "border-border",
        className,
      )}
      style={{ borderLeftColor: POSITION_COLORS[position] }}
    >
      {flagUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flagUrl} alt={countryName} className="h-5 w-7 rounded-sm object-cover shrink-0" />
      ) : (
        <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PositionChip position={position} />
          {isCaptain && (
            <span
              aria-label="Capitán"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gold text-gold-ink font-display text-[9px] leading-none"
            >
              C
            </span>
          )}
          <span className="truncate font-semibold text-ink text-sm">{name}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-3">
          {countryName}
          {club ? ` · ${club}` : ""}
          {eliminated ? (
            <span
              aria-label="Jugador eliminado del torneo"
              className="ml-1 inline-block -rotate-[6deg] rounded-sm bg-danger px-1 py-0.5 text-[9px] font-display text-white"
              style={{ boxShadow: "1px 1px 0 #991B1B" }}
            >
              ELIMINADO
            </span>
          ) : null}
        </p>
      </div>

      <div className="text-right shrink-0">
        <div className="jersey-numeral text-[clamp(1rem,2vw,1.25rem)] leading-none tracking-tight text-blue">
          {price}
          <span className="text-[10px] font-normal text-ink-3 ml-0.5">M</span>
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}

export function PlayerCardCompact({
  position,
  name,
  price,
  isCaptain,
}: {
  position: Position;
  name: string;
  price: number;
  isCaptain?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-display text-[11px] leading-none",
          isCaptain ? "ring-2 ring-gold ring-offset-1" : "",
        )}
        style={{ backgroundColor: POSITION_COLORS[position], color: POSITION_BG[position] }}
      >
        {position}
      </div>
      <span className="text-[10px] font-semibold text-white drop-shadow max-w-[72px] truncate leading-tight">
        {name.split(" ").slice(-1)[0]}
      </span>
      <span className="jersey-numeral text-[9px] text-gold leading-none">{price}M</span>
    </div>
  );
}
