"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, GripVertical, ArrowDownUp, ArrowLeftRight } from "lucide-react";
import {
  FORMATIONS,
  DEFAULT_FORMATION,
  BUDGET,
  MAX_PER_COUNTRY,
  POSITION_LABELS,
  type Position,
} from "@/lib/game/config";
import { saveLineup } from "@/lib/actions";
import type { PlayerRow, CoachRow, PlayerStats } from "@/lib/queries";
import { PlayerStatLine } from "@/components/domain/PlayerStats";
import { cn, formatPrice } from "@/lib/utils";
import { round1 } from "@/lib/pricing/map";
import { normalizeName } from "@/lib/pricing/normalize";
import { countPlayerChanges, roundTally } from "@/lib/game/changes";
import { roundArticle, roundDisplayName } from "@/lib/game/round-format";
import { Eyebrow, ValidationCallout, PrimaryButton, PositionChip } from "@/components/editorial";
import { CloseCountdown } from "@/components/close-countdown";
import { Pitch, buildSlots, type Slot, type PitchPlayer } from "@/components/pitch";
import { readDraft, writeDraft, clearDraft, draftDiffers, type LineupDraft } from "@/lib/lineup-draft";
import { flagUrl } from "@/lib/flags";

/* Altura reservada para el chrome de arriba (header + título + control bar).
   Usamos svh (small viewport) en vez de dvh: es estático y no cambia cuando la
   barra de iOS Safari colapsa/aparece durante el scroll, así la cancha no se
   redimensiona. */
const PITCH_FIT = "min(100%, calc((100svh - 16.5rem) * 0.6977))";

/* Cuántos resultados mostramos de entrada en el modal de selección (jugadores/
   técnicos), con "Mostrar más" para el resto — evita cortar el listado en seco. */
const MODAL_PAGE = 60;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accesibilidad de bottom-sheet/modal: cierra con Esc y atrapa el foco adentro
 * (Tab/Shift+Tab cicla entre los elementos enfocables, sin escaparse al fondo).
 * `active` gatea el efecto para no engancharlo cuando el modal está cerrado.
 */
function useModalA11y(active: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  // onClose vía ref: el listener usa SIEMPRE el último onClose sin que el effect se
  // re-ejecute en cada render. (Antes onClose era dependencia y, al pasarse como arrow
  // inline, el effect corría en cada tecla y re-enfocaba el primer elemento → en mobile
  // eso le robaba el foco al input de búsqueda y cerraba el teclado.)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Mover el foco adentro del modal SOLO al abrirse (depende solo de `active`, no del render).
  useEffect(() => {
    if (!active) return;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Esc para cerrar + trap de Tab. Solo se re-engancha al abrir/cerrar, no al tipear.
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0]!;
      const last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, ref]);
}

/* ─── FieldBuilder ─── */
export type InitialLineup = {
  formation: string;
  captainPlayerId: number | null;
  coachId: number | null;
  slots: Record<string, number>; // slotId -> playerId
};

export type ChangeContext = {
  baselinePlayerIds: number[] | null; // 15 del equipo CONFIRMADO; null = edición libre (sin fecha previa)
  priorChanges: number;               // cambios ya acumulados (y confirmados) en la fecha
  alreadySpent: number;               // pines ya gastados en la fecha editable (reconciliación)
  pinBalance: number;
  isPremium: boolean;
  freeChanges: number;                // cambios gratis por fecha (FREE_CHANGES_PER_ROUND)
  roundName: string;                  // nombre corto de la fecha editable (ej "Fecha 2")
  roundStarted: boolean;              // order > 1 → el Mundial ya está en juego
};

