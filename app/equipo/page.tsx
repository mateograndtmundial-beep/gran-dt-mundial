import { EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
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
      {/* Header compacto — no se come el alto de la cancha */}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl leading-none tracking-tight text-ink">
          ARMÁ TU EQUIPO
        </h1>
        <Eyebrow className="hidden sm:block">11 TITULARES · CAPITÁN · DT</Eyebrow>
      </div>
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
