"use client";

/**
 * Pitch — cancha SVG con atmósfera de estadio + figuritas estilo álbum del Mundial.
 * Se usa editable en el armador (FieldBuilder) y read-only en Mi Equipo.
 */
import { X } from "lucide-react";
import {
  POSITION_COLORS,
  POSITION_BG,
  POSITION_LABELS,
  POSITION_ABBR,
  type Position,
} from "@/lib/game/config";
import { cn, formatPrice } from "@/lib/utils";
// Lógica de slots centralizada en lib/game/lineup (compartida con el server action).
import { buildSlots, ROWS, type Slot } from "@/lib/game/lineup";
import { flagUrl } from "@/lib/flags";

export { buildSlots, ROWS };
export type { Slot };

/** Forma mínima de jugador que la figurita necesita. */
export type PitchPlayer = {
  id: number;
  name: string;
  position: Position;
  code?: string | null;
  countryName: string;
  price?: number;
  eliminatedRound?: number | null;
};

/* Partículas que forman parte del apellido y deben conservarse:
   "De Bruyne", "Van Dijk", "Van de Beek", "Di María", "De Paul"… */
const NAME_PARTICLES = new Set([
  "de", "del", "della", "der", "den", "van", "von", "da", "di", "do", "dos",
  "das", "la", "le", "el", "al", "bin", "ben", "mac", "mc", "st", "san",
  "santa", "ter", "te", "ten", "vande", "vander", "y",
]);

/** Apellido para la figurita: último token + partículas previas (de, van, der…). */
export function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  let i = parts.length - 1;
  // Conservamos al menos el primer token como nombre (i > 1).
  while (i > 1 && NAME_PARTICLES.has(parts[i - 1].toLowerCase())) i--;
  return parts.slice(i).join(" ");
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
  onDragStart,
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
  onDragStart?: (e: React.PointerEvent) => void;
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
            {POSITION_ABBR[slot.position]}
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
        onPointerDown={editable ? onDragStart : undefined}
        disabled={!editable}
        className={cn(
          "flex flex-col items-center gap-1 rounded-[7px] p-[3px] pt-2.5",
          editable && "touch-none transition-transform hover:-translate-y-0.5",
        )}
      >
        {/* Bandera = protagonista (figurita) */}
        <span
          className={cn(
            "relative block overflow-hidden rounded-[4px] bg-white card-shadow",
            isCaptain ? "ring-2 ring-gold" : "ring-1 ring-black/10",
          )}
          style={{ borderBottom: `3px solid ${color}` }}
        >
          {flagUrl(player.code) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flagUrl(player.code)!}
              alt={player.countryName}
              width={48}
              height={32}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-8 w-12 object-cover"
            />
          ) : (
            <span
              className="flex h-8 w-12 items-center justify-center font-display text-[11px]"
              style={{ backgroundColor: POSITION_BG[slot.position], color }}
            >
              {POSITION_ABBR[slot.position]}
            </span>
          )}
        </span>

        {/* Placa de nombre (legible sobre el pasto). Sin ícono de drag&drop: en
            formaciones con 4 en una línea no entraba sin cortar la figurita.
            La figurita entera sigue siendo arrastrable (ver onPointerDown). */}
        <span className="flex max-w-[78px] items-center rounded-[3px] bg-surface/95 px-1.5 py-px card-shadow">
          <span className="truncate text-[11px] font-bold leading-tight text-ink">
            {lastName(player.name)}
          </span>
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
  onSlotPointerDown,
  dropPosition,
  dragSlotId,
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
  /** Arranca el drag de un titular (para reordenar o mandarlo al banco). */
  onSlotPointerDown?: (e: React.PointerEvent, slot: Slot, player: PitchPlayer) => void;
  /** Posición que se está arrastrando: resalta los slots compatibles como destino. */
  dropPosition?: Position | null;
  /** Slot que se está arrastrando ahora mismo (se atenúa en su origen). */
  dragSlotId?: string | null;
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
                <div
                  key={s.id}
                  data-slot-id={s.id}
                  data-position={s.position}
                  data-starter="1"
                  className={cn(
                    "rounded-[10px] transition-all",
                    dropPosition === s.position && s.id !== dragSlotId &&
                      "ring-2 ring-gold ring-offset-2 ring-offset-[#16713F]",
                    dragSlotId === s.id && "opacity-40",
                  )}
                >
                  <Figurita
                    slot={s}
                    player={picks[s.id]}
                    isCaptain={picks[s.id]?.id === captainId}
                    editable={editable}
                    eliminated={picks[s.id]?.eliminatedRound != null}
                    onOpen={() => onOpenSlot?.(s)}
                    onClear={() => onClearSlot?.(s.id)}
                    onToggleCaptain={() => onToggleCaptain?.(s.id)}
                    onDragStart={(e) => {
                      const pl = picks[s.id];
                      if (pl) onSlotPointerDown?.(e, s, pl);
                    }}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
