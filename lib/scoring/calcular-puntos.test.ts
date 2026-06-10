import { describe, it, expect } from "vitest";
import { calcularPuntos, calcularPuntosTecnico, type StatsInput } from "@/lib/scoring/calcular-puntos";
import { SCORING } from "@/lib/game/config";

const base: StatsInput = {
  position: "MID",
  minutes: 90,
  rating: 7,
  goals: 0,
  penaltyGoals: 0,
  assists: 0,
  yellow: 0,
  red: 0,
  ownGoals: 0,
  penaltiesSaved: 0,
  penaltiesMissed: 0,
  goalsConceded: 0,
  cleanSheet: false,
  isMotm: false,
  isCaptain: false,
};

describe("calcularPuntos", () => {
  it("usa el rating como base cuando jugó >= minMinutes", () => {
    expect(calcularPuntos({ ...base, rating: 7 }).base).toBe(7);
  });

  it("no da base si jugó menos de minMinutes", () => {
    const r = calcularPuntos({ ...base, minutes: SCORING.minMinutes - 1, rating: 9 });
    expect(r.base).toBe(0);
    expect(r.total).toBe(0);
  });

  it("si jugó menos de minMinutes no suma NADA, ni siquiera goles/asistencias/figura", () => {
    const r = calcularPuntos({
      ...base,
      position: "FWD",
      minutes: SCORING.minMinutes - 1,
      rating: 9,
      goals: 3,
      assists: 2,
      isMotm: true,
      isCaptain: true,
    });
    expect(r).toEqual({
      base: 0,
      captainBonus: 0,
      goals: 0,
      assists: 0,
      cleanSheet: 0,
      penaltySaved: 0,
      goalsConceded: 0,
      motm: 0,
      cards: 0,
      ownGoals: 0,
      penaltyMissed: 0,
      total: 0,
    });
  });

  it("base 0 si no hay rating aunque haya jugado", () => {
    expect(calcularPuntos({ ...base, rating: null }).base).toBe(0);
  });

  it("el capitán duplica solo el rating base", () => {
    const r = calcularPuntos({ ...base, rating: 7, isCaptain: true });
    expect(r.captainBonus).toBe(7);
    expect(r.total).toBe(14);
  });

  it("redondea un rating decimal a entero antes de puntuar (y el capitán duplica el entero)", () => {
    const r = calcularPuntos({ ...base, rating: 7.5, isCaptain: true });
    expect(r.base).toBe(8);
    expect(r.captainBonus).toBe(8);
    expect(r.total).toBe(16);
    expect(calcularPuntos({ ...base, rating: 7.4 }).base).toBe(7);
  });

  it("puntúa goles según la posición", () => {
    const fwd = calcularPuntos({ ...base, position: "FWD", rating: 6, goals: 1 });
    expect(fwd.goals).toBe(SCORING.goalByPosition.FWD);
    const def = calcularPuntos({ ...base, position: "DEF", rating: 6, goals: 1 });
    expect(def.goals).toBe(SCORING.goalByPosition.DEF);
  });

  it("los goles de penal valen distinto que los de juego", () => {
    const r = calcularPuntos({ ...base, position: "FWD", rating: 6, goals: 2, penaltyGoals: 1 });
    expect(r.goals).toBe(SCORING.goalByPosition.FWD + SCORING.penaltyGoal);
  });

  it("roja fija -4 e ignora amarillas en el mismo partido", () => {
    const r = calcularPuntos({ ...base, rating: 6, yellow: 1, red: 1 });
    expect(r.cards).toBe(SCORING.red);
  });

  it("clean sheet solo aplica a GK/DEF y si jugó", () => {
    expect(calcularPuntos({ ...base, position: "GK", rating: 6, cleanSheet: true }).cleanSheet).toBe(SCORING.cleanSheet.GK);
    expect(calcularPuntos({ ...base, position: "FWD", rating: 6, cleanSheet: true }).cleanSheet).toBe(0);
  });

  it("el total siempre es entero", () => {
    const r = calcularPuntos({ ...base, rating: 7.25, isCaptain: true });
    expect(Number.isInteger(r.total)).toBe(true);
  });

  it("penal errado resta (cualquier posición)", () => {
    expect(calcularPuntos({ ...base, rating: 6, penaltiesMissed: 1 }).penaltyMissed).toBe(SCORING.penaltyMissed);
  });

  it("autogol resta (cualquier posición)", () => {
    expect(calcularPuntos({ ...base, rating: 6, ownGoals: 1 }).ownGoals).toBe(SCORING.ownGoal);
  });

  it("penal atajado suma al arquero", () => {
    expect(calcularPuntos({ ...base, position: "GK", rating: 6, penaltiesSaved: 1 }).penaltySaved).toBe(SCORING.penaltySaved);
  });

  it("gol recibido resta solo al arquero", () => {
    expect(calcularPuntos({ ...base, position: "GK", rating: 6, goalsConceded: 2 }).goalsConceded).toBe(2 * SCORING.goalConcededGK);
    expect(calcularPuntos({ ...base, position: "DEF", rating: 6, goalsConceded: 2 }).goalsConceded).toBe(0);
  });

  it("asistencia y figura suman", () => {
    expect(calcularPuntos({ ...base, rating: 6, assists: 1 }).assists).toBe(SCORING.assist);
    expect(calcularPuntos({ ...base, rating: 6, isMotm: true }).motm).toBe(SCORING.motm);
  });
});

describe("calcularPuntosTecnico", () => {
  it("win/loss/draw", () => {
    expect(calcularPuntosTecnico("win")).toBe(SCORING.coachWin);
    expect(calcularPuntosTecnico("loss")).toBe(SCORING.coachLoss);
    expect(calcularPuntosTecnico("draw")).toBe(0);
  });
});
