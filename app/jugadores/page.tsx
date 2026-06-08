import { PageTitle, EmptyState } from "@/components/ui";
import { PlayersExplorer } from "@/components/players-explorer";
import { getPlayersWithCountry, getCountryFixtures, type PlayerRow, type FixtureInfo } from "@/lib/queries";

// ISR: contenido no dependiente del usuario. Se revalida cada 60s y on-demand
// (updatePlayerPrice hace revalidatePath("/jugadores")).
export const revalidate = 60;

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
