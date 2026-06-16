import { describe, it, expect } from "vitest";
import { parseMatchTiming, concededWhileOnPitch } from "@/lib/api-football/timing";

const HOME = 100;
const AWAY = 200;

// Eventos al estilo API-Football (solo los campos que usa el parser).
const goal = (team: number, min: number, detail = "Normal Goal", extra: object = {}) => ({
  type: "Goal",
  detail,
  team: { id: team },
  time: { elapsed: min, extra: null },
  ...extra,
});
const subst = (team: number, min: number, inId: number, outId: number) => ({
  type: "subst",
  detail: "Substitution 1",
  team: { id: team },
  time: { elapsed: min, extra: null },
  player: { id: inId },
  assist: { id: outId },
});

describe("parseMatchTiming", () => {
  it("atribuye cada gol al equipo que lo RECIBE (el rival del que convierte)", () => {
    const t = parseMatchTiming([goal(HOME, 30), goal(AWAY, 60), goal(AWAY, 80)], HOME);
    expect(t.concededMinutes.home).toEqual([60, 80]); // HOME recibió los goles de AWAY
    expect(t.concededMinutes.away).toEqual([30]); // AWAY recibió el gol de HOME
  });

  it("el autogol cuenta como gol recibido por el equipo del autor", () => {
    const t = parseMatchTiming([goal(HOME, 30, "Own Goal")], HOME);
    expect(t.concededMinutes.home).toEqual([30]);
    expect(t.concededMinutes.away).toEqual([]);
  });

  it("ignora la tanda de penales y los penales errados", () => {
    const t = parseMatchTiming(
      [
        goal(HOME, 120, "Normal Goal", { comments: "Penalty Shootout" }),
        goal(AWAY, 70, "Missed Penalty"),
      ],
      HOME,
    );
    expect(t.concededMinutes.home).toEqual([]);
    expect(t.concededMinutes.away).toEqual([]);
  });

  it("suma el tiempo agregado al minuto del gol", () => {
    const t = parseMatchTiming([{ ...goal(AWAY, 90), time: { elapsed: 90, extra: 3 } }], HOME);
    expect(t.concededMinutes.home).toEqual([93]);
  });

  it("arma la ventana en cancha: el que entra desde el minuto X, el que sale hasta X", () => {
    const t = parseMatchTiming([subst(HOME, 66, /*in*/ 5, /*out*/ 9)], HOME);
    expect(t.intervals.get(5)).toEqual({ enter: 66, exit: Infinity });
    expect(t.intervals.get(9)).toEqual({ enter: 0, exit: 66 });
  });

  it("la roja directa termina la ventana del jugador", () => {
    const t = parseMatchTiming(
      [{ type: "Card", detail: "Red Card", team: { id: HOME }, time: { elapsed: 40, extra: null }, player: { id: 7 } }],
      HOME,
    );
    expect(t.intervals.get(7)).toEqual({ enter: 0, exit: 40 });
  });
});

describe("concededWhileOnPitch", () => {
  it("cuenta solo los goles dentro de la ventana del jugador", () => {
    const conceded = [51, 64, 89];
    // Suplente que entró en el 66: solo el del 89 lo agarra en cancha.
    expect(concededWhileOnPitch({ enter: 66, exit: Infinity }, conceded)).toBe(1);
    // Titular que salió en el 60: ningún gol estando él (51 y 64... 51 sí < 60).
    expect(concededWhileOnPitch({ enter: 0, exit: 50 }, conceded)).toBe(0);
    // Jugó todo el partido: recibió los 3.
    expect(concededWhileOnPitch({ enter: 0, exit: Infinity }, conceded)).toBe(3);
  });

  it("el caso del enunciado: entra 0-3 en el 2T y no recibe más → valla (0 recibidos)", () => {
    const conceded = [12, 25, 40]; // los 3 goles fueron en el 1T
    expect(concededWhileOnPitch({ enter: 46, exit: Infinity }, conceded)).toBe(0);
  });

  it("titular que sale antes del gol no pierde la valla", () => {
    const conceded = [70];
    expect(concededWhileOnPitch({ enter: 0, exit: 65 }, conceded)).toBe(0);
  });
});
