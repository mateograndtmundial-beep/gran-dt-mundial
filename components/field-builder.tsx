"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Star } from "lucide-react";
import {
  FORMATIONS,
  DEFAULT_FORMATION,
  BUDGET,
  MAX_PER_COUNTRY,
  POSITION_COLORS,
  POSITION_BG,
  POSITION_LABELS,
  type Position,
} from "@/lib/game/config";
import { saveLineup } from "@/lib/actions";
import type { PlayerRow, CoachRow } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Eyebrow, ValidationCallout, PrimaryButton } from "@/components/editorial";

type Slot = { id: string; position: Position; isStarter: boolean };
const ROWS: Position[] = ["GK", "DEF", "MID", "FWD"];

function buildSlots(formation: string): Slot[] {
  const shape = FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION];
  const slots: Slot[] = [];
  ROWS.forEach((pos) => {
    for (let i = 0; i < shape[pos]; i++)
      slots.push({ id: `${pos}_${i + 1}`, position: pos, isStarter: true });
  });
  ROWS.forEach((pos) => slots.push({ id: `SUB_${pos}`, position: pos, isStarter: false }));
  return slots;
}

/* ─── SVG Cancha ─── */
function PitchSVG() {
  return (
    <svg
      viewBox="0 0 300 430"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden
    >
      {/* Fondo verde base */}
      <rect width="300" height="430" fill="#16713F" />
      {/* Franjas de pasto alternadas */}
      <rect y="0"   width="300" height="86" fill="#0F5A30" opacity="0.45" />
      <rect y="172" width="300" height="86" fill="#0F5A30" opacity="0.45" />
      <rect y="344" width="300" height="86" fill="#0F5A30" opacity="0.45" />
      {/* Gradiente luces de estadio (radial, focos desde arriba) */}
      <defs>
        <radialGradient id="stadium-lights" cx="50%" cy="38%" r="65%">
          <stop offset="0%"  stopColor="white" stopOpacity="0.08" />
          <stop offset="70%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="430" fill="url(#stadium-lights)" />
      {/* Líneas del campo */}
      {/* Borde exterior */}
      <rect x="10" y="10" width="280" height="410" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      {/* Medio campo */}
      <line x1="10" y1="215" x2="290" y2="215" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      {/* Círculo central */}
      <circle cx="150" cy="215" r="36" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <circle cx="150" cy="215" r="2.5" fill="rgba(255,255,255,0.28)" />
      {/* Área penal superior */}
      <rect x="55" y="10" width="190" height="78" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <rect x="100" y="10" width="100" height="27" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <circle cx="150" cy="66" r="2" fill="rgba(255,255,255,0.22)" />
      {/* Área penal inferior */}
      <rect x="55" y="342" width="190" height="78" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <rect x="100" y="393" width="100" height="27" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <circle cx="150" cy="364" r="2" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

/* ─── SlotChip — slot vacío o con jugador ─── */
function SlotChip({
  slot,
  player,
  isCaptain,
  compact,
  onOpen,
  onClear,
  onCaptain,
}: {
  slot: Slot;
  player?: PlayerRow;
  isCaptain: boolean;
  compact?: boolean;
  onOpen: () => void;
  onClear: () => void;
  onCaptain?: () => void;
}) {
  if (!player) {
    return (
      <button
        onClick={onOpen}
        className="flex flex-col items-center gap-1 group"
        aria-label={`Agregar ${POSITION_LABELS[slot.position]}`}
      >
        <div
          className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center transition-colors group-hover:border-white/60"
          style={{ backgroundColor: POSITION_COLORS[slot.position] + "33" }}
        >
          <span className="text-white/70 text-[10px] font-display leading-none">
            {slot.position}
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-medium leading-tight">+ Agregar</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-0.5 text-center cursor-pointer",
        "animate-sticker-slap",
      )}
    >
      {/* Botones de acción flotantes */}
      <div className="absolute -right-1 -top-1 flex gap-0.5 z-10">
        {!compact && onCaptain && (
          <button
            onClick={onCaptain}
            title="Capitán"
            aria-label={isCaptain ? "Quitar capitán" : "Hacer capitán"}
            className={cn(
              "rounded-full p-0.5 transition-colors",
              isCaptain ? "bg-gold text-gold-ink" : "bg-white/20 text-white/70 hover:bg-white/40",
            )}
          >
            <Star size={11} fill={isCaptain ? "currentColor" : "none"} />
          </button>
        )}
        <button
          onClick={onClear}
          title="Quitar"
          aria-label="Quitar jugador"
          className="rounded-full bg-white/20 p-0.5 text-white/70 hover:bg-white/40 transition-colors"
        >
          <X size={11} />
        </button>
      </div>

      <button onClick={onOpen} className="flex flex-col items-center gap-0.5">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-display text-[10px] leading-none transition-transform hover:scale-105",
            isCaptain ? "ring-2 ring-gold ring-offset-1 ring-offset-transparent" : "",
          )}
          style={{
            backgroundColor: POSITION_COLORS[slot.position],
            color: POSITION_BG[slot.position],
          }}
        >
          {slot.position}
        </div>
        <span className="text-[10px] font-semibold text-white drop-shadow max-w-[72px] truncate leading-tight">
          {player.name.split(" ").slice(-1)[0]}
        </span>
        <span className="jersey-numeral text-[9px] text-gold leading-none">{player.price}M</span>
      </button>
    </div>
  );
}

