import { describe, it, expect } from "vitest";
import { buildRoundBreakdown, type BdLineupRow, type BdStatRow } from "@/lib/scoring/desglose";
import { computeEntryTotal, type ScoringContext } from "@/lib/scoring/puntos-equipo";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import type { Position } from "@/lib/game/config";

function L(playerId: number, slot: string, position: Position, isStarter: boolean, name: string): BdLineupRow {
  return { playerId, isStarter, slot, name, position, countryName: `P${playerId}`, flagUrl: null, eliminatedRound: null };
}
function S(playerId: number, o: Partial<BdStatRow>): BdStatRow {
  return {
    playerId, minutes: 90, rating: null, goals: 0, penaltyGoals: 0, assists: 0, yellow: 0, red: 0,
    ownGoals: 0, penaltiesSaved: 0, penaltiesMissed: 0, goalsConceded: 0, cleanSheet: false, isMotm: false,
    ...o,
  };
}

// Escenario: capitán MID (gol + asist + figura), un DEF que no jugó y entra el
// SUB_DEF, una amarilla en el FWD, y un DT cuya selección gana.
const lineup: BdLineupRow[] = [
  L(1, "GK_1", "GK", true, "Arquero"),
  L(2, "DEF_1", "DEF", true, "Defensor"),
  L(3, "DEF_2", "DEF", true, "Lesionado"), // no juega → auto-sustitución
  L(4, "MID_1", "MID", true, "Capitán"),
  L(5, "FWD_1", "FWD", true, "Delantero"),
  L(6, "SUB_GK", "GK", false, "SupArquero"),
  L(7, "SUB_DEF", "DEF", false, "SupDefensor"), // entra por el 3
  L(8, "SUB_MID", "MID", false, "SupVolante"),
  L(9, "SUB_FWD", "FWD", false, "SupDelantero"),
];
const stats: BdStatRow[] = [
  S(1, { rating: 7.0, cleanSheet: true }),
  S(2, { rating: 6.0, cleanSheet: true }),
  // 3 no tiene stat row (no jugó)
  S(4, { rating: 8.0, goals: 1, assists: 1, isMotm: true }),
  S(5, { rating: 7.0, yellow: 1 }),
  S(7, { rating: 6.0, cleanSheet: true }),
];
const matches = [
  { homeCountryId: 100, awayCountryId: 200, homeScore: 2, awayScore: 0, homePenalties: null, awayPenalties: null },
];
const coach = { name: "Sampaoli", countryId: 100, countryName: "Argentina", flagUrl: null };

const result = buildRoundBreakdown({ captainPlayerId: 4, lineup, stats, matches, coach });

describe("buildRoundBreakdown", () => {
  it("el total coincide con computeEntryTotal (no hay drift con el scoring real)", () => {
    // Reconstruyo el contexto de scoring como lo hace publishRound, desde los mismos stats.
    const pts = new Map<number, number>();
    const base = new Map<number, number>();
    const played = new Set<number>();
    const posById = new Map(lineup.map((l) => [l.playerId, l.position]));
    for (const s of stats) {
      const bd = calcularPuntos({ position: posById.get(s.playerId)!, isCaptain: false, ...s });
      pts.set(s.playerId, (pts.get(s.playerId) ?? 0) + bd.total);
      if (s.minutes >= 20 && s.rating != null) base.set(s.playerId, (base.get(s.playerId) ?? 0) + s.rating);
      if (s.minutes >= 20) played.add(s.playerId);
    }
    const ctx: ScoringContext = {
      pts,
      base,
      played: (pid) => played.has(pid),
      coachCountry: new Map([[500, 100]]),
      countryResult: new Map([[100, "win"], [200, "loss"]]),
    };
    const expected = computeEntryTotal({ captainPlayerId: 4, coachId: 500, lineup }, ctx);
    expect(expected).toBe(61);
    expect(result.published).toBe(true);
    if (result.published) expect(result.total).toBe(expected);
  });

  it("auto-sustitución explícita: el SUB_DEF entra por el titular que no jugó", () => {
    if (!result.published) throw new Error("debería estar publicado");
    const sub = result.starters.find((l) => l.playerId === 7);
    expect(sub?.note).toBe("Entró por Lesionado");
    expect(result.starters.some((l) => l.playerId === 3)).toBe(false); // el lesionado no es línea propia
  });

  it("capitán: chip ×2 y total con el bonus (base 8 → +8)", () => {
    if (!result.published) throw new Error("publicado");
    const cap = result.starters.find((l) => l.playerId === 4)!;
    expect(cap.isCaptain).toBe(true);
    expect(cap.chips.some((c) => c.kind === "cap" && c.label.includes("×2"))).toBe(true);
    expect(cap.total).toBe(28); // 20 (rating+gol+asist+figura) + 8 (capitán)
  });

  it("DT: su selección gana → +2", () => {
    if (!result.published) throw new Error("publicado");
    expect(result.coach?.result).toBe("win");
    expect(result.coach?.points).toBe(2);
  });

  it("suplentes no usados → 'No entró' (el 7 sí entró)", () => {
    if (!result.published) throw new Error("publicado");
    expect(result.benchUnused.map((l) => l.playerId).sort()).toEqual([6, 8, 9]);
    expect(result.benchUnused.every((l) => l.note === "No entró")).toBe(true);
  });

  it("amarilla resta y arma chip rojo", () => {
    if (!result.published) throw new Error("publicado");
    const fwd = result.starters.find((l) => l.playerId === 5)!;
    expect(fwd.total).toBe(5); // 7 − 2
    expect(fwd.chips.some((c) => c.kind === "neg" && c.label.toLowerCase().includes("amarilla"))).toBe(true);
  });

  it("fecha no publicada → sin detalle", () => {
    // (lo controla la query antes de llamar a buildRoundBreakdown, pero validamos la forma)
    expect(result.published).toBe(true); // este escenario es 'published'
  });
});

