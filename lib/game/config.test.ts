import { describe, it, expect } from "vitest";
import {
  getFreeChangesForRound,
  FREE_CHANGES_PER_ROUND,
  FREE_CHANGES_PLAYOFFS,
  FREE_CHANGES_R16,
} from "./config";

describe("getFreeChangesForRound", () => {
  it("da el default en fase de grupos (orders 1-3)", () => {
    for (const order of [1, 2, 3]) {
      expect(getFreeChangesForRound(order, false)).toBe(FREE_CHANGES_PER_ROUND);
      expect(getFreeChangesForRound(order, true)).toBe(FREE_CHANGES_PER_ROUND);
    }
  });

  it("en 16vos (order 4) mantiene el default salvo inscriptos en la Copa", () => {
    expect(getFreeChangesForRound(4, false)).toBe(FREE_CHANGES_PER_ROUND);
    expect(getFreeChangesForRound(4, true)).toBe(FREE_CHANGES_R16);
  });

  it("desde 8vos (order ≥ 5) da 2 cambios gratis para TODOS", () => {
    for (const order of [5, 6, 7, 8]) {
      expect(getFreeChangesForRound(order, false)).toBe(FREE_CHANGES_PLAYOFFS);
      expect(getFreeChangesForRound(order, true)).toBe(FREE_CHANGES_PLAYOFFS);
    }
  });
});
