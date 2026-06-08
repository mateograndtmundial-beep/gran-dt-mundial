import type { Metadata } from "next";
import { PageTitle, EmptyState } from "@/components/ui";
import { PlayersExplorer } from "@/components/players-explorer";
import { getPlayersWithCountry, getCountryFixtures, type PlayerRow, type FixtureInfo } from "@/lib/queries";

// ISR: contenido no dependiente del usuario. Se revalida cada 60s y on-demand
// (updatePlayerPrice hace revalidatePath("/jugadores")).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Jugadores — Los 11 de Sampa",
  description:
    "Explorá los 1248 jugadores del Mundial 2026: precios, posiciones, próximos rivales y dificultad de cada partido.",
  openGraph: {
    title: "Jugadores del Mundial 2026 — Los 11 de Sampa",
    description: "Explorá precios, posiciones y próximos partidos de cada jugador del Mundial 2026.",
  },
};

export default async function JugadoresPage() {
  let players: PlayerRow[] = [];
  let fixtures: Record<number, FixtureInfo[]> = {};
  let error = false;
  try {
    [players, fixtures] = await Promise.all([getPlayersWithCountry(), getCountryFixtures()]);
  } catch {
    error = true;
  }

  return (
    <div>
      <PageTitle title="Jugadores" subtitle="Explorá la base del Mundial y planificá tu equipo." />
      {error ? (
        <EmptyState
          title="No pudimos cargar la base de jugadores."
          hint="Probá recargar la página en un rato."
        />
      ) : players.length === 0 ? (
        <EmptyState title="Todavía no hay jugadores cargados." hint="Volvé a entrar más tarde." />
      ) : (
        <PlayersExplorer players={players} fixtures={fixtures} />
      )}
    </div>
  );
}
