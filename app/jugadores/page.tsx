import type { Metadata } from "next";
import { PageTitle, EmptyState } from "@/components/ui";
import { PlayersExplorer } from "@/components/players-explorer";
import { getPlayersWithCountry, getCountryFixtures, getPlayerTournamentStats, getPlayerOwnership, isTournamentFinished, type PlayerRow, type FixtureInfo, type PlayerStats } from "@/lib/queries";

// ISR: contenido no dependiente del usuario. Se revalida cada 60s y on-demand
// (updatePlayerPrice hace revalidatePath("/jugadores")).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Jugadores — Los 11 de Sampa",
  description:
    "Explorá los 1248 jugadores del Mundial 2026: precios, posiciones, partidos y estadísticas de cada uno.",
  openGraph: {
    title: "Jugadores del Mundial 2026 — Los 11 de Sampa",
    description: "Explorá precios, posiciones y estadísticas de cada jugador del Mundial 2026.",
  },
};

export default async function JugadoresPage() {
  let players: PlayerRow[] = [];
  let fixtures: Record<number, FixtureInfo[]> = {};
  let stats: Record<number, PlayerStats> = {};
  let ownership: Record<number, number> = {};
  let finished = false;
  let error = false;
  try {
    const [p, f, s, fin] = await Promise.all([
      getPlayersWithCountry(),
      getCountryFixtures(),
      getPlayerTournamentStats(),
      isTournamentFinished(),
    ]);
    players = p;
    fixtures = f;
    stats = s;
    finished = fin;
    // Ownership global (% de equipos del juego que tiene a cada jugador). Vacío
    // si hay pocos equipos (anti-ruido).
    ownership = await getPlayerOwnership();
  } catch {
    error = true;
  }

  return (
    <div>
      <PageTitle
        title="Jugadores"
        subtitle={
          finished
            ? "La base del Mundial 2026, con las estadísticas finales de cada jugador."
            : "Explorá la base del Mundial y planificá tu equipo."
        }
      />
      {error ? (
        <EmptyState
          title="No pudimos cargar la base de jugadores."
          hint="Probá recargar la página en un rato."
        />
      ) : players.length === 0 ? (
        <EmptyState title="Todavía no hay jugadores cargados." hint="Volvé a entrar más tarde." />
      ) : (
        <PlayersExplorer players={players} fixtures={fixtures} stats={stats} ownership={ownership} />
      )}
    </div>
  );
}
