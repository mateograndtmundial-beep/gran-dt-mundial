// Desglose por jugador de la fecha de un equipo (para /mi-equipo → "Puntos por
// fecha"). Cálculo PURO: reutiliza las mismas funciones que publishRound
// (calcularPuntos, computeEffectiveStarters, resolveMatchOutcome) para que el
// desglose mostrado nunca se desincronice del puntaje real. Sin acceso a DB.
import {
  calcularPuntos,
  calcularPuntosTecnico,
  type PointsBreakdown,
} from "@/lib/scoring/calcular-puntos";
import { computeEffectiveStarters } from "@/lib/scoring/puntos-equipo";
import { resolveMatchOutcome, type MatchScore } from "@/lib/scoring/resultado-partido";
import { SCORING, POSITIONS, type Position } from "@/lib/game/config";
import { formatPoints } from "@/lib/utils";

export type BreakdownChip = { label: string; kind: "base" | "cap" | "pos" | "neg" };

export type BreakdownLine = {
  playerId: number;
  name: string;
  position: Position;
  flagUrl: string | null;
  code: string | null;
  countryName: string;
  eliminated: boolean;
  isCaptain: boolean;
  total: number;
  chips: BreakdownChip[];
  note: string | null;
  /** Si el jugador APORTA puntos a la fecha (titular que jugó o suplente que
   *  entró). false = no jugó / no entró → fila atenuada, no aporta al total. */
  counts: boolean;
};

export type CoachLine = {
  name: string;
  countryName: string;
  flagUrl: string | null;
  code: string | null;
  result: "win" | "loss" | "draw" | null;
  points: number;
};

export type RoundBreakdown =
  | { published: false }
  | {
      published: true;
      /** Los 11 titulares ORIGINALES en orden de cancha. El que no jugó queda
       *  con `counts: false` y nota "No jugó" (lo reemplaza un suplente). */
      starters: BreakdownLine[];
      /** Los 4 suplentes ORIGINALES en orden. El que entró por un titular queda
       *  con `counts: true` (aporta) y nota "Entró por X"; el resto `counts: false`. */
      subs: BreakdownLine[];
      coach: CoachLine | null;
      total: number;
    };

export type BdLineupRow = {
  playerId: number;
  isStarter: boolean;
  slot: string | null;
  name: string;
  position: Position;
  countryName: string;
  flagUrl: string | null;
  code: string | null;
  eliminatedRound: number | null;
};

export type BdStatRow = {
  playerId: number;
  minutes: number;
  rating: number | null;
  goals: number;
  penaltyGoals: number;
  assists: number;
  yellow: number;
  red: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  goalsConceded: number;
  cleanSheet: boolean;
  isMotm: boolean;
};

export type BdCoach = {
  name: string;
  countryId: number;
  countryName: string;
  flagUrl: string | null;
  code: string | null;
} | null;

const round1 = (n: number) => Math.round(n * 10) / 10;
const rank = (p: Position) => POSITIONS.indexOf(p);

/** Arma los chips de bonos de un jugador a partir de su desglose ya sumado. */
function chipsFor(bd: PointsBreakdown, raw: BdStatRow | undefined): BreakdownChip[] {
  const chips: BreakdownChip[] = [];
  if (bd.base > 0) chips.push({ label: `Rating ${formatPoints(bd.base)}`, kind: "base" });
  if (bd.goals > 0) {
    const n = raw?.goals ?? 0;
    const pen = raw?.penaltyGoals ?? 0;
    const open = Math.max(0, n - pen);
    // Los goles de penal valen distinto (penaltyGoal, fijo) que los de jugada
    // (por puesto) → se muestran en chips separados para que se entienda el +X.
    if (pen > 0 && open > 0) {
      const penPts = pen * SCORING.penaltyGoal;
      const openPts = bd.goals - penPts;
      chips.push({ label: `${open > 1 ? `${open} goles` : "Gol"} +${formatPoints(openPts)}`, kind: "pos" });
      chips.push({ label: `${pen > 1 ? `${pen} goles de penal` : "Gol de penal"} +${formatPoints(penPts)}`, kind: "pos" });
    } else if (pen > 0) {
      chips.push({ label: `${pen > 1 ? `${pen} goles de penal` : "Gol de penal"} +${formatPoints(bd.goals)}`, kind: "pos" });
    } else {
      chips.push({ label: `${n > 1 ? `${n} goles` : "Gol"} +${formatPoints(bd.goals)}`, kind: "pos" });
    }
  }
  if (bd.assists > 0) {
    const n = raw?.assists ?? 0;
    chips.push({ label: `${n > 1 ? `${n} asist.` : "Asist."} +${formatPoints(bd.assists)}`, kind: "pos" });
  }
  if (bd.cleanSheet > 0) chips.push({ label: `Valla +${formatPoints(bd.cleanSheet)}`, kind: "pos" });
  if (bd.penaltySaved > 0) chips.push({ label: `Penal atajado +${formatPoints(bd.penaltySaved)}`, kind: "pos" });
  if (bd.motm > 0) chips.push({ label: `Figura +${formatPoints(bd.motm)}`, kind: "pos" });
  if (bd.goalsConceded < 0) chips.push({ label: `Recibidos ${formatPoints(bd.goalsConceded)}`, kind: "neg" });
  if (bd.cards < 0)
    chips.push({ label: raw && raw.red > 0 ? `Roja ${formatPoints(bd.cards)}` : `Amarilla ${formatPoints(bd.cards)}`, kind: "neg" });
  if (bd.ownGoals < 0) chips.push({ label: `En contra ${formatPoints(bd.ownGoals)}`, kind: "neg" });
  if (bd.penaltyMissed < 0) chips.push({ label: `Penal errado ${formatPoints(bd.penaltyMissed)}`, kind: "neg" });
  return chips;
}

