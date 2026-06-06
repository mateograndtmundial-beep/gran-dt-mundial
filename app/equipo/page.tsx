import { PageTitle, EmptyState } from "@/components/ui";
import { FieldBuilder } from "@/components/field-builder";
import { getPlayersWithCountry, getCoaches, type PlayerRow, type CoachRow } from "@/lib/queries";
import { BUDGET } from "@/lib/game/config";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  let players: PlayerRow[] = [];
  let coaches: CoachRow[] = [];
  let error = false;
  try {
    [players, coaches] = await Promise.all([getPlayersWithCountry(), getCoaches()]);
  } catch {
    error = true;
  }

  return (
    <div>
      <PageTitle
        title="Armar equipo"
        subtitle="Elegí formación, 11 titulares (+ banca), capitán y técnico, dentro del presupuesto."
      />
      {error || players.length === 0 ? (
        <EmptyState
          title="Todavía no hay jugadores cargados."
          hint="Configurá DATABASE_URL y corré: npm run seed"
        />
      ) : (
        <FieldBuilder players={players} coaches={coaches} budget={BUDGET} />
      )}
    </div>
  );
}
