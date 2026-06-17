import { describe, it, expect } from "vitest";
import { countPlayerChanges, pinsForChanges, freeChangesLeft, pinsDueNow, roundTally } from "./changes";

describe("countPlayerChanges", () => {
  it("sin baseline (primer equipo / fecha 1) = 0 cambios", () => {
    expect(countPlayerChanges([1, 2, 3], null)).toBe(0);
  });
  it("mismo conjunto de jugadores = 0 cambios (aunque cambie el orden)", () => {
    expect(countPlayerChanges([3, 1, 2], [1, 2, 3])).toBe(0);
  });
  it("cuenta solo los jugadores nuevos", () => {
    expect(countPlayerChanges([1, 2, 9], [1, 2, 3])).toBe(1);
    expect(countPlayerChanges([7, 8, 3], [1, 2, 3])).toBe(2);
  });
  it("reemplazar todos = todos cambios", () => {
    expect(countPlayerChanges([4, 5, 6], [1, 2, 3])).toBe(3);
  });
});

describe("pinsForChanges", () => {
  it("hasta los cambios gratis no cuesta nada", () => {
    expect(pinsForChanges(0, { freeChanges: 1, isPremium: false })).toBe(0);
    expect(pinsForChanges(1, { freeChanges: 1, isPremium: false })).toBe(0);
  });
  it("cada cambio extra cuesta 1 pin", () => {
    expect(pinsForChanges(2, { freeChanges: 1, isPremium: false })).toBe(1);
    expect(pinsForChanges(4, { freeChanges: 1, isPremium: false })).toBe(3);
  });
  it("premium nunca paga", () => {
    expect(pinsForChanges(5, { freeChanges: 1, isPremium: true })).toBe(0);
  });
});

describe("freeChangesLeft", () => {
  it("descuenta los usados sin pasar de 0", () => {
    expect(freeChangesLeft(0, 1)).toBe(1);
    expect(freeChangesLeft(1, 1)).toBe(0);
    expect(freeChangesLeft(3, 1)).toBe(0);
  });
});

describe("pinsDueNow", () => {
  it("descuenta lo ya gastado en la fecha", () => {
    expect(pinsDueNow(2, 0)).toBe(2);
    expect(pinsDueNow(2, 1)).toBe(1);
  });
  it("revertir cambios no cobra (la devolución la maneja el server)", () => {
    expect(pinsDueNow(0, 1)).toBe(0);
    expect(pinsDueNow(1, 2)).toBe(0);
  });
});

describe("roundTally (baseline = equipo confirmado, acumulado monótono)", () => {
  const F = { freeChanges: 1, isPremium: false };

  it("1er cambio de la fecha es gratis", () => {
    const t = roundTally({ priorChanges: 0, newChanges: 1, alreadySpent: 0, ...F });
    expect(t).toMatchObject({ totalChanges: 1, pinsTotal: 0, pinsDue: 0, freeLeft: 0, freeUsedNow: 1 });
  });

  it("escenario del bug: tras confirmar el cambio gratis, otro cambio cuesta 1 pin (no recuenta el anterior)", () => {
    // Ya confirmó 1 cambio (gratis): priorChanges=1, alreadySpent=0. Hace 1 cambio nuevo.
    const t = roundTally({ priorChanges: 1, newChanges: 1, alreadySpent: 0, ...F });
    expect(t.totalChanges).toBe(2);
    expect(t.pinsTotal).toBe(1);
    expect(t.pinsDue).toBe(1); // cobra 1 pin nuevo
    expect(t.freeLeft).toBe(0);
    expect(t.freeUsedNow).toBe(0); // el cupo gratis ya estaba consumido
  });

  it("revertir un cambio confirmado cuenta como cambio nuevo (cuesta, no devuelve)", () => {
    // Ya hizo 2 cambios (1 gratis + 1 pin, pinsSpent=1). Revierte uno → 1 cambio nuevo.
    const t = roundTally({ priorChanges: 2, newChanges: 1, alreadySpent: 1, ...F });
    expect(t.totalChanges).toBe(3);
    expect(t.pinsTotal).toBe(2);
    expect(t.pinsDue).toBe(1); // 1 pin adicional, nunca negativo
  });

  it("2 cambios en una sola edición: 1 gratis + 1 pin", () => {
    const t = roundTally({ priorChanges: 0, newChanges: 2, alreadySpent: 0, ...F });
    expect(t).toMatchObject({ totalChanges: 2, pinsTotal: 1, pinsDue: 1, freeUsedNow: 1 });
  });

  it("delta (pinsDue) nunca es negativo aunque el acumulado no cambie", () => {
    const t = roundTally({ priorChanges: 2, newChanges: 0, alreadySpent: 1, ...F });
    expect(t.pinsDue).toBe(0); // re-guardar sin cambios nuevos no cobra ni devuelve
  });

  it("premium nunca paga", () => {
    const t = roundTally({ priorChanges: 3, newChanges: 2, alreadySpent: 0, freeChanges: 1, isPremium: true });
    expect(t.pinsTotal).toBe(0);
    expect(t.pinsDue).toBe(0);
  });
});
