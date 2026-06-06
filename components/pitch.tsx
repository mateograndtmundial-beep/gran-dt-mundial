"use client";

/**
 * Pitch — cancha SVG con atmósfera de estadio + figuritas estilo álbum del Mundial.
 * Se usa editable en el armador (FieldBuilder) y read-only en Mi Equipo.
 */
import { X } from "lucide-react";
import {
  FORMATIONS,
  DEFAULT_FORMATION,
  POSITION_COLORS,
  POSITION_BG,
  POSITION_LABELS,
  type Position,
} from "@/lib/game/config";
import { cn, formatPrice } from "@/lib/utils";

export type Slot = { id: string; position: Position; isStarter: boolean };
export const ROWS: Position[] = ["GK", "DEF", "MID", "FWD"];

/** Forma mínima de jugador que la figurita necesita. */
export type PitchPlayer = {
  id: number;
  name: string;
  position: Position;
  flagUrl?: string | null;
  countryName: string;
  price?: number;
  eliminatedRound?: number | null;
};

export function buildSlots(formation: string): Slot[] {
  const shape = FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION];
  const slots: Slot[] = [];
  ROWS.forEach((pos) => {
    for (let i = 0; i < shape[pos]; i++)
      slots.push({ id: `${pos}_${i + 1}`, position: pos, isStarter: true });
  });
  ROWS.forEach((pos) => slots.push({ id: `SUB_${pos}`, position: pos, isStarter: false }));
  return slots;
}

/** Apellido (último token del nombre). */
export function lastName(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length > 1 ? parts.slice(-1)[0] : name;
}

