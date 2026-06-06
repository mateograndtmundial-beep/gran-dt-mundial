"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  FORMATIONS,
  DEFAULT_FORMATION,
  BUDGET,
  MAX_PER_COUNTRY,
  POSITION_LABELS,
} from "@/lib/game/config";
import { saveLineup } from "@/lib/actions";
import type { PlayerRow, CoachRow } from "@/lib/queries";
import { cn, formatPrice } from "@/lib/utils";
import { round1 } from "@/lib/pricing/map";
import { normalizeName } from "@/lib/pricing/normalize";
import { Eyebrow, ValidationCallout, PrimaryButton, PositionChip } from "@/components/editorial";
import { Pitch, buildSlots, type Slot } from "@/components/pitch";

/* Altura reservada para el chrome de arriba (header + título + control bar). */
const PITCH_FIT = "min(100%, calc((100dvh - 16.5rem) * 0.6977))";

/* ─── FieldBuilder ─── */
export type InitialLineup = {
  formation: string;
  captainPlayerId: number | null;
  coachId: number | null;
  slots: Record<string, number>; // slotId -> playerId
};

export function FieldBuilder({
  players,
  coaches,
  budget = BUDGET,
  initial,
  deadlineLabel = "CERRÁ TU EQUIPO",
}: {
  players: PlayerRow[];
  coaches: CoachRow[];
  budget?: number;
  initial?: InitialLineup | null;
  deadlineLabel?: string;
}) {
  const router = useRouter();
  const [formation, setFormation]   = useState(initial?.formation ?? DEFAULT_FORMATION);
  const [picks, setPicks]           = useState<Record<string, PlayerRow>>(() => {
    if (!initial) return {};
    const byId = new Map(players.map((p) => [p.id, p]));
    const m: Record<string, PlayerRow> = {};
    for (const [slot, pid] of Object.entries(initial.slots)) {
      const p = byId.get(pid);
      if (p) m[slot] = p;
    }
    return m;
  });
  const [captainId, setCaptainId]   = useState<number | null>(initial?.captainPlayerId ?? null);
  const [coachId, setCoachId]       = useState<number | null>(initial?.coachId ?? null);
  const [modal, setModal]           = useState<{ type: "player"; slot: Slot } | { type: "coach" } | null>(null);
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState<string | null>(null);
  const [notice, setNotice]         = useState<string | null>(null);

  const slots     = useMemo(() => buildSlots(formation), [formation]);
  const coach     = coaches.find((c) => c.id === coachId) ?? null;
  const chosen    = Object.values(picks);
  const used      = round1(chosen.reduce((s, p) => s + p.price, 0) + (coach?.price ?? 0));
  const remaining = round1(budget - used);

  const countByCountry = new Map<number, number>();
  for (const p of chosen) countByCountry.set(p.countryId, (countByCountry.get(p.countryId) ?? 0) + 1);
  const maxCountry = countByCountry.size ? Math.max(...countByCountry.values()) : 0;

  const starterSlots   = slots.filter((s) => s.isStarter);
  const subSlots       = slots.filter((s) => !s.isStarter);
  const startersFilled = starterSlots.every((s) => picks[s.id]);
  const subsFilled     = subSlots.every((s) => picks[s.id]);
  const captainOk      = captainId != null && starterSlots.some((s) => picks[s.id]?.id === captainId);

  const errors: string[] = [];
  if (!startersFilled) errors.push("Completá los 11 titulares");
  if (!subsFilled)     errors.push(`Completá los ${subSlots.length} suplentes`);
  if (remaining < 0)   errors.push("Te pasaste del presupuesto");
  if (maxCountry > MAX_PER_COUNTRY) errors.push(`Máx ${MAX_PER_COUNTRY} jugadores por selección`);
  if (!captainOk)      errors.push("Elegí un capitán");
  if (!coachId)        errors.push("Elegí un técnico");
  const valid = errors.length === 0;

  function onFormationChange(f: string) {
    const nextIds = new Set(buildSlots(f).map((s) => s.id));
    // Jugadores cuyo slot no existe en la nueva formación quedan fuera: avisamos
    // en vez de descartarlos en silencio (antes desaparecían sin feedback).
    const dropped = Object.entries(picks)
      .filter(([id]) => !nextIds.has(id))
      .map(([, p]) => p);
    if (dropped.length) {
      setNotice(
        `Quitamos a ${dropped.map((p) => p.name).join(", ")} porque no ${
          dropped.length > 1 ? "entran" : "entra"
        } en ${f}.`,
      );
      if (dropped.some((p) => p.id === captainId)) setCaptainId(null);
    } else {
      setNotice(null);
    }
    setPicks((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => nextIds.has(id))));
    setFormation(f);
  }
  function pickPlayer(slotId: string, player: PlayerRow) {
    setPicks((prev) => ({ ...prev, [slotId]: player }));
    setNotice(null);
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
  function toggleCaptain(slotId: string) {
    const p = picks[slotId];
    if (!p) return;
    setCaptainId((prev) => (prev === p.id ? null : p.id));
  }

  const pickedIds    = new Set(chosen.map((p) => p.id));
  const nq           = normalizeName(search); // búsqueda sin tildes ni mayúsculas
  const modalPlayers = modal?.type === "player"
    ? players
        .filter(
          (p) =>
            p.position === modal.slot.position &&
            !pickedIds.has(p.id) &&
            (nq === "" || normalizeName(p.name).includes(nq) || normalizeName(p.countryName).includes(nq)),
        )
        .slice(0, 120)
    : [];
  const modalCoaches = modal?.type === "coach"
    ? coaches
        .filter(
          (c) =>
            nq === "" ||
            normalizeName(c.name).includes(nq) ||
            normalizeName(c.countryName).includes(nq),
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
    });
    setSaving(false);
    if (!res.ok && res.error === "auth") { router.push("/sign-in"); return; }
    if (!res.ok && res.error === "pins") {
      setMessage(`Necesitás ${res.needed} pin(es) para esos cambios (tenés ${res.balance}).`);
      return;
    }
    if (!res.ok && res.error === "budget") {
      setMessage(`Te pasaste del presupuesto: ${formatPrice(res.used)}M de ${res.budget}M.`);
      return;
    }
    if (!res.ok && res.error === "country") {
      setMessage(`Máximo ${res.max} jugadores por selección.`);
      return;
    }
    if (!res.ok && res.error === "locked") {
      setMessage("El equipo está bloqueado: la fecha ya empezó.");
      return;
    }
    if (!res.ok) { setMessage("No se pudo guardar. Revisá la base de datos."); return; }
    router.push("/mi-equipo");
  }

  const budgetPct = Math.min(100, Math.round((used / budget) * 100));

  function openSlot(s: Slot) {
    setSearch("");
    setModal({ type: "player", slot: s });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Barra de control compacta ─── */}
      <div className="rounded-[8px] border border-border bg-surface card-shadow px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow text-blue-ink">{deadlineLabel}</span>
          <div className="flex flex-col items-end shrink-0">
            {/* El número grande es lo GASTADO (coincide con la barra, que se llena
                al gastar); abajo el restante explícito para que no se confunda. */}
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "jersey-numeral text-2xl leading-none tracking-tight",
                  remaining < 0 ? "text-danger" : "text-ink",
                )}
              >
                {formatPrice(used)}
              </span>
              <span className="text-xs text-ink-3">/ {budget}M</span>
            </div>
            <span className={cn("text-[11px] leading-tight", remaining < 0 ? "text-danger" : "text-ink-3")}>
              {remaining < 0
                ? `Te pasaste ${formatPrice(-remaining)}M`
                : `Te quedan ${formatPrice(remaining)}M`}
            </span>
          </div>
        </div>

        {/* barra de presupuesto */}
        <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              remaining < 0 ? "bg-danger" : budgetPct > 85 ? "bg-warning" : "bg-success",
            )}
            style={{ width: `${budgetPct}%` }}
          />
        </div>

        {/* formaciones — fila scrollable */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => onFormationChange(f)}
              className={cn(
                "shrink-0 rounded-[4px] px-2.5 py-1 font-display text-sm leading-none transition-colors",
                formation === f
                  ? "bg-blue text-white"
                  : "bg-canvas border border-border text-ink-2 hover:border-border-strong",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Body: cancha + rail ─── */}
      <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
        {/* Cancha — entra completa, deriva ancho del alto disponible */}
        <div className="flex min-h-0 justify-center">
          <Pitch
            editable
            formation={formation}
            picks={picks}
            captainId={captainId}
            onOpenSlot={openSlot}
            onClearSlot={clearSlot}
            onToggleCaptain={toggleCaptain}
            style={{ width: PITCH_FIT }}
          />
        </div>

        {/* Rail derecho (scrollea solo, la cancha nunca se corta) */}
        <div className="flex flex-col gap-3 md:max-h-[calc(100dvh-16.5rem)] md:overflow-y-auto md:pr-0.5">
          {/* Suplentes */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-3">
            <Eyebrow className="mb-2">Suplentes</Eyebrow>
            <div className="space-y-1.5">
              {subSlots.map((s) => {
                const p = picks[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <PositionChip position={s.position} />
                    {p ? (
                      <>
                        {p.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.flagUrl} alt={p.countryName} className="h-4 w-6 rounded-sm object-cover shrink-0" />
                        ) : (
                          <div className="h-4 w-6 rounded-sm bg-surface-2 shrink-0" />
                        )}
                        <button
                          onClick={() => openSlot(s)}
                          className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink hover:text-blue"
                        >
                          {p.name}
                        </button>
                        <span className="jersey-numeral text-xs text-gold-ink shrink-0">{formatPrice(p.price)}M</span>
                        <button
                          onClick={() => clearSlot(s.id)}
                          aria-label="Quitar suplente"
                          className="rounded-full p-0.5 text-ink-faint hover:bg-surface-2 hover:text-danger transition-colors shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openSlot(s)}
                        className="flex-1 text-left text-sm text-ink-faint hover:text-blue transition-colors"
                      >
                        + Agregar {POSITION_LABELS[s.position].toLowerCase()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Técnico */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-3">
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
                  <div className="jersey-numeral text-sm text-blue">{formatPrice(coach.price)}M</div>
                  <div className="text-[10px] font-semibold text-success">+2 / −2 pts</div>
                </div>
              ) : null}
            </button>
          </div>

          {/* Validación */}
          <div className="space-y-2">
            {notice && <ValidationCallout type="warning">{notice}</ValidationCallout>}
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
            {message && <ValidationCallout type="danger">{message}</ValidationCallout>}
            {message && /pin/i.test(message) && (
              <Link
                href="/pines"
                className="block rounded-[6px] border border-gold-border bg-gold-bg px-3 py-2 text-center text-sm font-display text-gold-ink hover:bg-gold hover:text-white transition-colors"
              >
                COMPRAR PINES →
              </Link>
            )}
          </div>

          {/* Guardar */}
          <PrimaryButton
            onClick={onSave}
            disabled={!valid || saving}
            className="w-full justify-center py-3.5 text-lg"
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
                        <span className="jersey-numeral text-sm text-blue shrink-0">{formatPrice(p.price)}M</span>
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
                        <span className="jersey-numeral text-sm text-blue shrink-0">{formatPrice(c.price)}M</span>
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
