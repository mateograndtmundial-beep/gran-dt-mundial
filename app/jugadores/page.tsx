import { PageTitle, EmptyState } from "@/components/ui";
import { PlayersExplorer } from "@/components/players-explorer";
import { getPlayersWithCountry, type PlayerRow } from "@/lib/queries";

// ISR: contenido no dependiente del usuario. Se revalida cada 60s y on-demand
// (updatePlayerPrice hace revalidatePath("/jugadores")).
export const revalidate = 60;

export default async function JugadoresPage() {
  let players: PlayerRow[] = [];
  let error = false;
  try {
    players = await getPlayersWithCountry();
  } catch {
    error = true;
  }

  return (
    <div>
      <PageTitle title="Jugadores" subtitle="Explorá la base del Mundial y planificá tu equipo." />
      {error ? (
        <EmptyState
          title="No se pudo cargar la base de jugadores."
          hint="¿Configuraste DATABASE_URL y corriste el seed (npm run seed)?"
        />
      ) : players.length === 0 ? (
        <EmptyState title="Todavía no hay jugadores cargados." hint="Corré: npm run seed" />
      ) : (
        <PlayersExplorer players={players} />
      )}
    </div>
  );
}
