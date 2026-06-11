import { describe, it, expect } from "vitest";
import { countPlayerChanges, pinsForChanges, freeChangesLeft, pinsDueNow } from "./changes";

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