/* ─── SVG de la cancha ─── */
export function PitchSVG() {
  return (
    <svg
      viewBox="0 0 300 430"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect width="300" height="430" fill="#16713F" />
      <rect y="0" width="300" height="86" fill="#0F5A30" opacity="0.45" />
      <rect y="172" width="300" height="86" fill="#0F5A30" opacity="0.45" />
      <rect y="344" width="300" height="86" fill="#0F5A30" opacity="0.45" />
      <defs>
        <radialGradient id="stadium-lights" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="70%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="430" fill="url(#stadium-lights)" />
      <rect x="10" y="10" width="280" height="410" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <line x1="10" y1="215" x2="290" y2="215" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <circle cx="150" cy="215" r="36" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <circle cx="150" cy="215" r="2.5" fill="rgba(255,255,255,0.28)" />
      <rect x="55" y="10" width="190" height="78" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <rect x="100" y="10" width="100" height="27" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <circle cx="150" cy="66" r="2" fill="rgba(255,255,255,0.22)" />
      <rect x="55" y="342" width="190" height="78" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <rect x="100" y="393" width="100" height="27" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <circle cx="150" cy="364" r="2" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

/* ─── Cinta de capitán ─── */
function CaptainTab({
  active,
  editable,
  onToggle,
}: {
  active: boolean;
  editable?: boolean;
  onToggle?: () => void;
}) {
  const base =
    "flex h-[18px] w-[18px] items-center justify-center rounded-full font-display text-[11px] leading-none shadow-sm";
  if (!editable) {
    if (!active) return null;
    return (
      <span className={cn(base, "bg-gold text-gold-ink")} aria-label="Capitán" title="Capitán">
        C
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? "Quitar capitán" : "Hacer capitán"}
      aria-label={active ? "Quitar capitán" : "Hacer capitán"}
      className={cn(
        base,
        "transition-colors",
        active
          ? "bg-gold text-gold-ink"
          : "bg-black/35 text-white/80 hover:bg-black/55",
      )}
    >
      C
    </button>
  );
}

/* ─── Figurita: slot vacío o con jugador ─── */
export function Figurita({
  slot,
  player,
  isCaptain,
  editable,
  allowCaptain = true,
  eliminated,
  onOpen,
  onClear,
  onToggleCaptain,
}: {
  slot: Slot;
  player?: PitchPlayer;
  isCaptain: boolean;
  editable?: boolean;
  allowCaptain?: boolean;
  eliminated?: boolean;
  onOpen?: () => void;
  onClear?: () => void;
  onToggleCaptain?: () => void;
}) {
  const color = POSITION_COLORS[slot.position];

  /* Vacío (solo en modo editable) */
  if (!player) {
    if (!editable) {
      return (
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/25"
          aria-hidden
        />
      );
    }
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex flex-col items-center gap-1"
        aria-label={`Agregar ${POSITION_LABELS[slot.position]}`}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/40 transition-colors group-hover:border-white/80"
          style={{ backgroundColor: color + "2e" }}
        >
          <span className="font-display text-[11px] leading-none text-white/85">
            {slot.position}
          </span>
        </div>
        <span className="text-[9px] font-semibold leading-none text-white/70">+ Agregar</span>
      </button>
    );
  }

  /* Lleno — figurita Mundial */
  return (
    <div
      className={cn(
        "relative flex flex-col items-center",
        editable && "animate-sticker-slap",
      )}
    >
      {/* Acciones flotantes */}
      <div className="absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
        {allowCaptain && (
          <CaptainTab active={isCaptain} editable={editable} onToggle={onToggleCaptain} />
        )}
        {eliminated && (
          <span
            aria-label="Jugador eliminado del torneo"
            className="shrink-0 -rotate-[6deg] rounded-sm bg-danger px-1 py-0.5 text-[9px] font-display leading-none text-white"
            style={{ boxShadow: "1px 1px 0 #991B1B" }}
          >
            ELIM
          </span>
        )}
        {editable && (
          <button
            type="button"
            onClick={onClear}
            title="Quitar"
            aria-label="Quitar jugador"
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/35 text-white/80 shadow-sm transition-colors hover:bg-danger"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={editable ? onOpen : undefined}
        disabled={!editable}
        className={cn(
          "flex flex-col items-center gap-1 rounded-[7px] p-[3px] pt-2.5",
          editable && "transition-transform hover:-translate-y-0.5",
        )}
      >
        {/* Bandera = protagonista (figurita) */}
        <span
          className={cn(
            "block overflow-hidden rounded-[4px] bg-white card-shadow",
            isCaptain ? "ring-2 ring-gold" : "ring-1 ring-black/10",
          )}
          style={{ borderBottom: `3px solid ${color}` }}
        >
          {player.flagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.flagUrl}
              alt={player.countryName}
              className="h-8 w-12 object-cover"
            />
          ) : (
            <span
              className="flex h-8 w-12 items-center justify-center font-display text-[11px]"
              style={{ backgroundColor: POSITION_BG[slot.position], color }}
            >
              {slot.position}
            </span>
          )}
        </span>

        {/* Placa de nombre (legible sobre el pasto) */}
        <span className="max-w-[72px] truncate rounded-[3px] bg-surface/95 px-1.5 py-px text-[11px] font-bold leading-tight text-ink card-shadow">
          {lastName(player.name)}
        </span>

        {/* Precio */}
        {player.price != null && (
          <span className="jersey-numeral text-[10px] leading-none text-gold-bg drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
            {formatPrice(player.price)}M
          </span>
        )}
      </button>
    </div>
  );
}

/* ─── Pitch — SVG + filas de figuritas titulares ─── */
export function Pitch({
  formation,
  picks,
  captainId,
  editable,
  onOpenSlot,
  onClearSlot,
  onToggleCaptain,
  className,
  style,
}: {
  formation: string;
  picks: Record<string, PitchPlayer | undefined>;
  captainId: number | null;
  editable?: boolean;
  onOpenSlot?: (slot: Slot) => void;
  onClearSlot?: (slotId: string) => void;
  onToggleCaptain?: (slotId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const starterSlots = buildSlots(formation).filter((s) => s.isStarter);

  return (
    <div
      style={style}
      className={cn(
        "relative mx-auto aspect-[300/430] max-w-full overflow-hidden rounded-[10px] card-shadow-lg",
        className,
      )}
    >
      <div className="absolute inset-0">
        <PitchSVG />
      </div>

      {/* Filas: FWD arriba (ataque), GK abajo */}
      <div className="absolute inset-0 flex flex-col justify-between px-3 py-5">
        {[...ROWS].reverse().map((pos) => {
          const rowSlots = starterSlots.filter((s) => s.position === pos);
          if (rowSlots.length === 0) return null;
          return (
            <div key={pos} className="flex items-center justify-evenly gap-1">
              {rowSlots.map((s) => (
                <Figurita
                  key={s.id}
                  slot={s}
                  player={picks[s.id]}
                  isCaptain={picks[s.id]?.id === captainId}
                  editable={editable}
                  eliminated={picks[s.id]?.eliminatedRound != null}
                  onOpen={() => onOpenSlot?.(s)}
                  onClear={() => onClearSlot?.(s.id)}
                  onToggleCaptain={() => onToggleCaptain?.(s.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