export function FieldBuilder({
  players,
  coaches,
  stats = {},
  ownership = {},
  budget = BUDGET,
  maxPerCountry = MAX_PER_COUNTRY,
  initial,
  initialTeamName = "",
  deadlineLabel = "CERRÁ TU EQUIPO",
  deadline = null,
  isAuthed = false,
  changeContext = null,
  addPlayerId = null,
}: {
  players: PlayerRow[];
  coaches: CoachRow[];
  stats?: Record<number, PlayerStats>;
  ownership?: Record<number, number>;
  budget?: number;
  maxPerCountry?: number | null;
  initial?: InitialLineup | null;
  initialTeamName?: string;
  deadlineLabel?: string;
  deadline?: string | null; // ISO del cierre (kickoff 1er partido) → countdown en vivo
  isAuthed?: boolean;
  changeContext?: ChangeContext | null;
  addPlayerId?: number | null;
}) {
  const hasStats = Object.keys(stats).length > 0;
  const hasOwnership = Object.keys(ownership).length > 0;
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
  // El nombre se fija la primera vez que se guarda (no se puede editar después).
  const nameLocked = initialTeamName.trim() !== "";
  const [captainId, setCaptainId]   = useState<number | null>(initial?.captainPlayerId ?? null);
  const [coachId, setCoachId]       = useState<number | null>(initial?.coachId ?? null);
  const [modal, setModal]           = useState<{ type: "player"; slot: Slot } | { type: "coach" } | { type: "swap"; sub: Slot } | null>(null);
  const [search, setSearch]         = useState("");
  const [modalCountry, setModalCountry] = useState<string>("ALL");
  const [modalSort, setModalSort]   = useState<"price-desc" | "price-asc" | "name-asc" | "ppp-desc" | "owned-desc">("price-desc");
  const [modalShown, setModalShown] = useState(MODAL_PAGE);
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState<string | null>(null);
  const [pendingFormation, setPendingFormation] = useState<string | null>(null);
  const [draftConflict, setDraftConflict] = useState<LineupDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const draftHandled = useRef(false);
  const autoSaveArmed = useRef(false);

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

  // ── Cambios de la fecha: contador + costo en pines (misma fórmula que el
  // server, lib/game/changes.ts → no se desincronizan). `limited` = hay una fecha
  // anterior contra la cual contar; si no (primer equipo / fecha 1) la edición es
  // libre y no mostramos contador ni cobramos. El baseline es el equipo CONFIRMADO,
  // así que `changesMade` = cambios NUEVOS de esta edición (los ya confirmados no
  // se recuentan); el tally suma `priorChanges` para el cupo gratis y los pines.
  const cc = changeContext;
  const limited = cc != null && cc.baselinePlayerIds != null;
  const changesMade = limited ? countPlayerChanges(chosen.map((p) => p.id), cc!.baselinePlayerIds) : 0;
  const tally = limited
    ? roundTally({
        priorChanges: cc!.priorChanges,
        newChanges: changesMade,
        freeChanges: cc!.freeChanges,
        isPremium: cc!.isPremium,
        alreadySpent: cc!.alreadySpent,
      })
    : null;
  const pinsDue = tally?.pinsDue ?? 0;
  const freeLeft = tally?.freeLeft ?? 0;
  const freeUsedNow = tally?.freeUsedNow ?? 0;
  const notEnoughPins = limited && !cc!.isPremium && pinsDue > cc!.pinBalance;

  // Diff de jugadores para el cartel de confirmación: quiénes salen (estaban en
  // el equipo confirmado y ya no) y quiénes entran. Solo importa en edición limitada.
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const baseline = limited ? cc!.baselinePlayerIds! : [];
  const currentIdSet = new Set(chosen.map((p) => p.id));
  const baselineSet = new Set(baseline);
  const leaving = baseline
    .filter((id) => !currentIdSet.has(id))
    .map((id) => byId.get(id))
    .filter((p): p is PlayerRow => p != null);
  const entering = chosen.filter((p) => !baselineSet.has(p.id));

  // Cambio de técnico: NO cuenta como cambio ni cuesta pines (no entra en
  // countPlayerChanges), pero hay que reflejarlo en el cartel de confirmación
  // para que el usuario sepa que su cambio de DT se va a guardar.
  const baselineCoachId = limited ? (initial?.coachId ?? null) : null;
  const coachChanged = limited && coachId !== baselineCoachId;
  const prevCoach = baselineCoachId != null ? coaches.find((c) => c.id === baselineCoachId) ?? null : null;

  const starterSlots   = slots.filter((s) => s.isStarter);
  const subSlots       = slots.filter((s) => !s.isStarter);
  const startersFilled = starterSlots.every((s) => picks[s.id]);
  const subsFilled     = subSlots.every((s) => picks[s.id]);
  const captainOk      = captainId != null && starterSlots.some((s) => picks[s.id]?.id === captainId);

  const errors: string[] = [];
  if (!teamName.trim()) errors.push("Ponerle un nombre a tu equipo");
  if (!startersFilled) errors.push("Completar los 11 titulares");
  if (!subsFilled)     errors.push(`Completar los ${subSlots.length} suplentes`);
  if (remaining < 0)   errors.push("Te pasaste del presupuesto");
  if (maxPerCountry != null && maxCountry > maxPerCountry)
    errors.push(`Máx ${maxPerCountry} jugadores por selección`);
  if (!captainOk)      errors.push("Elegir un capitán");
  if (!coachId)        errors.push("Elegir un técnico");
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
  const nq               = normalizeName(search); // búsqueda sin tildes ni mayúsculas
  const modalPlayersAll  = modal?.type === "player"
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
          if (modalSort === "ppp-desc") {
            const pa = stats[a.id]?.ppp ?? -1;
            const pb = stats[b.id]?.ppp ?? -1;
            return pb - pa || a.name.localeCompare(b.name);
          }
          if (modalSort === "owned-desc") {
            const oa = ownership[a.id] ?? -1;
            const ob = ownership[b.id] ?? -1;
            return ob - oa || a.name.localeCompare(b.name);
          }
          return b.price - a.price || a.name.localeCompare(b.name);
        })
    : [];
  const modalCoachesAll  = modal?.type === "coach"
    ? coaches
        .filter(
          (c) =>
            nq === "" ||
            normalizeName(c.name).includes(nq) ||
            normalizeName(c.countryName).includes(nq),
        )
    : [];
  // Render incremental: mostramos de a tandas con "Mostrar más" en vez de
  // truncar el listado en seco (antes cortaba a los primeros 120).
  const modalPlayers = modalPlayersAll.slice(0, modalShown);
  const modalCoaches = modalCoachesAll.slice(0, modalShown);
  const modalHasMore = modal?.type === "coach"
    ? modalCoachesAll.length > modalShown
    : modalPlayersAll.length > modalShown;

  // Suplente que se está haciendo entrar (tap-to-swap mobile). Null si no hay swap abierto.
  const swapSub = modal?.type === "swap" ? modal.sub : null;

  // Reconstruye el mapa de picks (slot -> jugador) desde un borrador.
  function draftToPicks(d: LineupDraft): Record<string, PlayerRow> {
    const byId = new Map(players.map((p) => [p.id, p]));
    const m: Record<string, PlayerRow> = {};
    for (const [slot, pid] of Object.entries(d.slots)) {
      const p = byId.get(pid);
      if (p) m[slot] = p;
    }
    return m;
  }

  // Aplica un borrador (equipo armado sin loguearse) al estado del armador.
  function applyDraft(d: LineupDraft) {
    setFormation(d.formation in FORMATIONS ? d.formation : DEFAULT_FORMATION);
    setPicks(draftToPicks(d));
    setCaptainId(d.captainPlayerId);
    setCoachId(d.coachId);
    if (d.teamName) setTeamName(d.teamName);
  }

  // Puente desde /jugadores ("Agregar a mi equipo"): coloca al jugador en el
  // primer slot libre de su posición (titular antes que suplente) sobre `base`,
  // respetando los mismos límites que el picker (presupuesto, máx por país).
  // Devuelve los picks resultantes y, si no entra, un mensaje explicando por qué.
  function addToPicks(
    base: Record<string, PlayerRow>,
    baseFormation: string,
    pid: number,
  ): { picks: Record<string, PlayerRow>; error: string | null } {
    const player = players.find((p) => p.id === pid);
    if (!player) return { picks: base, error: null };
    // Ya está en el equipo → no duplicar (no es error: el usuario lo ve en cancha).
    if (Object.values(base).some((p) => p.id === pid)) return { picks: base, error: null };

    // Presupuesto disponible (jugadores ya puestos + técnico elegido si lo hay).
    const coachPrice = coaches.find((c) => c.id === (initial?.coachId ?? null))?.price ?? 0;
    const usedNow = round1(Object.values(base).reduce((s, p) => s + p.price, 0) + coachPrice);
    if (player.price > round1(budget - usedNow) + 0.05) {
      return { picks: base, error: `No se puede sumar a ${player.name}: se pasa del presupuesto.` };
    }
    // Tope por país (solo en fase de grupos; en playoffs maxPerCountry es null).
    if (maxPerCountry != null) {
      const sameCountry = Object.values(base).filter((p) => p.countryId === player.countryId).length;
      if (sameCountry >= maxPerCountry) {
        return { picks: base, error: `Ya tenés ${maxPerCountry} jugadores de ${player.countryName}.` };
      }
    }
    const sl = buildSlots(baseFormation);
    const slot =
      sl.find((s) => s.isStarter && s.position === player.position && !base[s.id]) ??
      sl.find((s) => !s.isStarter && s.position === player.position && !base[s.id]);
    if (!slot) {
      return {
        picks: base,
        error: `Ya tenés todos tus ${POSITION_LABELS[player.position].toLowerCase()} cubiertos. Quitá uno para sumar a ${player.name}.`,
      };
    }
    return { picks: { ...base, [slot.id]: player }, error: null };
  }

  // Al montar: si hay un borrador (equipo armado sin login), lo restauramos. Si
  // además ya hay un equipo guardado y el borrador difiere, el usuario elige
  // cuál usar (no se pisa nada en la DB hasta que toque Guardar).
  // localStorage es client-only: leerlo en render rompería la hidratación, por
  // eso el setState va en un effect de montaje (corre solo en el cliente).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (draftHandled.current) return;
    draftHandled.current = true;
    const d = readDraft();

    // Intención explícita "agregar jugador" (deep-link /equipo?add=<id>).
    if (addPlayerId != null) {
      if (!initial) {
        // Sin equipo guardado: partimos del borrador (si hay) para no perder lo
        // que venía armando, y sumamos encima.
        const base = d ? draftToPicks(d) : {};
        const baseFormation = d && d.formation in FORMATIONS ? d.formation : formation;
        if (d) {
          setFormation(baseFormation);
          setCaptainId(d.captainPlayerId);
          setCoachId(d.coachId);
          if (d.teamName) setTeamName(d.teamName);
        }
        const res = addToPicks(base, baseFormation, addPlayerId);
        setPicks(res.picks);
        if (res.error) setMessage(res.error);
      } else {
        // Equipo guardado: sumamos sobre la alineación guardada e ignoramos un
        // borrador stale (el usuario pidió explícitamente sumar a SU equipo).
        const res = addToPicks(picks, formation, addPlayerId);
        setPicks(res.picks);
        if (res.error) setMessage(res.error);
        clearDraft();
      }
      // Limpiamos el ?add= para que un refresh no vuelva a agregarlo.
      router.replace("/equipo");
      return;
    }

    if (!d) return;
    if (!initial) {
      // Usuario sin equipo guardado (típicamente recién registrado): restauramos
      // el borrador. Si además tocó Guardar antes de loguearse, lo guardamos solo.
      applyDraft(d);
      if (d.submitted) autoSaveArmed.current = true;
    } else if (draftDiffers(d, initial)) {
      setDraftConflict(d);
    } else {
      clearDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Mientras NO estés logueado, persistimos el equipo en construcción para no
  // perderlo al mandarte a iniciar sesión. Logueado, la verdad es la DB.
  useEffect(() => {
    if (isAuthed) return;
    const hasContent = Object.keys(picks).length > 0 || teamName.trim() !== "" || coachId != null;
    if (!hasContent) return;
    const slotsMap: Record<string, number> = {};
    for (const [slot, p] of Object.entries(picks)) slotsMap[slot] = p.id;
    writeDraft({ formation, slots: slotsMap, captainPlayerId: captainId, coachId, teamName, submitted: false });
  }, [isAuthed, picks, formation, captainId, coachId, teamName]);

  // Si el usuario corrige el equipo (cambia jugadores, capitán, técnico o
  // formación) después de un error de guardado, limpiamos el mensaje viejo:
  // si no, queda pegado mostrando un problema que ya no existe.
  useEffect(() => {
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, coachId, captainId, formation]);

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
    if (!res.ok && res.error === "auth") {
      // Guardamos el borrador y volvemos a /equipo tras iniciar sesión, para no
      // perder el equipo recién armado.
      const slotsMap: Record<string, number> = {};
      for (const [slot, p] of Object.entries(picks)) slotsMap[slot] = p.id;
      writeDraft({ formation, slots: slotsMap, captainPlayerId: captainId, coachId, teamName, submitted: true });
      router.push(`/sign-in?redirect_url=${encodeURIComponent("/equipo")}`);
      return;
    }
    if (!res.ok && res.error === "pins") {
      // Solo mostramos la falta de pines cuando el saldo realmente no alcanza. Si
      // el usuario tiene suficientes (saldo ≥ necesarios) pero el guard rechazó por
      // una carrera, no tiene sentido el cartel contradictorio "necesitás 1, tenés 3":
      // mostramos un error genérico reintentable.
      const faltan = res.needed - res.balance;
      setMessage(
        faltan > 0
          ? `Te faltan ${faltan} pin(es) para esos cambios (tenés ${res.balance}).`
          : "No se pudo guardar. Intentá de nuevo.",
      );
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
    if (
      !res.ok &&
      (res.error === "invalid_formation" ||
        res.error === "invalid_squad_size" ||
        res.error === "invalid_formation_composition" ||
        res.error === "invalid_captain" ||
        res.error === "invalid")
    ) {
      setMessage("La alineación no es válida. Revisá titulares, suplentes y capitán.");
      return;
    }
    if (!res.ok) { setMessage("No se pudo guardar. Intentá de nuevo."); return; }
    clearDraft(); // guardado OK → el borrador local ya no hace falta
    // Confirmación en /mi-equipo: pasamos los números por query y ahí mostramos
    // un cartel de éxito (el armador navega de inmediato, no alcanza un toast acá).
    const params = new URLSearchParams({ saved: "1", ch: String(changesMade), pins: String(pinsDue) });
    router.push(`/mi-equipo?${params.toString()}`);
  }

  // Auto-guardado: si el equipo se restauró desde un borrador "submitted" (tocaste
  // Guardar sin estar logueado) y ya es válido, lo guardamos sin pedir otro click.
  useEffect(() => {
    if (!autoSaveArmed.current || saving || !valid) return;
    autoSaveArmed.current = false;
    void onSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, saving]);

  const budgetPct = Math.min(100, Math.round((used / budget) * 100));

  function openSlot(s: Slot) {
    setSearch("");
    setModalCountry("ALL");
    // No reseteamos modalSort: el filtro de orden ("Mejor puntuados", etc.)
    // se mantiene entre aperturas del modal para no tener que re-elegirlo cada vez.
    setModalShown(MODAL_PAGE);
    setModal({ type: "player", slot: s });
  }

  // Presupuesto disponible para ESTE slot: si ya hay alguien, su precio se libera
  // al reemplazarlo. Sirve para sombrear a los que no entran (no para bloquear el
  // resto del equipo).
  const slotCurrent = modal?.type === "player" ? picks[modal.slot.id] : null;
  const freeForSlot = round1(budget - used + (slotCurrent?.price ?? 0));

  useModalA11y(!!modal, modalRef, () => setModal(null));

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Barra de control compacta ─── */}
      <div className="rounded-[8px] border border-border bg-surface card-shadow px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="eyebrow text-blue-ink">{deadlineLabel}</span>
            {deadline && (
              <CloseCountdown deadline={deadline} prefix="Empieza en" className="text-[11px] font-semibold text-danger" />
            )}
          </span>
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
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Formación">
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => onFormationChange(f)}
              aria-label={`Formación ${f}`}
              aria-pressed={formation === f}
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

        {/* Rail derecho: el contenido scrollea, pero Guardar + el link de abajo
            quedan fijos al pie para que nunca se corten (a cualquier nivel de zoom). */}
        <div className="flex flex-col md:max-h-[calc(100svh-16.5rem)]">
        <div className="flex flex-col gap-3 md:overflow-y-auto md:pr-0.5">
          {/* Qué falta para guardar — arriba de todo para que se vea de entrada
              (Técnico quedaba "escondido" más abajo y el usuario no se enteraba). */}
          {errors.length > 0 && (
            <ValidationCallout type="warning">
              <p className="mb-1.5">Para guardar, te falta:</p>
              <ul className="space-y-0.5 font-normal">
                {errors.map((e) => (
                  <li key={e} className="flex items-start gap-1.5">
                    <span aria-hidden>·</span> {e}
                  </li>
                ))}
              </ul>
            </ValidationCallout>
          )}

          {/* Nombre del equipo (aparece en el ranking) — solo al armarlo por primera
              vez; una vez guardado queda fijo y no hace falta mostrar la box. */}
          {!nameLocked && (
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
          )}

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
                          onPointerDown={(e) => startDrag(e, s.id, s.position, p, true)}
                          onClick={() => setModal({ type: "swap", sub: s })}
                          aria-label={`Hacer entrar a ${p.name}`}
                          title="Tocá para hacerlo entrar (o arrastralo a un titular)"
                          className="shrink-0 cursor-pointer touch-none p-1 -m-1 text-ink-faint hover:text-blue md:cursor-grab md:active:cursor-grabbing"
                        >
                          {/* Mobile: ícono de acción (tap = sustituir). Desktop: handle de arrastre. */}
                          <ArrowDownUp size={15} className="text-blue md:hidden" />
                          <GripVertical size={14} className="hidden md:inline-block" />
                        </button>
                        {flagUrl(p.code) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagUrl(p.code)!} alt={p.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 rounded-sm object-cover shrink-0" />
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
              onClick={() => { setSearch(""); setModalShown(MODAL_PAGE); setModal({ type: "coach" }); }}
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
                <span className="jersey-numeral text-sm text-blue">Gratis</span>
              ) : null}
            </button>
          </div>

        </div>

        {/* Guardar — fuera del área que scrollea, siempre visible al pie del rail */}
        <div className="shrink-0 space-y-2 pt-3">
          {/* Cambios de la fecha — solo cuando hay fecha anterior (edición limitada) */}
          {limited && (
            <div className="rounded-[8px] border border-border bg-surface card-shadow px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                  <ArrowLeftRight size={14} strokeWidth={1.75} />
                </span>
                <Eyebrow className="flex-1">Cambios · {cc!.roundName}</Eyebrow>
                <span className="jersey-numeral text-base leading-none text-ink">
                  {cc!.isPremium ? "∞" : freeLeft}{" "}
                  <span className="text-[11px] font-normal text-ink-3">
                    {cc!.isPremium ? "ilimitados" : freeLeft === 1 ? "disponible" : "disponibles"}
                  </span>
                </span>
              </div>
              {changesMade > 0 && !cc!.isPremium && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-2">
                  Hiciste <strong>{changesMade}</strong> {changesMade === 1 ? "cambio" : "cambios"}
                  {pinsDue > 0 && (
                    <> · usás <strong>{pinsDue}</strong> {pinsDue === 1 ? "pin" : "pines"} (tenés {cc!.pinBalance})</>
                  )}
                </p>
              )}
              {!cc!.isPremium && freeLeft === 0 && (
                <Link
                  href="/pines"
                  className="mt-1 inline-block text-[11px] font-display text-gold-ink hover:text-gold transition-colors"
                >
                  ¿Querés más cambios? Comprá pines →
                </Link>
              )}
              {changesMade === 0 && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                  La ventana ya está abierta — no esperes a que se publiquen los puntos para hacer
                  tus cambios.
                </p>
              )}
            </div>
          )}
          {/* Caso borde: te sumás con el Mundial ya en juego → armado inicial gratis para la próxima fecha */}
          {cc && !limited && cc.roundStarted && (
            <div className="rounded-[8px] border border-blue/25 bg-blue/5 px-3 py-2 text-[11px] leading-relaxed text-ink-2">
              Te sumás con el Mundial en juego: armás tu equipo para {roundArticle(cc.roundName)}{" "}
              <strong className="text-blue">{roundDisplayName(cc.roundName)}</strong> y sumás desde ahí. Tenés cambios{" "}
              <strong className="text-blue">ilimitados</strong> hasta que arranque {roundArticle(cc.roundName)}{" "}
              <strong className="text-blue">{roundDisplayName(cc.roundName)}</strong>, luego será 1 por fecha.
            </div>
          )}

          {/* Validación */}
          {errors.length === 0 && (
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

          <PrimaryButton
            onClick={() => {
              if (!valid || saving) return;
              if (limited) setConfirmOpen(true); // pedimos confirmación del cambio
              else void onSave(); // edición libre → guardamos directo
            }}
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
      </div>

      {/* ─── Modal de selección ─── */}
      {modal && modal.type !== "swap" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modal.type === "coach" ? "Elegir técnico" : `Elegir ${POSITION_LABELS[modal.slot.position]}`}
          onClick={() => setModal(null)}
        >
          <div
            ref={modalRef}
            className="flex h-[85dvh] max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[12px] border border-border bg-surface card-shadow-lg md:h-auto md:max-h-[80vh] md:rounded-[12px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
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

            <div className="shrink-0 px-4 pt-4 pb-2">
              {modal.type === "coach" && (
                <p className="mb-3 text-xs leading-relaxed text-ink-3">
                  Tu DT suma según el resultado de su selección en cada fecha:{" "}
                  <strong className="text-ink-2">+2 si gana, −2 si pierde, 0 si empata</strong>.
                </p>
              )}
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setModalShown(MODAL_PAGE); }}
                placeholder="Buscar…"
                className="mb-2 w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
              />
              {modal.type === "player" && (
                <div className="mb-3 flex gap-2">
                  <select
                    value={modalCountry}
                    onChange={(e) => { setModalCountry(e.target.value); setModalShown(MODAL_PAGE); }}
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
                    onChange={(e) => { setModalSort(e.target.value as typeof modalSort); setModalShown(MODAL_PAGE); }}
                    aria-label="Ordenar"
                    className="shrink-0 appearance-none rounded-[6px] border border-border bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-2 outline-none hover:border-border-strong focus:border-blue cursor-pointer"
                  >
                    <option value="price-desc">Precio: mayor a menor</option>
                    <option value="price-asc">Precio: menor a mayor</option>
                    {hasStats && <option value="ppp-desc">Mejor puntuados</option>}
                    {hasOwnership && <option value="owned-desc">Más elegidos</option>}
                    <option value="name-asc">Nombre: A → Z</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
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
                        ? "presupuesto insuficiente"
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
                              ? "Presupuesto insuficiente"
                              : `Máximo ${maxPerCountry} jugadores por selección`
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-colors group",
                          selectable ? "hover:bg-surface-2" : "opacity-45 cursor-not-allowed",
                        )}
                      >
                        {flagUrl(p.code) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagUrl(p.code)!} alt={p.countryName} width={28} height={20} loading="lazy" decoding="async" className="h-5 w-7 rounded-sm object-cover shrink-0" />
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
                          <PlayerStatLine stats={stats[p.id]} ownership={ownership[p.id]} ownershipAvailable={hasOwnership} statsAvailable={hasStats} className="mt-0.5" />
                        </span>
                        <span className={cn("jersey-numeral text-sm shrink-0", selectable ? "text-blue" : "text-danger")}>{formatPrice(p.price)}M</span>
                      </button>
                      );
                    })
                  : modalCoaches.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setCoachId(c.id); setModal(null); }}
                        className="flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-colors group hover:bg-surface-2"
                      >
                        {flagUrl(c.code) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagUrl(c.code)!} alt={c.countryName} width={28} height={20} loading="lazy" decoding="async" className="h-5 w-7 rounded-sm object-cover shrink-0" />
                        ) : (
                          <div className="h-5 w-7 rounded-sm bg-surface-2 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink group-hover:text-blue">
                            {c.name}
                          </span>
                          <span className="block truncate text-xs text-ink-3">{c.countryName}</span>
                        </span>
                        <span className="jersey-numeral text-sm shrink-0 text-blue">Gratis</span>
                      </button>
                    ))}
                {modalHasMore && (
                  <button
                    type="button"
                    onClick={() => setModalShown((n) => n + MODAL_PAGE)}
                    className="mx-auto mt-1 block rounded-[6px] px-4 py-2 text-sm font-semibold text-blue hover:bg-blue-light transition-colors"
                  >
                    Mostrar más
                  </button>
                )}
              </div>
          </div>
        </div>
      )}

      {/* Hacer entrar un suplente: tap en el banco → elegir el titular de esa posición */}
      {swapSub && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Hacer entrar suplente"
          onClick={() => setModal(null)}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm rounded-t-[12px] border border-border bg-surface card-shadow-lg md:rounded-[12px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="min-w-0 truncate font-display text-lg text-ink">
                HACER ENTRAR A {(picks[swapSub.id]?.name ?? "SUPLENTE").toUpperCase()}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="shrink-0 rounded-full p-1.5 text-ink-3 hover:bg-surface-2 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3">
              <p className="mb-2 px-1 text-xs text-ink-3">
                ¿Por quién entra? Tocá un titular ({POSITION_LABELS[swapSub.position]}) y se intercambian.
              </p>
              <div className="space-y-1">
                {starterSlots
                  .filter((st) => st.position === swapSub.position)
                  .map((st) => {
                    const sp = picks[st.id];
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => { swapSlots(swapSub.id, st.id); setModal(null); }}
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-2.5 text-left hover:bg-surface-2 transition-colors"
                      >
                        {sp ? (
                          <>
                            {flagUrl(sp.code) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={flagUrl(sp.code)!} alt={sp.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                            ) : (
                              <div className="h-4 w-6 shrink-0 rounded-sm bg-surface-2" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{sp.name}</span>
                            <span className="jersey-numeral shrink-0 text-xs text-gold-ink">{formatPrice(sp.price)}M</span>
                          </>
                        ) : (
                          <span className="flex-1 text-sm text-ink-faint">Lugar libre</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipo armado sin login: cargarlo o mantener el equipo guardado */}
      {draftConflict && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Tenés un equipo sin guardar"
        >
          <div className="w-full max-w-sm rounded-[12px] border border-border bg-surface card-shadow-lg p-5 animate-slide-up">
            <h3 className="font-display text-xl text-ink">Tenés un equipo sin guardar</h3>
            <p className="mt-2 text-sm text-ink-2">
              Armaste un equipo antes de iniciar sesión. ¿Querés cargarlo o seguir con tu
              equipo ya guardado? No se pisa nada hasta que toques Guardar.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => { applyDraft(draftConflict); setDraftConflict(null); }}
                className="rounded-[6px] bg-blue px-4 py-2.5 text-sm font-display text-white hover:bg-blue-hover transition-colors"
              >
                Cargar el equipo que armé
              </button>
              <button
                onClick={() => { clearDraft(); setDraftConflict(null); }}
                className="rounded-[6px] border border-border px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
              >
                Mantener mi equipo guardado
              </button>
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
                    {flagUrl(p.code) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={flagUrl(p.code)!} alt="" aria-hidden width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 rounded-sm object-cover" />
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

      {/* Confirmación antes de guardar — avisa el cambio gratis / costo en pines de la fecha.
          Solo aparece en edición limitada (hay fecha anterior); el armado libre guarda directo. */}
      {confirmOpen && cc && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar equipo"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[12px] border border-border bg-surface card-shadow-lg p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-ink">Confirmá tu equipo · {roundDisplayName(cc.roundName)}</h3>

            {cc.roundStarted && (
              <p className="mt-2 text-sm text-ink-2">
                El Mundial ya está en juego: vas a fijar tu equipo para {roundArticle(cc.roundName)} <strong>{roundDisplayName(cc.roundName)}</strong>.
              </p>
            )}

            {changesMade === 0 ? (
              coachChanged ? (
                <p className="mt-2 text-sm text-ink-2">
                  Cambiás tu <strong>técnico</strong>. No usa tu cambio gratis ni cuesta pines.
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-2">
                  No hiciste cambios: seguís con el mismo equipo y sigue sumando.
                </p>
              )
            ) : cc.isPremium ? (
              <p className="mt-2 text-sm text-ink-2">
                Estás haciendo <strong>{changesMade}</strong> {changesMade === 1 ? "cambio" : "cambios"}. Tenés cambios{" "}
                <strong>ilimitados</strong> (premium).
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-2">
                Estás haciendo <strong>{changesMade}</strong> {changesMade === 1 ? "cambio" : "cambios"} en esta fecha.{" "}
                {freeUsedNow > 0 && pinsDue === 0 ? (
                  <>Usás tu <strong>cambio gratis</strong>.</>
                ) : freeUsedNow > 0 && pinsDue > 0 ? (
                  <>{freeUsedNow} gratis y el resto cuesta <strong>{pinsDue}</strong> {pinsDue === 1 ? "pin" : "pines"} (tenés {cc.pinBalance}).</>
                ) : pinsDue > 0 ? (
                  <>Cuesta <strong>{pinsDue}</strong> {pinsDue === 1 ? "pin" : "pines"} (tenés {cc.pinBalance}). Ya usaste tu cambio gratis de la fecha.</>
                ) : (
                  <>Sin costo extra (ya estaban pagos).</>
                )}
              </p>
            )}

            {changesMade > 0 && (leaving.length > 0 || entering.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[8px] border border-border bg-canvas p-2.5">
                <div className="min-w-0">
                  <p className="eyebrow mb-1.5 text-danger">Salen</p>
                  <ul className="space-y-1.5">
                    {leaving.map((p) => (
                      <li key={p.id} className="flex items-center gap-1.5">
                        {flagUrl(p.code) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagUrl(p.code)!} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                        )}
                        <span className="truncate text-[12px] text-ink-2">{p.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0">
                  <p className="eyebrow mb-1.5 text-success">Entran</p>
                  <ul className="space-y-1.5">
                    {entering.map((p) => (
                      <li key={p.id} className="flex items-center gap-1.5">
                        {flagUrl(p.code) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagUrl(p.code)!} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                        )}
                        <span className="truncate text-[12px] font-semibold text-ink">{p.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {coachChanged && (
              <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-border bg-canvas p-2.5">
                <span className="eyebrow shrink-0 text-blue">DT</span>
                <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px]">
                  {prevCoach && (
                    <span className="flex min-w-0 items-center gap-1 text-ink-3 line-through">
                      {flagUrl(prevCoach.code) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flagUrl(prevCoach.code)!} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                      )}
                      <span className="truncate">{prevCoach.name}</span>
                    </span>
                  )}
                  <span className="shrink-0 text-ink-3">→</span>
                  <span className="flex min-w-0 items-center gap-1 font-semibold text-ink">
                    {coach && flagUrl(coach.code) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={flagUrl(coach.code)!} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                    )}
                    <span className="truncate">{coach?.name ?? "—"}</span>
                  </span>
                </div>
              </div>
            )}

            {notEnoughPins && (
              <div className="mt-3 rounded-[8px] border border-gold-border bg-gold-bg px-3 py-2 text-xs text-gold-ink">
                No te alcanzan los pines (necesitás {pinsDue}, tenés {cc.pinBalance}).{" "}
                <Link href="/pines" className="font-display underline">Comprar pines →</Link>
              </div>
            )}

            {!cc.isPremium && pinsDue > 0 && !notEnoughPins && (
              <p className="mt-2 text-[11px] text-ink-3">
                ¿Querés hacer más cambios?{" "}
                <Link href="/pines" className="font-semibold text-gold-ink hover:text-gold">Comprá pines</Link>.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-[6px] border border-border px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmOpen(false); void onSave(); }}
                disabled={notEnoughPins || saving}
                className="rounded-[6px] bg-blue px-4 py-2 text-sm font-display text-white hover:bg-blue-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fantasma que sigue al puntero mientras se arrastra un suplente */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-[6px] border border-gold-border bg-surface px-2 py-1 card-shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {flagUrl(drag.player.code) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flagUrl(drag.player.code)!} alt="" aria-hidden width={24} height={16} decoding="async" className="h-4 w-6 rounded-sm object-cover" />
          )}
          <span className="text-xs font-bold text-ink">{drag.player.name}</span>
        </div>
      )}
    </div>
  );
}
