// Resolución pura del ganador de un partido, contemplando la definición por penales
// en eliminatorias. Sin acceso a DB para que sea testeable (ver resultado-partido.test.ts).
// publishRound lo usa para marcar eliminados y para el resultado del técnico.

export type MatchScore = {
  homeCountryId: number | null;
  awayCountryId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
};

export type MatchOutcome =
  | { decided: true; winnerId: number; loserId: number; viaPenalties: boolean }
  | { decided: false };

/**
 * Determina ganador/perdedor de un partido.
 * - Goles distintos → gana el de más goles (90' + alargue; la API ya los incluye).
 * - Goles iguales con tanda de penales distinta → gana el de más penales.
 * - Goles iguales sin tanda (empate de grupos) o datos faltantes → `decided: false`.
 */
export function resolveMatchOutcome(m: MatchScore): MatchOutcome {
  if (m.homeScore == null || m.awayScore == null || m.homeCountryId == null || m.awayCountryId == null) {
    return { decided: false };
  }
  if (m.homeScore > m.awayScore) {
    return { decided: true, winnerId: m.homeCountryId, loserId: m.awayCountryId, viaPenalties: false };
  }
  if (m.awayScore > m.homeScore) {
    return { decided: true, winnerId: m.awayCountryId, loserId: m.homeCountryId, viaPenalties: false };
  }
  // Empate en el marcador: ¿se definió por penales?
  if (m.homePenalties != null && m.awayPenalties != null && m.homePenalties !== m.awayPenalties) {
    const homeWon = m.homePenalties > m.awayPenalties;
    return {
      decided: true,
      winnerId: homeWon ? m.homeCountryId : m.awayCountryId,
      loserId: homeWon ? m.awayCountryId : m.homeCountryId,
      viaPenalties: true,
    };
  }
  return { decided: false }; // empate real (grupos) o sin datos de tanda
}
