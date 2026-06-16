/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ventana de un jugador en cancha, en minutos. `exit = Infinity` = no salió. */
export interface OnPitch {
  enter: number;
  exit: number;
}

export interface MatchTiming {
  /** Minutos en los que cada equipo RECIBIÓ un gol (excluye la tanda de penales). */
  concededMinutes: { home: number[]; away: number[] };
  /** apiFootballId del jugador → ventana en cancha (entrada/salida). */
  intervals: Map<number, OnPitch>;
}

/** Minuto absoluto de un evento (incluye el tiempo agregado: 90+3 → 93). */
function eventMinute(e: any): number {
  return (e?.time?.elapsed ?? 0) + (e?.time?.extra ?? 0);
}

/**
 * Reconstruye, a partir de los eventos de API-Football, (a) en qué minutos
 * recibió un gol cada equipo y (b) la ventana en cancha de cada jugador
 * (entrada/salida por cambio o expulsión). Es la base para calcular la valla
 * invicta y los goles recibidos del arquero A NIVEL JUGADOR (solo lo que pasó
 * mientras estuvo en cancha), en vez de a nivel equipo.
 *
 * Convención de los eventos (verificada empíricamente contra la API, 75/76
 * sustituciones): en un `subst`, `player` es quien SALE y `assist` quien ENTRA
 * (al revés de lo que sugiere el nombre del campo); en un `Goal`, `team` es quien
 * convierte (el rival recibe), salvo el autogol, donde `team` es el equipo del
 * autor (que es justamente el que recibe). La tanda de penales (`comments:
 * "Penalty Shootout"`) y los penales errados (`detail: "Missed Penalty"`) no son
 * goles.
 */
export function parseMatchTiming(events: any[], homeTeamApi: number | undefined): MatchTiming {
  const home: number[] = [];
  const away: number[] = [];
  const intervals = new Map<number, OnPitch>();

  const ensure = (apiId: number): OnPitch => {
    let iv = intervals.get(apiId);
    if (!iv) {
      iv = { enter: 0, exit: Infinity };
      intervals.set(apiId, iv);
    }
    return iv;
  };

  for (const e of events ?? []) {
    if (e?.comments === "Penalty Shootout") continue; // la tanda no cuenta como gol recibido
    const min = eventMinute(e);

    if (e?.type === "Goal") {
      if (e?.detail === "Missed Penalty") continue; // no es gol
      const scorerIsHome = e?.team?.id === homeTeamApi;
      if (e?.detail === "Own Goal") {
        // El autogol lo "anota" el equipo del autor → ese equipo es el que recibe.
        (scorerIsHome ? home : away).push(min);
      } else {
        // Gol normal/de penal: lo convierte e.team → el RIVAL recibe.
        (scorerIsHome ? away : home).push(min);
      }
    } else if (e?.type === "subst") {
      // OJO: en el feed de API-Football `player` es quien SALE y `assist` quien
      // ENTRA (verificado: 75/76 sustituciones tenían al titular en `player`).
      const outId = e?.player?.id;
      const inId = e?.assist?.id;
      if (inId != null) ensure(inId).enter = Math.max(ensure(inId).enter, min);
      if (outId != null) ensure(outId).exit = Math.min(ensure(outId).exit, min);
    } else if (e?.type === "Card" && e?.detail === "Red Card") {
      const pid = e?.player?.id;
      if (pid != null) ensure(pid).exit = Math.min(ensure(pid).exit, min);
    }
  }

  return { concededMinutes: { home, away }, intervals };
}

/**
 * Goles que recibió el equipo del jugador MIENTRAS estuvo en cancha. Un gol en
 * el minuto `m` cuenta si `enter <= m <= exit`. La valla invicta es `=== 0`.
 */
export function concededWhileOnPitch(on: OnPitch, teamConcededMinutes: number[]): number {
  return teamConcededMinutes.reduce((n, m) => (m >= on.enter && m <= on.exit ? n + 1 : n), 0);
}
