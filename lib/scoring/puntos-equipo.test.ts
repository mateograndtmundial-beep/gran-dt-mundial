import { describe, it, expect } from "vitest";
import {
  computeEffectiveStarters,
  computeEntryTotal,
  sumRoundPoints,
  type LineupSlot,
  type ScoringContext,
} from "@/lib/scoring/puntos-equipo";

// Helper para armar un contexto de scoring desde maps simples.
function ctx(opts: {
  pts?: Record<number, number>;
  base?: Record<number, number>;
  playedIds?: number[];
  coachCountry?: Record<number, number>;
  countryResult?: Record<number, "win" | "loss" | "draw">;
}): ScoringContext {
  const played = new Set(opts.playedIds ?? []);
  return {
    pts: new Map(Object.entries(opts.pts ?? {}).map(([k, v]) => [Number(k), v])),
    base: new Map(Object.entries(opts.base ?? {}).map(([k, v]) => [Number(k), v])),
    played: (id) => played.has(id),
    coachCountry: new Map(Object.entries(opts.coachCountry ?? {}).map(([k, v]) => [Number(k), v])),
    countryResult: new Map(Object.entries(opts.countryResult ?? {}).map(([k, v]) => [Number(k), v])),
  };
}

// Alineación mínima: 1 titular DEF + 1 suplente DEF (para probar auto-sub).
const lineupDef: LineupSlot[] = [
  { playerId: 1, isStarter: true, slot: "DEF_1" },
  { playerId: 2, isStarter: false, slot: "SUB_DEF" },
];

describe("computeEffectiveStarters (auto-sustitución)", () => {
  it("mantiene al titular si jugó", () => {
    const eff = computeEffectiveStarters(lineupDef, (id) => id === 1);
    expect(eff.get(1)).toBe(1);
  });

  it("reemplaza por el suplente de su posición si el titular no jugó y el suplente sí", () => {
    const eff = computeEffectiveStarters(lineupDef, (id) => id === 2);
    expect(eff.get(1)).toBe(2);
  });

  it("deja al titular (0 pts) si ni él ni el suplente jugaron", () => {
    const eff = computeEffectiveStarters(lineupDef, () => false);
    expect(eff.get(1)).toBe(1);
  });

  it("no usa el suplente de otra posición", () => {
    const lineup: LineupSlot[] = [
      { playerId: 1, isStarter: true, slot: "DEF_1" },
      { playerId: 9, isStarter: false, slot: "SUB_MID" },
    ];
    const eff = computeEffectiveStarters(lineup, (id) => id === 9);
    expect(eff.get(1)).toBe(1); // sin reemplazo válido
  });
});

describe("computeEntryTotal", () => {
  it("suma los puntos de los titulares", () => {
    const total = computeEntryTotal(
      { captainPlayerId: null, coachId: null, lineup: lineupDef },
      ctx({ pts: { 1: 8 }, playedIds: [1] }),
    );
    expect(total).toBe(8);
  });

  it("cuando el titular no juega, suma los puntos del suplente que entró", () => {
    const total = computeEntryTotal(
      { captainPlayerId: null, coachId: null, lineup: lineupDef },
      ctx({ pts: { 1: 8, 2: 5 }, playedIds: [2] }),
    );
    expect(total).toBe(5);
  });

  it("el capitán suma su rating base una vez más", () => {
    const total = computeEntryTotal(
      { captainPlayerId: 1, coachId: null, lineup: lineupDef },
      ctx({ pts: { 1: 8 }, base: { 1: 7 }, playedIds: [1] }),
    );
    expect(total).toBe(15);
  });

  it("si el capitán no jugó, el bonus se pierde (no pasa al suplente)", () => {
    const total = computeEntryTotal(
      { captainPlayerId: 1, coachId: null, lineup: lineupDef },
      ctx({ pts: { 1: 8, 2: 6 }, base: { 2: 6.5 }, playedIds: [2] }),
    );
    // titular 1 (capitán) no jugó → puntúa el suplente 2 (6 pts) en su lugar,
    // pero el bonus de capitán se pierde (no se duplica el rating del suplente)
    expect(total).toBe(6);
  });

  it("capitán sin rating registrado: bonus 0", () => {
    const total = computeEntryTotal(
      { captainPlayerId: 1, coachId: null, lineup: lineupDef },
      ctx({ pts: { 1: 4 }, base: {}, playedIds: [1] }),
    );
    expect(total).toBe(4);
  });

  it("suma los puntos del técnico según el resultado de su selección", () => {
    const total = computeEntryTotal(
      { captainPlayerId: null, coachId: 100, lineup: lineupDef },
      ctx({ pts: { 1: 8 }, playedIds: [1], coachCountry: { 100: 50 }, countryResult: { 50: "win" } }),
    );
    expect(total).toBe(10); // 8 + 2 (coachWin)
  });

  it("redondea sin drift de punto flotante", () => {
    const lineup: LineupSlot[] = [
      { playerId: 1, isStarter: true, slot: "MID_1" },
      { playerId: 2, isStarter: true, slot: "MID_2" },
      { playerId: 3, isStarter: true, slot: "MID_3" },
    ];
    const total = computeEntryTotal(
      { captainPlayerId: null, coachId: null, lineup },
      ctx({ pts: { 1: 0.1, 2: 0.2, 3: 0.1 }, playedIds: [1, 2, 3] }),
    );
    expect(total).toBe(0.4);
  });
});

describe("sumRoundPoints", () => {
  it("suma totales de fecha sin drift", () => {
    expect(sumRoundPoints([10.1, 0.2, 5.3])).toBe(15.6);
  });
});
