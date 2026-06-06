"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, GripVertical } from "lucide-react";
import {
  FORMATIONS,
  DEFAULT_FORMATION,
  BUDGET,
  MAX_PER_COUNTRY,
  POSITION_LABELS,
  type Position,
} from "@/lib/game/config";
import { saveLineup } from "@/lib/actions";
import type { PlayerRow, CoachRow } from "@/lib/queries";
import { cn, formatPrice } from "@/lib/utils";
import { round1 } from "@/lib/pricing/map";
import { normalizeName } from "@/lib/pricing/normalize";
import { Eyebrow, ValidationCallout, PrimaryButton, PositionChip } from "@/components/editorial";
import { Pitch, buildSlots, type Slot, type PitchPlayer } from "@/components/pitch";

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
  maxPerCountry = MAX_PER_COUNTRY,
  initial,
  initialTeamName = "",
  deadlineLabel = "CERRÁ TU EQUIPO",
}: {
  players: PlayerRow[];
  coaches: CoachRow[];
  budget?: number;
  maxPerCountry?: number | null;
  initial?: InitialLineup | null;
  initialTeamName?: string;
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
  const [teamName, setTeamName]     = useState(initialTeamName);
  const [captainId, setCaptainId]   = useState<number | null>(initial?.captainPlayerId ?? null);
  const [coachId, setCoachId]       = useState<number | null>(initial?.coachId ?? null);
  const [modal, setModal]           = useState<{ type: "player"; slot: Slot } | { type: "coach" } | null>(null);
  const [search, setSearch]         = useState("");
  const [modalCountry, setModalCountry] = useState<string>("ALL");
  const [modalSort, setModalSort]   = useState<"price-desc" | "price-asc" | "name-asc">("price-desc");
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState<string | null>(null);
  const [pendingFormation, setPendingFormation] = useState<string | null>(null);

  const slots     = useMemo(() => buildSlots(formation), [formation]);
  const playerCountries = useMemo(
    () => Array.from(new Set(players.map((p) => p.countryName))).sort((a, b) => a.localeCompare(b)),
    [players],
  );
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
  if (!teamName.trim()) errors.push("Ponele un nombre a tu equipo");
  if (!startersFilled) errors.push("Completá los 11 titulares");
  if (!subsFilled)     errors.push(`Completá los ${subSlots.length} suplentes`);
  if (remaining < 0)   errors.push("Te pasaste del presupuesto");
  if (maxPerCountry != null && maxCountry > maxPerCountry)
    errors.push(`Máx ${maxPerCountry} jugadores por selección`);
  if (!captainOk)      errors.push("Elegí un capitán");
  if (!coachId)        errors.push("Elegí un técnico");
  const valid = errors.length === 0;

  function droppedBy(f: string): PlayerRow[] {
    const nextIds = new Set(buildSlots(f).map((s) => s.id));
    return Object.entries(picks)
      .filter(([id]) => !nextIds.has(id))
      .map(([, p]) => p);
  }
  function applyFormation(f: string) {
    const nextIds = new Set(buildSlots(f).map((s) => s.id));
    if (droppedBy(f).some((p) => p.id === captainId)) setCaptainId(null);
    setPicks((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => nextIds.has(id))));
    setFormation(f);
  }
  function onFormationChange(f: string) {
    if (f === formation) return;
    // Si el cambio dejaría jugador(es) afuera, pedimos confirmación ANTES de
    // aplicarlo (en vez de descartarlos y avisar después).
    if (droppedBy(f).length > 0) setPendingFormation(f);
    else applyFormation(f);
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
  function toggleCaptain(slotId: string) {
    const p = picks[slotId];
    if (!p) return;
    setCaptainId((prev) => (prev === p.id ? null : p.id));
  }

  // Intercambia el contenido de dos slots (mismo puesto): titular↔titular,
  // titular↔suplente o suplente↔titular. Si el capitán termina en el banco, se limpia.
  function swapSlots(slotA: string, slotB: string) {
    const pa = picks[slotA];
    const pb = picks[slotB];
    setPicks((prev) => {
      const next = { ...prev };
      if (pb) next[slotA] = pb; else delete next[slotA];
      if (pa) next[slotB] = pa; else delete next[slotB];
      return next;
    });
    const captainBenched =
      (pa?.id === captainId && slotB.startsWith("SUB_")) ||
      (pb?.id === captainId && slotA.startsWith("SUB_"));
    if (captainBenched) setCaptainId(null);
  }

  // Drag & drop (mouse + touch) entre cualquier par de slots del mismo puesto.
  const [drag, setDrag] = useState<
    { slotId: string; position: Position; player: PitchPlayer; x: number; y: number } | null
  >(null);

  // threshold=true para titulares: distingue "tap" (abre el picker) de "drag".
  function startDrag(
    e: React.PointerEvent,
    slotId: string,
    position: Position,
    player: PitchPlayer,
    threshold = false,
  ) {
    const sx = e.clientX, sy = e.clientY;
    let active = !threshold;
    if (active) {
      e.preventDefault();
      setDrag({ slotId, position, player, x: sx, y: sy });
    }
    const move = (ev: PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        active = true;
        setDrag({ slotId, position, player, x: ev.clientX, y: ev.clientY });
      } else {
        setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const wasActive = active;
      setDrag(null);
      if (!wasActive) return; // fue un tap → dejamos que el click abra el picker
      // Suprimimos el click sintético que sigue al drag (si no, abre el picker).
      const suppress = (ce: Event) => { ce.stopPropagation(); ce.preventDefault(); };
      window.addEventListener("click", suppress, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", suppress, true), 0);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = el?.closest("[data-slot-id]") as HTMLElement | null;
      if (!target) return;
      const ts = target.getAttribute("data-slot-id");
      const tp = target.getAttribute("data-position");
      if (tp === position && ts && ts !== slotId) swapSlots(slotId, ts);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const pickedIds    = new Set(chosen.map((p) => p.id));
  const nq           = normalizeName(search); // búsqueda sin tildes ni mayúsculas
  const modalPlayers = modal?.type === "player"
    ? players
        .filter(
          (p) =>
            p.position === modal.slot.position &&
            !pickedIds.has(p.id) &&
            (modalCountry === "ALL" || p.countryName === modalCountry) &&
            (nq === "" || normalizeName(p.name).includes(nq) || normalizeName(p.countryName).includes(nq)),
        )
        .sort((a, b) => {
          if (modalSort === "name-asc") return a.name.localeCompare(b.name);
          if (modalSort === "price-asc") return a.price - b.price || a.name.localeCompare(b.name);
          return b.price - a.price || a.name.localeCompare(b.name);
        })
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
      teamName,
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
    if (!res.ok && res.error === "name") {
      setMessage("Ponele un nombre a tu equipo antes de guardar.");
      return;
    }
    if (!res.ok) { setMessage("No se pudo guardar. Revisá la base de datos."); return; }
    router.push("/mi-equipo");
  }

  const budgetPct = Math.min(100, Math.round((used / budget) * 100));

  function openSlot(s: Slot) {
    setSearch("");
    setModalCountry("ALL");
    setModalSort("price-desc");
    setModal({ type: "player", slot: s });
  }

  // Presupuesto disponible para ESTE slot: si ya hay alguien, su precio se libera
  // al reemplazarlo. Sirve para sombrear a los que no entran (no para bloquear el
  // resto del equipo).
  const slotCurrent = modal?.type === "player" ? picks[modal.slot.id] : null;
  const freeForSlot = round1(budget - used + (slotCurrent?.price ?? 0));
  const freeForCoach = round1(budget - used + (coach?.price ?? 0));

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
            onSlotPointerDown={(e, slot, player) => startDrag(e, slot.id, slot.position, player, true)}
            dropPosition={drag?.position ?? null}
            dragSlotId={drag?.slotId ?? null}
            style={{ width: PITCH_FIT }}
          />
        </div>

        {/* Rail derecho (scrollea solo, la cancha nunca se corta) */}
        <div className="flex flex-col gap-3 md:max-h-[calc(100dvh-16.5rem)] md:overflow-y-auto md:pr-0.5">
          {/* Nombre del equipo (aparece en el ranking) */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-3">
            <Eyebrow className="mb-2">Nombre del equipo</Eyebrow>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={40}
              placeholder="Ej: Los Galácticos"
              aria-label="Nombre del equipo"
              className="w-full rounded-[6px] border border-border bg-canvas px-3 py-2 text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
            />
          </div>

          {/* Suplentes */}
          <div className="rounded-[8px] border border-border bg-surface card-shadow p-3">
            <Eyebrow className="mb-2">Suplentes</Eyebrow>
            <div className="space-y-1.5">
              {subSlots.map((s) => {
                const p = picks[s.id];
                return (
                  <div
                    key={s.id}
                    data-slot-id={s.id}
                    data-position={s.position}
                    className={cn(
                      "flex items-center gap-2 rounded-[6px] px-1 -mx-1 transition-shadow",
                      drag?.slotId === s.id && "opacity-40",
                      drag && drag.position === s.position && drag.slotId !== s.id &&
                        "ring-2 ring-gold bg-gold-bg/50",
                    )}
                  >
                    <PositionChip position={s.position} />
                    {p ? (
                      <>
                        <button
                          type="button"
                          onPointerDown={(e) => startDrag(e, s.id, s.position, p)}
                          aria-label={`Arrastrar ${p.name} hacia un titular`}
                          title="Arrastrá hacia un titular para intercambiarlos"
                          className="shrink-0 cursor-grab touch-none text-ink-faint hover:text-ink-2 active:cursor-grabbing"
                        >
                          <GripVertical size={14} />
                        </button>
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

          <Link
            href="/como-funciona"
            className="block text-center text-xs font-semibold text-ink-3 transition-colors hover:text-blue"
          >
            ¿Cómo se suman los puntos?
          </Link>
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
                className="mb-2 w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
              />
              {modal.type === "player" && (
                <div className="mb-3 flex gap-2">
                  <select
                    value={modalCountry}
                    onChange={(e) => setModalCountry(e.target.value)}
                    aria-label="Filtrar por país"
                    className="min-w-0 flex-1 appearance-none rounded-[6px] border border-border bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-2 outline-none hover:border-border-strong focus:border-blue cursor-pointer"
                  >
                    <option value="ALL">Todos los países</option>
                    {playerCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={modalSort}
                    onChange={(e) => setModalSort(e.target.value as typeof modalSort)}
                    aria-label="Ordenar"
                    className="shrink-0 appearance-none rounded-[6px] border border-border bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-2 outline-none hover:border-border-strong focus:border-blue cursor-pointer"
                  >
                    <option value="price-desc">Precio: mayor a menor</option>
                    <option value="price-asc">Precio: menor a mayor</option>
                    <option value="name-asc">Nombre: A → Z</option>
                  </select>
                </div>
              )}
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
                  ? modalPlayers.map((p) => {
                      const affordable = p.price <= freeForSlot + 0.05;
                      // Si el slot ya tiene un jugador del mismo país, reemplazarlo
                      // libera un cupo: no cuenta para el tope.
                      const countryNow =
                        (countByCountry.get(p.countryId) ?? 0) -
                        (slotCurrent?.countryId === p.countryId ? 1 : 0);
                      const countryOk =
                        maxPerCountry == null || countryNow < maxPerCountry;
                      const selectable = affordable && countryOk;
                      const reason = !affordable
                        ? "no te alcanza"
                        : !countryOk
                          ? `máx ${maxPerCountry} de este país`
                          : null;
                      return (
                      <button
                        key={p.id}
                        onClick={() => selectable && pickPlayer(modal.slot.id, p)}
                        disabled={!selectable}
                        title={
                          selectable
                            ? undefined
                            : !affordable
                              ? "No te alcanza el presupuesto"
                              : `Máximo ${maxPerCountry} jugadores por selección`
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-colors group",
                          selectable ? "hover:bg-surface-2" : "opacity-45 cursor-not-allowed",
                        )}
                      >
                        {p.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.flagUrl} alt={p.countryName} className="h-5 w-7 rounded-sm object-cover shrink-0" />
                        ) : (
                          <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-semibold text-ink", selectable && "group-hover:text-blue")}>
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-ink-3">
                            {p.countryName}
                            {reason && <span className="text-danger"> · {reason}</span>}
                          </span>
                        </span>
                        <span className={cn("jersey-numeral text-sm shrink-0", selectable ? "text-blue" : "text-danger")}>{formatPrice(p.price)}M</span>
                      </button>
                      );
                    })
                  : modalCoaches.map((c) => {
                      const affordable = c.price <= freeForCoach + 0.05;
                      return (
                      <button
                        key={c.id}
                        onClick={() => { if (!affordable) return; setCoachId(c.id); setModal(null); }}
                        disabled={!affordable}
                        title={affordable ? undefined : "No te alcanza el presupuesto"}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-colors group",
                          affordable ? "hover:bg-surface-2" : "opacity-45 cursor-not-allowed",
                        )}
                      >
                        {c.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.flagUrl} alt={c.countryName} className="h-5 w-7 rounded-sm object-cover shrink-0" />
                        ) : (
                          <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-semibold text-ink", affordable && "group-hover:text-blue")}>
                            {c.name}
                          </span>
                          <span className="block truncate text-xs text-ink-3">
                            {c.countryName}
                            {!affordable && <span className="text-danger"> · no te alcanza</span>}
                          </span>
                        </span>
                        <span className={cn("jersey-numeral text-sm shrink-0", affordable ? "text-blue" : "text-danger")}>{formatPrice(c.price)}M</span>
                      </button>
                      );
                    })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación antes de cambiar de formación si se pierde jugador(es) */}
      {pendingFormation && (() => {
        const lost = droppedBy(pendingFormation);
        return (
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar cambio de formación"
            onClick={() => setPendingFormation(null)}
          >
            <div
              className="w-full max-w-sm rounded-[12px] border border-border bg-surface card-shadow-lg p-5 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl text-ink">¿Cambiar a {pendingFormation}?</h3>
              <p className="mt-2 text-sm text-ink-2">
                Con esta formación {lost.length > 1 ? "quedan" : "queda"} afuera del equipo:
              </p>
              <ul className="mt-3 space-y-1.5">
                {lost.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {p.flagUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.flagUrl} alt="" className="h-4 w-6 rounded-sm object-cover" />
                    ) : (
                      <span className="h-4 w-6 rounded-sm bg-surface-2" />
                    )}
                    {p.name}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setPendingFormation(null)}
                  className="rounded-[6px] border border-border px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { applyFormation(pendingFormation); setPendingFormation(null); }}
                  className="rounded-[6px] bg-blue px-4 py-2 text-sm font-display text-white hover:bg-blue-ink transition-colors"
                >
                  Cambiar igual
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fantasma que sigue al puntero mientras se arrastra un suplente */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-[6px] border border-gold-border bg-surface px-2 py-1 card-shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.player.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drag.player.flagUrl} alt="" className="h-4 w-6 rounded-sm object-cover" />
          )}
          <span className="text-xs font-bold text-ink">{drag.player.name}</span>
        </div>
      )}
    </div>
  );
}
