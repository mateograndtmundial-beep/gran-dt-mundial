import type { ReactNode } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { POSITION_COLORS, type Position } from "@/lib/game/config";
import { PositionChip } from "@/components/editorial";
import { PlayerStatLine } from "@/components/domain/PlayerStats";
import type { PlayerStats } from "@/lib/queries";
import { flagUrl } from "@/lib/flags";

export { PositionChip };

export function PlayerCard({
  name,
  position,
  price,
  club,
  countryName,
  code,
  eliminated,
  isCaptain,
  stats,
  ownership,
  ownershipAvailable = false,
  statsAvailable = false,
  showStatsSlot = false,
  action,
  className,
}: {
  name: string;
  position: Position;
  price: number;
  club?: string | null;
  countryName: string;
  code?: string | null;
  eliminated?: boolean;
  isCaptain?: boolean;
  stats?: PlayerStats;
  ownership?: number;
  ownershipAvailable?: boolean;
  statsAvailable?: boolean;
  showStatsSlot?: boolean;
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
      {flagUrl(code) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flagUrl(code)!} alt={countryName} width={28} height={20} loading="lazy" decoding="async" className="h-5 w-7 rounded-sm object-cover shrink-0" />
      ) : (
        <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        {/* Línea 1: nombre a ancho completo (lo más importante, que no se pierda) */}
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-ink text-sm leading-tight">{name}</span>
          {isCaptain && (
            <span
              aria-label="Capitán"
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink font-display text-[9px] leading-none"
            >
              C
            </span>
          )}
        </div>
        {/* Línea 2: chip de posición + país · club */}
        <div className="mt-1 flex items-center gap-1.5">
          <PositionChip position={position} />
          <span className="min-w-0 truncate text-xs text-ink-3">
            {countryName}
            {club ? ` · ${club}` : ""}
          </span>
          {eliminated ? (
            <span
              aria-label="Jugador eliminado del torneo"
              className="shrink-0 -rotate-[6deg] rounded-sm bg-danger px-1 py-0.5 text-[9px] font-display text-white"
              style={{ boxShadow: "1px 1px 0 #991B1B" }}
            >
              ELIM
            </span>
          ) : null}
        </div>
        {/* Línea 3: rendimiento (PPP · goles · figuras). Se reserva el alto cuando
            hay datos en el torneo, así las cards sin stats igualan a las que sí
            tienen (no se rompe la grilla). Pre-Mundial (sin datos) no se reserva. */}
        {showStatsSlot && (
          <div className="mt-1 min-h-[1rem]">
            <PlayerStatLine stats={stats} ownership={ownership} ownershipAvailable={ownershipAvailable} statsAvailable={statsAvailable} variant="card" />
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="jersey-numeral text-[clamp(1rem,2vw,1.25rem)] leading-none tracking-tight text-blue">
          {formatPrice(price)}
          <span className="text-[10px] font-normal text-ink-3 ml-0.5">M</span>
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
