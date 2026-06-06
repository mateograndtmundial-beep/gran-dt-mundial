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
  POSITION_LABELS,
  type Position,
} from "@/lib/game/config";
import { saveLineup } from "@/lib/actions";
import type { PlayerRow, CoachRow } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Slot = { id: string; position: Position; isStarter: boolean };
const ROWS: Position[] = ["GK", "DEF", "MID", "FWD"];

function buildSlots(formation: string): Slot[] {
  const shape = FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION];
  const slots: Slot[] = [];
  ROWS.forEach((pos) => {
    for (let i = 0; i < shape[pos]; i++) slots.push({ id: `${pos}_${i + 1}`, position: pos, isStarter: true });
  });
  ROWS.forEach((pos) => slots.push({ id: `SUB_${pos}`, position: pos, isStarter: false }));
  return slots;
}

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
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [picks, setPicks] = useState<Record<string, PlayerRow>>({});
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [coachId, setCoachId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ type: "player"; slot: Slot } | { type: "coach" } | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const slots = useMemo(() => buildSlots(formation), [formation]);
  const coach = coaches.find((c) => c.id === coachId) ?? null;

  const chosen = Object.values(picks);
  const used = chosen.reduce((s, p) => s + p.price, 0) + (coach?.price ?? 0);
  const remaining = budget - used;

  const countByCountry = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of chosen) m.set(p.countryId, (m.get(p.countryId) ?? 0) + 1);
    return m;
  }, [chosen]);
  const maxCountry = countByCountry.size ? Math.max(...countByCountry.values()) : 0;

  const starterSlots = slots.filter((s) => s.isStarter);
  const startersFilled = starterSlots.every((s) => picks[s.id]);
  const captainOk = captainId != null && starterSlots.some((s) => picks[s.id]?.id === captainId);

  const errors: string[] = [];
  if (!startersFilled) errors.push("Completá los 11 titulares");
  if (remaining < 0) errors.push("Te pasaste del presupuesto");
  if (maxCountry > MAX_PER_COUNTRY) errors.push(`Máx ${MAX_PER_COUNTRY} jugadores por selección`);
  if (!captainOk) errors.push("Elegí un capitán");
  if (!coachId) errors.push("Elegí un técnico");
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
      if (removed && removed.id === captainId) setCaptainId(null);
      return n;
    });
  }

  const pickedIds = new Set(chosen.map((p) => p.id));
  const modalPlayers =
    modal?.type === "player"
      ? players
          .filter(
            (p) =>
              p.position === modal.slot.position &&
              !pickedIds.has(p.id) &&
              p.name.toLowerCase().includes(search.toLowerCase()),
          )
          .slice(0, 120)
      : [];
  const modalCoaches =
    modal?.type === "coach"
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
    if (!res.ok && res.error === "auth") {
      router.push("/sign-in");
      return;
    }
    if (!res.ok && res.error === "pins") {
      setMessage(`Necesitás ${res.needed} pin(es) para esos cambios (tenés ${res.balance}).`);
      return;
    }
    if (!res.ok) {
      setMessage("No se pudo guardar. Revisá la base de datos.");
      return;
    }
    router.push("/mi-equipo");
  }

  return (
    <div className="space-y-4">
      {/* Barra superior: formación + presupuesto */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-pitch-card p-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Formación</span>
          <select
            value={formation}
            onChange={(e) => onFormationChange(e.target.value)}
            className="rounded-md border border-white/10 bg-pitch px-2 py-1 text-sm"
          >
            {Object.keys(FORMATIONS).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <div className="text-right">
          <div className="text-xs text-white/50">Presupuesto</div>
          <div className={cn("text-lg font-extrabold", remaining < 0 ? "text-red-400" : "text-gold")}>
            {remaining}
            <span className="text-sm font-normal text-white/40"> / {budget} M</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* Cancha */}
        <div className="space-y-3 rounded-2xl border border-pitch-line bg-gradient-to-b from-[#0f2a1d] to-[#0a1a12] p-4">
          {ROWS.map((pos) => {
            const rowSlots = starterSlots.filter((s) => s.position === pos);
            return (
              <div key={pos} className="flex flex-wrap justify-center gap-2">
                {rowSlots.map((s) => (
                  <SlotChip
                    key={s.id}
                    slot={s}
                    player={picks[s.id]}
                    isCaptain={picks[s.id]?.id === captainId}
                    onOpen={() => {
                      setSearch("");
                      setModal({ type: "player", slot: s });
                    }}
                    onClear={() => clearSlot(s.id)}
                    onCaptain={() => picks[s.id] && setCaptainId(picks[s.id]!.id)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Banca + técnico */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-pitch-card p-3">
            <p className="mb-2 text-sm font-semibold text-white/70">Suplentes (opcional)</p>
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
                    onOpen={() => {
                      setSearch("");
                      setModal({ type: "player", slot: s });
                    }}
                    onClear={() => clearSlot(s.id)}
                  />
                ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-pitch-card p-3">
            <p className="mb-2 text-sm font-semibold text-white/70">Técnico (DT)</p>
            <button
              onClick={() => {
                setSearch("");
                setModal({ type: "coach" });
              }}
              className="flex w-full items-center justify-between rounded-lg border border-dashed border-white/20 px-3 py-2 text-left text-sm hover:border-accent"
            >
              {coach ? (
                <span>
                  {coach.name} <span className="text-white/40">· {coach.countryName}</span>
                </span>
              ) : (
                <span className="text-white/40">+ Elegir técnico</span>
              )}
              {coach ? <span className="font-bold text-gold">{coach.price}M</span> : null}
            </button>
          </div>
        </div>
      </div>

      {/* Validación + guardar */}
      <div className="rounded-xl border border-white/10 bg-pitch-card p-3">
        {errors.length > 0 ? (
          <ul className="mb-3 space-y-1 text-sm text-red-300">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-accent">¡Equipo válido! Listo para guardar.</p>
        )}
        {message && <p className="mb-3 text-sm text-amber-300">{message}</p>}
        <button
          onClick={onSave}
          disabled={!valid || saving}
          className="w-full rounded-lg bg-gold py-3 font-bold text-pitch disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar equipo"}
        </button>
      </div>

      {/* Modal de selección */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-pitch-card md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <h3 className="font-bold">
                {modal.type === "coach"
                  ? "Elegí técnico"
                  : `Elegí ${POSITION_LABELS[modal.slot.position]}`}
              </h3>
              <button onClick={() => setModal(null)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-3">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="mb-3 w-full rounded-lg border border-white/10 bg-pitch px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="max-h-[55vh] space-y-1 overflow-y-auto">
                {modal.type === "player"
                  ? modalPlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => pickPlayer(modal.slot.id, p)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-white/40">{p.countryName}</span>
                        </span>
                        <span className="font-bold text-gold">{p.price}M</span>
                      </button>
                    ))
                  : modalCoaches.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCoachId(c.id);
                          setModal(null);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{c.name}</span>
                          <span className="block truncate text-xs text-white/40">{c.countryName}</span>
                        </span>
                        <span className="font-bold text-gold">{c.price}M</span>
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
        className="flex min-w-[84px] flex-col items-center gap-1 rounded-lg border border-dashed border-white/20 px-2 py-2 text-xs text-white/40 hover:border-accent"
      >
        <span
          className="h-6 w-6 rounded-full"
          style={{ backgroundColor: POSITION_COLORS[slot.position], opacity: 0.5 }}
        />
        + {slot.position}
      </button>
    );
  }
  return (
    <div
      className={cn(
        "relative flex min-w-[84px] flex-col items-center gap-1 rounded-lg border bg-pitch px-2 py-2",
        isCaptain ? "border-gold" : "border-white/15",
      )}
    >
      <button onClick={onOpen} className="flex flex-col items-center gap-1">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-pitch"
          style={{ backgroundColor: POSITION_COLORS[slot.position] }}
        >
          {slot.position}
        </span>
        <span className="max-w-[80px] truncate text-[11px] font-semibold">{player.name}</span>
        <span className="text-[10px] text-gold">{player.price}M</span>
      </button>
      <div className="absolute -right-1 -top-1 flex gap-0.5">
        {!compact && onCaptain && (
          <button
            onClick={onCaptain}
            title="Capitán"
            className={cn(
              "rounded-full p-0.5",
              isCaptain ? "bg-gold text-pitch" : "bg-white/10 text-white/60",
            )}
          >
            <Star size={12} />
          </button>
        )}
        <button onClick={onClear} title="Quitar" className="rounded-full bg-white/10 p-0.5 text-white/60">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