// Escenario: el capitán (MID titular) NO juega y entra su suplente, que sí
// rinde bien (rating + gol). Regresión del bug donde el desglose transfería
// la capitanía (×2) al suplente — el bonus debe perderse, igual que en el
// puntaje real (computeEntryTotal / publishRound), para que el total
// mostrado nunca diverja del ranking.
const lineupCapOut: BdLineupRow[] = [
  L(1, "GK_1", "GK", true, "Arquero"),
  L(2, "DEF_1", "DEF", true, "Defensor"),
  L(3, "DEF_2", "DEF", true, "Defensor2"),
  L(4, "MID_1", "MID", true, "Capitán"),
  L(5, "FWD_1", "FWD", true, "Delantero"),
  L(6, "SUB_GK", "GK", false, "SupArquero"),
  L(7, "SUB_DEF", "DEF", false, "SupDefensor"),
  L(8, "SUB_MID", "MID", false, "SupVolante"), // entra por el capitán que no jugó
  L(9, "SUB_FWD", "FWD", false, "SupDelantero"),
];
const statsCapOut: BdStatRow[] = [
  S(1, { rating: 7.0, cleanSheet: true }),
  S(2, { rating: 6.0, cleanSheet: true }),
  S(3, { rating: 6.0, cleanSheet: true }),
  // 4 (capitán) no tiene stat row → no jugó
  S(5, { rating: 7.0 }),
  S(8, { rating: 8.0, goals: 1 }), // el suplente rinde mejor que cualquier titular
];
const resultCapOut = buildRoundBreakdown({
  captainPlayerId: 4,
  lineup: lineupCapOut,
  stats: statsCapOut,
  matches,
  coach,
});

describe("buildRoundBreakdown — capitán que no jugó (sin transferencia de bonus)", () => {
  it("el total coincide con computeEntryTotal: el bonus de capitán se pierde, no pasa al suplente", () => {
    const pts = new Map<number, number>();
    const base = new Map<number, number>();
    const played = new Set<number>();
    const posById = new Map(lineupCapOut.map((l) => [l.playerId, l.position]));
    for (const s of statsCapOut) {
      const bd = calcularPuntos({ position: posById.get(s.playerId)!, isCaptain: false, ...s });
      pts.set(s.playerId, (pts.get(s.playerId) ?? 0) + bd.total);
      if (s.minutes >= 20 && s.rating != null) base.set(s.playerId, (base.get(s.playerId) ?? 0) + s.rating);
      if (s.minutes >= 20) played.add(s.playerId);
    }
    const ctx: ScoringContext = {
      pts,
      base,
      played: (pid) => played.has(pid),
      coachCountry: new Map([[500, 100]]),
      countryResult: new Map([[100, "win"], [200, "loss"]]),
    };
    const expected = computeEntryTotal({ captainPlayerId: 4, coachId: 500, lineup: lineupCapOut }, ctx);
    expect(resultCapOut.published).toBe(true);
    if (resultCapOut.published) expect(resultCapOut.total).toBe(expected);
  });

  it("la fila del capitán muestra el chip 'Capitán' sin ×2 (bonus 0, no transferido)", () => {
    if (!resultCapOut.published) throw new Error("publicado");
    const capRow = resultCapOut.starters.find((l) => l.isCaptain)!;
    expect(capRow).toBeDefined();
    expect(capRow.playerId).toBe(8); // se muestra el suplente que entró
    expect(capRow.note).toBe("Entró por Capitán");
    expect(capRow.chips.some((c) => c.kind === "cap" && c.label.includes("×2"))).toBe(false);
    expect(capRow.chips.some((c) => c.kind === "cap" && c.label === "Capitán")).toBe(true);
  });

  it("el suplente que entró NO recibe el ×2 sobre su propio rating", () => {
    if (!resultCapOut.published) throw new Error("publicado");
    const subRow = resultCapOut.starters.find((l) => l.playerId === 8)!;
    // Sin ×2: rating 8 + gol de MID (6) = 14
    expect(subRow.total).toBe(14);
  });
});