const EMPTY_BD: PointsBreakdown = {
  base: 0, captainBonus: 0, goals: 0, assists: 0, cleanSheet: 0, penaltySaved: 0,
  goalsConceded: 0, motm: 0, cards: 0, ownGoals: 0, penaltyMissed: 0, total: 0,
};

export function buildRoundBreakdown(input: {
  captainPlayerId: number | null;
  lineup: BdLineupRow[];
  stats: BdStatRow[];
  matches: MatchScore[];
  coach: BdCoach;
}): RoundBreakdown {
  const { captainPlayerId, lineup, stats, matches, coach } = input;
  const byId = new Map(lineup.map((l) => [l.playerId, l]));

  const statsByPlayer = new Map<number, BdStatRow[]>();
  for (const s of stats) {
    const arr = statsByPlayer.get(s.playerId) ?? [];
    arr.push(s);
    statsByPlayer.set(s.playerId, arr);
  }

  const minutesBy = new Map<number, number>();
  const baseBy = new Map<number, number>(); // suma de ratings (>=20') → bonus capitán
  const bdBy = new Map<number, PointsBreakdown>();
  const rawBy = new Map<number, BdStatRow>();

  for (const l of lineup) {
    const rows = statsByPlayer.get(l.playerId) ?? [];
    let minutes = 0;
    let baseSum = 0;
    const sum: PointsBreakdown = { ...EMPTY_BD };
    const raw: BdStatRow = {
      playerId: l.playerId, minutes: 0, rating: null, goals: 0, penaltyGoals: 0, assists: 0,
      yellow: 0, red: 0, ownGoals: 0, penaltiesSaved: 0, penaltiesMissed: 0, goalsConceded: 0,
      cleanSheet: false, isMotm: false,
    };
    for (const r of rows) {
      minutes += r.minutes;
      if (r.minutes >= SCORING.minMinutes && r.rating != null) baseSum += Number(r.rating);
      const bd = calcularPuntos({ position: l.position, isCaptain: false, ...r });
      sum.base += bd.base; sum.goals += bd.goals; sum.assists += bd.assists; sum.cleanSheet += bd.cleanSheet;
      sum.penaltySaved += bd.penaltySaved; sum.goalsConceded += bd.goalsConceded; sum.motm += bd.motm;
      sum.cards += bd.cards; sum.ownGoals += bd.ownGoals; sum.penaltyMissed += bd.penaltyMissed; sum.total += bd.total;
      raw.goals += r.goals; raw.penaltyGoals += r.penaltyGoals; raw.assists += r.assists; raw.yellow += r.yellow;
      raw.red += r.red; raw.ownGoals += r.ownGoals; raw.penaltiesSaved += r.penaltiesSaved;
      raw.penaltiesMissed += r.penaltiesMissed; raw.goalsConceded += r.goalsConceded;
      raw.cleanSheet = raw.cleanSheet || r.cleanSheet; raw.isMotm = raw.isMotm || r.isMotm;
      if (r.rating != null) raw.rating = r.rating;
    }
    raw.minutes = minutes;
    minutesBy.set(l.playerId, minutes);
    baseBy.set(l.playerId, baseSum);
    bdBy.set(l.playerId, sum);
    rawBy.set(l.playerId, raw);
  }

  const played = (pid: number) => (minutesBy.get(pid) ?? 0) >= SCORING.minMinutes;
  const effectiveOf = computeEffectiveStarters(
    lineup.map((l) => ({ playerId: l.playerId, isStarter: l.isStarter, slot: l.slot })),
    played,
  );
  function line(pid: number, isCaptain: boolean, note: string | null, counts: boolean): BreakdownLine {
    const info = byId.get(pid)!;
    const bd = bdBy.get(pid) ?? EMPTY_BD;
    const chips = chipsFor(bd, rawBy.get(pid));
    let total = bd.total;
    if (isCaptain) {
      // El bonus de capitán se computa SIEMPRE sobre el rating del capitán
      // original (captainPlayerId): si el capitán no jugó (>= minMinutes), su
      // baseSum es 0 y el bonus se pierde — igual que computeEntryTotal, así
      // el total mostrado nunca diverge del puntaje real del ranking.
      const baseSum = baseBy.get(captainPlayerId!) ?? 0;
      if (baseSum > 0) {
        chips.push({ label: `Capitán ×2 +${formatPoints(baseSum)}`, kind: "cap" });
        total += baseSum;
      } else {
        chips.push({ label: "Capitán", kind: "cap" });
      }
    }
    return {
      playerId: pid, name: info.name, position: info.position, flagUrl: info.flagUrl,
      code: info.code, countryName: info.countryName, eliminated: info.eliminatedRound != null,
      isCaptain, total: round1(total), chips, note, counts,
    };
  }

  // Mapa inverso: qué suplente entró por qué titular (para las notas y para
  // marcar al suplente como aportante en su propia sección).
  const starterRows = lineup
    .filter((l) => l.isStarter)
    .sort((a, b) => rank(a.position) - rank(b.position) || (a.slot ?? "").localeCompare(b.slot ?? ""));
  const subReplaces = new Map<number, number>(); // subId -> starterId al que reemplazó
  for (const st of starterRows) {
    const eff = effectiveOf.get(st.playerId) ?? st.playerId;
    if (eff !== st.playerId) subReplaces.set(eff, st.playerId);
  }

  // Titulares (11) ORIGINALES en orden de cancha. El que jugó aporta; el que no
  // jugó queda atenuado (counts:false) con nota "No jugó" — lo reemplaza un suplente.
  const starters: BreakdownLine[] = starterRows.map((st) => {
    const isCap = captainPlayerId === st.playerId;
    const didPlay = played(st.playerId);
    return line(st.playerId, isCap, didPlay ? null : "No jugó", didPlay);
  });

  // Suplentes (4) ORIGINALES en orden. El que entró por un titular aporta
  // (counts:true) con nota "Entró por X"; el que no entró queda atenuado.
  const subs: BreakdownLine[] = lineup
    .filter((l) => !l.isStarter)
    .sort((a, b) => rank(a.position) - rank(b.position) || (a.slot ?? "").localeCompare(b.slot ?? ""))
    .map((l) => {
      const replaced = subReplaces.get(l.playerId);
      if (replaced != null) {
        return line(l.playerId, false, `Entró por ${byId.get(replaced)?.name ?? "un titular"}`, true);
      }
      return {
        playerId: l.playerId, name: l.name, position: l.position, flagUrl: l.flagUrl,
        code: l.code, countryName: l.countryName, eliminated: l.eliminatedRound != null,
        isCaptain: false, total: 0, chips: [], note: "No entró", counts: false,
      };
    });

  // Técnico: resultado de su selección en la fecha (incluye definición por penales).
  let coachLine: CoachLine | null = null;
  if (coach) {
    let result: "win" | "loss" | "draw" | null = null;
    for (const m of matches) {
      const o = resolveMatchOutcome(m);
      if (o.decided) {
        if (o.winnerId === coach.countryId) { result = "win"; break; }
        if (o.loserId === coach.countryId) { result = "loss"; break; }
      } else if (
        m.homeScore != null && m.awayScore != null && m.homeScore === m.awayScore &&
        (m.homeCountryId === coach.countryId || m.awayCountryId === coach.countryId)
      ) {
        result = "draw"; break;
      }
    }
    coachLine = {
      name: coach.name, countryName: coach.countryName, flagUrl: coach.flagUrl,
      code: coach.code, result, points: result ? calcularPuntosTecnico(result) : 0,
    };
  }

  // Total = filas que aportan (titulares que jugaron + suplentes que entraron) +
  // técnico. Equivale a computeEntryTotal/publishRound (mismo conjunto efectivo).
  const total = round1(
    [...starters, ...subs].reduce((s, l) => s + (l.counts ? l.total : 0), 0) + (coachLine?.points ?? 0),
  );
  return { published: true, starters, subs, coach: coachLine, total };
}
