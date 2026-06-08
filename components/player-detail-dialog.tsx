"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PositionChip } from "@/components/editorial";
import { formatPrice, cn } from "@/lib/utils";
import type { Position } from "@/lib/game/config";
import type { FixtureInfo } from "@/lib/queries";

export type ExplorerPlayer = {
  id: number;
  name: string;
  position: Position;
  price: number;
  club: string | null;
  countryId: number;
  countryName: string;
  flagUrl: string | null;
  eliminatedRound: number | null;
};

const DIFF = {
  easy: { label: "Baja", cls: "text-success border-success/30 bg-success/10", dot: "bg-success" },
  medium: { label: "Media", cls: "text-warning border-warning/40 bg-warning/10", dot: "bg-warning" },
  hard: { label: "Alta", cls: "text-danger border-danger/30 bg-danger/10", dot: "bg-danger" },
} as const;

function formatKickoff(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function PlayerDetailDialog({
  player,
  fixture,
  onClose,
}: {
  player: ExplorerPlayer | null;
  fixture: FixtureInfo | undefined;
  onClose: () => void;
}) {
  const kickoff = fixture ? formatKickoff(fixture.kickoff) : null;

  return (
    <Dialog
      open={!!player}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bg-surface text-ink sm:max-w-md">
        {player && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 pr-7">
              {player.flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.flagUrl}
                  alt={player.countryName}
                  width={40}
                  height={28}
                  className="h-7 w-10 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div className="h-7 w-10 shrink-0 rounded-sm bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate font-display text-xl leading-tight text-ink">
                  {player.name}
                </DialogTitle>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <PositionChip position={player.position} />
                  <span className="truncate text-xs text-ink-3">
                    {player.countryName}
                    {player.club ? ` · ${player.club}` : ""}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="jersey-numeral text-xl leading-none text-blue">
                  {formatPrice(player.price)}
                  <span className="ml-0.5 text-[10px] font-normal text-ink-3">M</span>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">Información del Mundial para {player.name}</DialogDescription>

            {/* Próximo partido */}
            <div className="rounded-[8px] border border-border bg-canvas p-3">
              <p className="eyebrow mb-2">Próximo partido</p>
              {fixture && fixture.opponentName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">{player.countryName}</span>
                    <span className="text-ink-faint" title={fixture.isHome ? "De local" : "De visitante"}>
                      {fixture.isHome ? "vs" : "@"}
                    </span>
                    {fixture.opponentFlag ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fixture.opponentFlag} alt="" width={20} height={14} className="h-3.5 w-5 rounded-[2px] object-cover" />
                    ) : null}
                    <span className="font-semibold text-ink">{fixture.opponentName}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    {fixture.roundName ? <span>{fixture.roundName}</span> : null}
                    {kickoff ? <span>· {kickoff}</span> : null}
                    {fixture.venue ? <span>· {fixture.venue}</span> : null}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-xs text-ink-3">Dificultad del rival:</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        DIFF[fixture.difficulty].cls,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", DIFF[fixture.difficulty].dot)} />
                      {DIFF[fixture.difficulty].label}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-faint">
                  {player.eliminatedRound != null
                    ? "Selección eliminada del torneo."
                    : "Sin próximo partido programado."}
                </p>
              )}
            </div>

            <p className="text-[11px] text-ink-faint">
              Cuando arranque el Mundial sumamos acá su forma (puntos por fecha) y qué % de los equipos lo tiene.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
