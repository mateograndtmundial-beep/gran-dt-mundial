/**
 * Persistencia local (localStorage) del equipo en construcción.
 *
 * Problema que resuelve: un usuario NO logueado arma su equipo en `/equipo`, y
 * al guardar lo mandamos a iniciar sesión. Como el estado vive solo en React, la
 * navegación al login lo borraba. Guardamos un borrador para restaurarlo al
 * volver (y para resolver el conflicto si ya tenía un equipo guardado).
 *
 * Es código de cliente puro: sin imports de servidor.
 */

export type LineupDraft = {
  v: 1;
  formation: string;
  slots: Record<string, number>; // slotId -> playerId
  captainPlayerId: number | null;
  coachId: number | null;
  teamName: string;
  // true si el usuario tocó Guardar (y lo mandamos a loguearse): al volver lo
  // guardamos solo. false si sólo estaba armando sin intención explícita de guardar.
  submitted: boolean;
  savedAt: number; // epoch ms — para expirar borradores viejos
};

const KEY = "l11ds:lineup-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export function readDraft(): LineupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as LineupDraft;
    if (d?.v !== 1 || typeof d.savedAt !== "number" || typeof d.slots !== "object") return null;
    if (Date.now() - d.savedAt > MAX_AGE_MS) {
      clearDraft();
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function writeDraft(d: Omit<LineupDraft, "v" | "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: LineupDraft = { ...d, v: 1, savedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // localStorage lleno/deshabilitado (modo privado, etc.): ignorar.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** ¿El borrador difiere de la alineación ya guardada (initial)? */
export function draftDiffers(
  draft: LineupDraft,
  initial: {
    formation: string;
    captainPlayerId: number | null;
    coachId: number | null;
    slots: Record<string, number>;
  },
): boolean {
  if (draft.formation !== initial.formation) return true;
  if (draft.captainPlayerId !== initial.captainPlayerId) return true;
  if (draft.coachId !== initial.coachId) return true;
  const a = draft.slots;
  const b = initial.slots;
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return true;
  for (const k of ak) if (a[k] !== b[k]) return true;
  return false;
}
