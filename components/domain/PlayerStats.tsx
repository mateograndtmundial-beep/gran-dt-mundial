import { Fragment, type ReactNode } from "react";
import { cn, formatPoints } from "@/lib/utils";
import type { Position } from "@/lib/game/config";
import type { PlayerStats } from "@/lib/queries";

/**
 * % de equipos que tienen al jugador, compacto. `undefined` = 0 dueños (no estaba
 * en el mapa) → "<1%". También "<1%" si redondea por debajo de 1. Solo el número.
 */
export function ownershipText(pct: number | undefined): string {
  const v = pct ?? 0;
  return v < 1 ? "<1%" : `${Math.round(v)}%`;
}

/** Etiqueta compacta con contexto: "12% lo eligió" / "<1% lo eligió". */
export function ownershipLabel(pct: number | undefined): string {
  return `${ownershipText(pct)} lo eligió`;
}

/**
 * Línea compacta de rendimiento, en gris sobrio. Dos variantes:
 * - "card" (/jugadores): rendimiento (PPP · G · figuras) que trunca a la izquierda
 *   + ownership (% de equipos que lo tienen) fijo a la derecha, siempre visible.
 * - "full" (picker del armador /equipo): PPP · PJ · G · figuras · % en línea, con wrap.
 * No renderiza nada si no hay ni stats ni ownership; "Sin jugar" si pj === 0.
 */
export function PlayerStatLine({
  stats,
  ownership,
  ownershipAvailable = false,
  statsAvailable = false,
  variant = "full",
  className,
}: {
  stats?: PlayerStats;
  ownership?: number;
  // Hay datos de ownership en el set (la fecha superó MIN_OWNERSHIP_SAMPLE). Con
  // esto, los jugadores sin dueños igual muestran "<1% lo eligió" (nunca blank).
  ownershipAvailable?: boolean;
  // Ya hay datos del torneo (alguna fecha publicada). Con esto, los jugadores que
  // todavía no jugaron muestran la leyenda "Sin jugar" en vez de un renglón vacío.
  statsAvailable?: boolean;
  variant?: "full" | "card";
  className?: string;
}) {
  if (!stats && !ownershipAvailable && !statsAvailable) return null;

  const played = !!stats && stats.pj > 0;
  // Abreviado para que ocupe menos en el renglón compacto: "G" (goles) y "Fig"
  // (figuras del partido). El detalle con label completo está en el dialog.
  const goles = played && stats!.goals > 0 ? `${stats!.goals} G` : null;
  const figuras = played && stats!.motm > 0 ? `${stats!.motm} Fig` : null;
  const ownTitle = ownershipAvailable ? `Lo eligió el ${ownershipText(ownership)} de los equipos` : undefined;
  const ownEl = ownershipAvailable ? (
    <span className="shrink-0" title={ownTitle}>{ownershipLabel(ownership)}</span>
  ) : null;

  if (variant === "card") {
    // Rendimiento (trunca) a la izquierda; ownership fijo a la derecha → el % que
    // justifica el orden "Más elegidos" siempre se ve, aunque el nombre sea largo.
    const perf = played ? (
      <>
        <span className="font-semibold">{formatPoints(stats!.ppp)}</span> pts/PJ
        {goles && <> · {goles}</>}
        {figuras && <> · {figuras}</>}
      </>
    ) : statsAvailable ? (
      "Sin jugar"
    ) : null;
    return (
      <span className={cn("flex items-center justify-between gap-2 text-[11px] text-ink-3", className)}>
        <span className="min-w-0 truncate">{perf}</span>
        {ownEl}
      </span>
    );
  }

  // full (picker): tokens en línea con separadores "·", con wrap en mobile.
  const tokens: ReactNode[] = [];
  if (played) {
    tokens.push(
      <span key="ppp"><span className="font-semibold">{formatPoints(stats!.ppp)}</span> pts/PJ</span>,
      <span key="pj">{stats!.pj} PJ</span>,
    );
    if (goles) tokens.push(<span key="g">{goles}</span>);
    if (figuras) tokens.push(<span key="f">{figuras}</span>);
  } else if (statsAvailable) {
    tokens.push(<span key="sj">Sin jugar</span>);
  }
  if (ownEl) tokens.push(<span key="own" title={ownTitle}>{ownershipLabel(ownership)}</span>);

  return (
    <span className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-3", className)}>
      {tokens.map((t, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden className="text-border-strong">·</span>}
          {t}
        </Fragment>
      ))}
    </span>
  );
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-[6px] bg-surface px-1 py-2 text-center">
      <span className="jersey-numeral text-lg leading-none tracking-tight text-ink">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
    </div>
  );
}

/**
 * Grid de detalle para el PlayerDetailDialog (/jugadores). Solo texto (sin
 * iconos). Posición-aware: arqueros/defensores muestran "Valla invicta";
 * mediocampistas/delanteros muestran "Penales" (convertidos/pateados, ej. 2/3).
 * "Figura" se muestra para todos. No renderiza nada si no hay datos.
 */
export function PlayerStatGrid({
  stats,
  position,
}: {
  stats?: PlayerStats;
  position: Position;
}) {
  if (!stats || stats.pj === 0) return null;
  const isKeeperOrDef = position === "GK" || position === "DEF";
  const penTaken = stats.penaltyGoals + stats.penaltyMissed;
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        <StatCell value={formatPoints(stats.ppp)} label="Pts/PJ" />
        <StatCell value={stats.pj} label="PJ" />
        <StatCell value={stats.avgRating != null ? formatPoints(stats.avgRating) : "—"} label="Rating" />
        <StatCell value={stats.goals} label="Goles" />
        <StatCell value={stats.assists} label="Asistencias" />
        <StatCell value={stats.motm} label="Figura" />
        <StatCell value={stats.yellow} label="Amarillas" />
        <StatCell value={stats.red} label="Rojas" />
        {isKeeperOrDef ? (
          <StatCell value={stats.cleanSheets} label="Valla inv." />
        ) : (
          <StatCell value={penTaken > 0 ? `${stats.penaltyGoals}/${penTaken}` : "0"} label="Penales" />
        )}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-ink-3">
        Los goles incluyen los de penal.
        {!isKeeperOrDef && " Penales: convertidos/pateados."}
      </p>
    </div>
  );
}
