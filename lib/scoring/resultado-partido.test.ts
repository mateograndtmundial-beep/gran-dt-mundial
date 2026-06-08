import { describe, it, expect } from "vitest";
import { resolveMatchOutcome, type MatchScore } from "@/lib/scoring/resultado-partido";

const m = (over: Partial<MatchScore>): MatchScore => ({
  homeCountryId: 1,
  awayCountryId: 2,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  ...over,
});

describe("resolveMatchOutcome", () => {
  it("gana el local por goles", () => {
    expect(resolveMatchOutcome(m({ homeScore: 2, awayScore: 0 }))).toEqual({
      decided: true,
      winnerId: 1,
      loserId: 2,
      viaPenalties: false,
    });
  });

  it("gana el visitante por goles", () => {
    expect(resolveMatchOutcome(m({ homeScore: 1, awayScore: 3 }))).toEqual({
      decided: true,
      winnerId: 2,
      loserId: 1,
      viaPenalties: false,
    });
  });

  it("empate de grupos (sin tanda) no define", () => {
    expect(resolveMatchOutcome(m({ homeScore: 1, awayScore: 1 }))).toEqual({ decided: false });
  });

  it("define por penales: gana el local la tanda", () => {
    expect(
      resolveMatchOutcome(m({ homeScore: 1, awayScore: 1, homePenalties: 4, awayPenalties: 2 })),
    ).toEqual({ decided: true, winnerId: 1, loserId: 2, viaPenalties: true });
  });

  it("define por penales: gana el visitante la tanda (NED 2-2 ARG, 3-4)", () => {
    expect(
      resolveMatchOutcome(m({ homeScore: 2, awayScore: 2, homePenalties: 3, awayPenalties: 4 })),
    ).toEqual({ decided: true, winnerId: 2, loserId: 1, viaPenalties: true });
  });

  it("tanda empatada (dato incompleto) no define", () => {
    expect(resolveMatchOutcome(m({ homeScore: 0, awayScore: 0, homePenalties: 3, awayPenalties: 3 }))).toEqual({
      decided: false,
    });
  });

  it("sin marcador no define", () => {
    expect(resolveMatchOutcome(m({}))).toEqual({ decided: false });
  });
});
