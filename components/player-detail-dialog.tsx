"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { PositionChip, PrimaryButton } from "@/components/editorial";
import { PlayerStatGrid, ownershipText } from "@/components/domain/PlayerStats";
import { formatPrice, cn } from "@/lib/utils";
import type { Position } from "@/lib/game/config";
import type { FixtureInfo, PlayerStats } from "@/lib/queries";
import { flagUrl } from "@/lib/flags";

export type ExplorerPlayer = {
  id: number;
  name: string;
  position: Position;
  price: number;
  club: string | null;
  countryId: number;
  countryName: string;
  code: string | null;
  eliminatedRound: number | null;
};

const DIFF = {
  easy: { label: "Fácil", cls: "text-success border-success/30 bg-success/10", dot: "bg-success" },
  medium: { label: "Media", cls: "text-warning border-warning/40 bg-warning/10", dot: "bg-warning" },
  hard: { label: "Difícil", cls: "text-danger border-danger/30 bg-danger/10", dot: "bg-danger" },
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

/** "Fecha 1 — Grupos (J1)" -> "F1" */
function shortRound(name: string | null): string {
  if (!name) return "";
  const m = name.match(/Fecha\s+(\d+)/i);
  return m ? `F${m[1]}` : name;
}

export function PlayerDetailDialog({
  player,
  fixtures,
  stats,
  ownership,
  ownershipAvailable = false,
  onClose,
}: {
  player: ExplorerPlayer | null;
  fixtures: FixtureInfo[] | undefined;
  stats?: PlayerStats;
  ownership?: number;
  ownershipAvailable?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const firstKickoff = fixtures && fixtures[0] ? formatKickoff(fixtures[0].kickoff) : null;
  const hasStats = !!stats && stats.pj > 0;
  const eliminated = !!player && player.eliminatedRound != null;

  if (!player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Información de ${player.name}`}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[12px] border border-border bg-surface card-shadow-lg md:rounded-[12px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              {flagUrl(player.code) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flagUrl(player.code)!}
                  alt={player.countryName}
                  width={40}
                  height={28}
                  className="h-7 w-10 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div className="h-7 w-10 shrink-0 rounded-sm bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-xl leading-tight text-ink">{player.name}</h3>
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
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-ink-3 hover:bg-surface-2 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuántos equipos lo eligieron (solo con muestra suficiente; ver
                MIN_OWNERSHIP_SAMPLE). Sirve como señal a la hora de armar. Si nadie
                lo tiene (o <1%) igual se muestra "<1%", nunca queda en blanco. */}
            {ownershipAvailable && (
              <p className="text-xs text-ink-3">
                Lo eligió{" "}
                <span className="font-semibold text-ink-2">
                  {(ownership ?? 0) < 1 ? "menos del 1%" : `el ${ownershipText(ownership)}`}
                </span>{" "}
                de los equipos.
              </p>
            )}

            {/* Rendimiento acumulado en el torneo (solo si ya hay datos publicados) */}
            {hasStats && (
              <div className="rounded-[8px] border border-border bg-canvas p-3">
                <p className="eyebrow mb-2">Rendimiento en el torneo</p>
                <PlayerStatGrid stats={stats} position={player.position} />
              </div>
            )}

            {/* Próximos partidos del equipo */}
            <div className="rounded-[8px] border border-border bg-canvas p-3">
              <p className="eyebrow mb-2">Próximos partidos de {player.countryName}</p>
              {fixtures && fixtures.length > 0 ? (
                <div className="space-y-1.5">
                  {fixtures.map((fx, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-6 shrink-0 text-xs font-bold text-ink-3">{shortRound(fx.roundName)}</span>
                      <span className="shrink-0 text-xs text-ink-3" title={fx.isHome ? "De local" : "De visitante"}>
                        {fx.isHome ? "vs" : "@"}
                      </span>
                      {fx.opponentFlag ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fx.opponentFlag} alt="" width={18} height={13} className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{fx.opponentName}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
                          DIFF[fx.difficulty].cls,
                        )}
                        title={`Dificultad del rival: ${DIFF[fx.difficulty].label}`}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", DIFF[fx.difficulty].dot)} />
                        {DIFF[fx.difficulty].label}
                      </span>
                    </div>
                  ))}
                  {firstKickoff ? <p className="pt-1 text-[11px] text-ink-3">Arranca: {firstKickoff}</p> : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-2 text-[11px] text-ink-3">
                    <span className="font-semibold text-ink-3">Dificultad del partido:</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />Fácil
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" />Media
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger" />Difícil
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-3">
                  {player.eliminatedRound != null
                    ? "Selección eliminada del torneo."
                    : "Sin próximos partidos programados."}
                </p>
              )}
            </div>

            {!hasStats && (
              <p className="text-[11px] text-ink-3">
                Cuando arranque el Mundial, vas a poder ver acá su rendimiento por fecha.
              </p>
            )}

            {/* Puente con el armador: suma al jugador al equipo sin volver a buscarlo.
                /equipo lo coloca en un slot libre de su posición (no auto-guarda). */}
            {!eliminated && (
              <PrimaryButton
                className="w-full justify-center"
                onClick={() => {
                  router.push(`/equipo?add=${player.id}`);
                  onClose();
                }}
              >
                Agregar a mi equipo →
              </PrimaryButton>
            )}
        </div>
      </div>
    </div>
  );
}