/* ─── FieldBuilder ─── */
export function FieldBuilder({
  players,
  coaches,
  budget = BUDGET,
}: {
  players: PlayerRow[];
  coaches: CoachRow[];
  budget?: number;
}) {
  const router = useRouter();
  const [formation, setFormation]   = useState(DEFAULT_FORMATION);
  const [picks, setPicks]           = useState<Record<string, PlayerRow>>({});
  const [captainId, setCaptainId]   = useState<number | null>(null);
  const [coachId, setCoachId]       = useState<number | null>(null);
  const [modal, setModal]           = useState<{ type: "player"; slot: Slot } | { type: "coach" } | null>(null);
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState<string | null>(null);

  const slots     = useMemo(() => buildSlots(formation), [formation]);
  const coach     = coaches.find((c) => c.id === coachId) ?? null;
  const chosen    = Object.values(picks);
  const used      = chosen.reduce((s, p) => s + p.price, 0) + (coach?.price ?? 0);
  const remaining = budget - used;

  const countByCountry = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of chosen) m.set(p.countryId, (m.get(p.countryId) ?? 0) + 1);
    return m;
  }, [chosen]);
  const maxCountry = countByCountry.size ? Math.max(...countByCountry.values()) : 0;

  const starterSlots  = slots.filter((s) => s.isStarter);
  const startersFilled = starterSlots.every((s) => picks[s.id]);
  const captainOk     = captainId != null && starterSlots.some((s) => picks[s.id]?.id === captainId);

  const errors: string[] = [];
  if (!startersFilled) errors.push("Completá los 11 titulares");
  if (remaining < 0)   errors.push("Te pasaste del presupuesto");
  if (maxCountry > MAX_PER_COUNTRY) errors.push(`Máx ${MAX_PER_COUNTRY} jugadores por selección`);
  if (!captainOk)      errors.push("Elegí un capitán");
  if (!coachId)        errors.push("Elegí un técnico");
  const valid = errors.length === 0;

  function onFormationChange(f: string) {
    const nextIds = new Set(buildSlots(f).map((s) => s.id));
    setPicks((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => nextIds.has(id))));
    setFormation(f);
  }
  function pickPlayer(slotId: string, player: PlayerRow) {
    setPicks((prev) => ({ ...prev, [slotId]: player }));
    setModal(null);
    setSearch("");
  }
  function clearSlot(slotId: string) {
    setPicks((prev) => {
      const n = { ...prev };
      const removed = n[slotId];
      delete n[slotId];
      if (removed?.id === captainId) setCaptainId(null);
      return n;
    });
  }

  const pickedIds    = new Set(chosen.map((p) => p.id));
  const modalPlayers = modal?.type === "player"
    ? players
        .filter(
          (p) =>
            p.position === modal.slot.position &&
            !pickedIds.has(p.id) &&
            p.name.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 120)
    : [];
  const modalCoaches = modal?.type === "coach"
    ? coaches
        .filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.countryName.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 120)
    : [];

  async function onSave() {
    setSaving(true);
    setMessage(null);
    const payloadPlayers = Object.entries(picks).map(([slot, p]) => ({
      playerId: p.id,
      isStarter: !slot.startsWith("SUB_"),
      slot,
    }));
    const res = await saveLineup({
      formation,
      captainPlayerId: captainId,
      coachId,
      players: payloadPlayers,
      budgetUsed: used,
    });
    setSaving(false);
    if (!res.ok && res.error === "auth") { router.push("/sign-in"); return; }
    if (!res.ok && res.error === "pins") {
      setMessage(`Necesitás ${res.needed} pin(es) para esos cambios (tenés ${res.balance}).`);
      return;
    }
    if (!res.ok) { setMessage("No se pudo guardar. Revisá la base de datos."); return; }
    router.push("/mi-equipo");
  }

  /* Porcentaje de presupuesto usado */
  const budgetPct = Math.min(100, Math.round((used / budget) * 100));

  return (
    <div className="space-y-4">
      {/* Banner de deadline */}
      <div className="rounded-[6px] bg-blue-light border border-blue-border px-4 py-2">
        <span className="eyebrow text-blue-ink">
          CERRÁ TU EQUIPO · ANTES DEL 11 JUN 09:00
        </span>
      </div>

      {/* FormationSelector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Eyebrow>Formación</Eyebrow>
        <div className="flex gap-1.5 flex-wrap">
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => onFormationChange(f)}
              className={cn(
                "font-display text-sm px-3 py-1 rounded-[4px] transition-colors leading-none",
                formation === f
                  ? "bg-blue text-white"
                  : "bg-surface border border-border text-ink-2 hover:border-border-strong",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        {/* ─── Cancha (55%) ─── */}
        <div
          className="relative rounded-[8px] overflow-hidden card-shadow-lg"
          style={{ aspectRatio: "300/430" }}
        >
          {/* SVG del pitch (fondo) */}
          <div className="absolute inset-0">
            <PitchSVG />
          </div>

          {/* Filas de slots (FWD en top, GK en bottom — attacking direction up) */}
          <div className="absolute inset-0 flex flex-col justify-around py-4 px-2">
            {[...ROWS].reverse().map((pos) => {
              const rowSlots = starterSlots.filter((s) => s.position === pos);
              return (
                <div key={pos} className="flex justify-center gap-3">
                  {rowSlots.map((s) => (
                    <SlotChip
                      key={s.id}
                      slot={s}
                      player={picks[s.id]}
                      isCaptain={picks[s.id]?.id === captainId}
                      onOpen={() => { setSearch(""); setModal({ type: "player", slot: s }); }}
                      onClear={() => clearSlot(s.id)}
                      onCaptain={() => picks[s.id] && setCaptainId(picks[s.id]!.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Panel derecho (45%) ─── */}
        <div className="flex flex-col gap-4">
          {/* BudgetMeter */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-4">
            <Eyebrow className="mb-1">Presupuesto</Eyebrow>
            <div className={cn(
              "jersey-numeral text-[clamp(1.5rem,3vw,2.5rem)] leading-none tracking-tight",
              remaining < 0 ? "text-danger" : "text-ink",
            )}>
              {remaining}
              <span className="text-base font-normal text-ink-3 ml-1">/ {budget} M</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  remaining < 0 ? "bg-danger" : budgetPct > 85 ? "bg-warning" : "bg-success",
                )}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>

          {/* Suplentes */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-4">
            <Eyebrow className="mb-3">Suplentes (opcional)</Eyebrow>
            <div className="grid grid-cols-2 gap-2">
              {slots
                .filter((s) => !s.isStarter)
                .map((s) => (
                  <SlotChip
                    key={s.id}
                    slot={s}
                    player={picks[s.id]}
                    isCaptain={false}
                    compact
                    onOpen={() => { setSearch(""); setModal({ type: "player", slot: s }); }}
                    onClear={() => clearSlot(s.id)}
                  />
                ))}
            </div>
          </div>

          {/* CoachCard */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-4">
            <Eyebrow className="mb-2">Técnico</Eyebrow>
            <button
              onClick={() => { setSearch(""); setModal({ type: "coach" }); }}
              className="flex w-full items-center justify-between rounded-[6px] border border-dashed border-border px-3 py-2.5 text-left text-sm hover:border-blue transition-colors group"
            >
              {coach ? (
                <span className="font-semibold text-ink">
                  {coach.name}
                  <span className="ml-1.5 text-ink-3 font-normal">· {coach.countryName}</span>
                </span>
              ) : (
                <span className="text-ink-faint group-hover:text-ink-3 transition-colors">
                  + Elegir técnico
                </span>
              )}
              {coach ? (
                <div className="text-right">
                  <div className="jersey-numeral text-sm text-blue">{coach.price}M</div>
                  <div className={cn(
                    "text-[10px] font-semibold",
                    "text-success", // default, in real app would show win/loss record
                  )}>
                    +2 / −2 pts
                  </div>
                </div>
              ) : null}
            </button>
          </div>

          {/* Validación */}
          <div className="space-y-2">
            {errors.length > 0 ? (
              errors.map((e) => (
                <ValidationCallout key={e} type="warning">
                  {e}
                </ValidationCallout>
              ))
            ) : (
              <ValidationCallout type="success">
                ¡Equipo válido! Listo para guardar.
              </ValidationCallout>
            )}
            {message && (
              <ValidationCallout type="danger">{message}</ValidationCallout>
            )}
          </div>

          {/* Guardar */}
          <PrimaryButton
            onClick={onSave}
            disabled={!valid || saving}
            className="w-full justify-center py-4 text-lg"
          >
            {saving ? "Guardando…" : "GUARDAR EQUIPO →"}
          </PrimaryButton>
        </div>
      </div>

      {/* ─── Modal de selección ─── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modal.type === "coach" ? "Elegir técnico" : `Elegir ${POSITION_LABELS[modal.slot.position]}`}
          onClick={() => setModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-t-[12px] border border-border bg-surface card-shadow-lg md:rounded-[12px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-display text-xl text-ink">
                {modal.type === "coach" ? "ELEGÍ TÉCNICO" : `ELEGÍ ${POSITION_LABELS[modal.slot.position].toUpperCase()}`}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="rounded-full p-1.5 text-ink-3 hover:bg-surface-2 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="mb-3 w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
              />
              <div className="max-h-[50vh] space-y-0.5 overflow-y-auto">
                {modal.type === "player" && modalPlayers.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-ink-3">
                    No se encontraron jugadores.
                  </p>
                )}
                {modal.type === "coach" && modalCoaches.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-ink-3">
                    No se encontraron técnicos.
                  </p>
                )}
                {modal.type === "player"
                  ? modalPlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => pickPlayer(modal.slot.id, p)}
                        className="flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left hover:bg-surface-2 transition-colors group"
                      >
                        {p.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.flagUrl} alt={p.countryName} className="h-5 w-7 rounded-sm object-cover shrink-0" />
                        ) : (
                          <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink group-hover:text-blue">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-ink-3">{p.countryName}</span>
                        </span>
                        <span className="jersey-numeral text-sm text-blue shrink-0">{p.price}M</span>
                      </button>
                    ))
                  : modalCoaches.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setCoachId(c.id); setModal(null); }}
                        className="flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left hover:bg-surface-2 transition-colors group"
                      >
                        {c.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.flagUrl} alt={c.countryName} className="h-5 w-7 rounded-sm object-cover shrink-0" />
                        ) : (
                          <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink group-hover:text-blue">
                            {c.name}
                          </span>
                          <span className="block truncate text-xs text-ink-3">{c.countryName}</span>
                        </span>
                        <span className="jersey-numeral text-sm text-blue shrink-0">{c.price}M</span>
                      </button>
                    ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
