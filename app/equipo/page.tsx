import { EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { FieldBuilder } from "@/components/field-builder";
import { LineupLockNotice } from "@/components/lineup-lock-notice";
import { getPlayersWithCountry, getCoaches, getEditableLineup, getEditableRound, type PlayerRow, type CoachRow } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { BUDGET, MAX_PER_COUNTRY } from "@/lib/game/config";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  let players: PlayerRow[] = [];
  let coaches: CoachRow[] = [];
  let initial: Awaited<ReturnType<typeof getEditableLineup>> = null;
  let editable: Awaited<ReturnType<typeof getEditableRound>> = null;
  let isAuthed = false;
  let error = false;
  try {
    [players, coaches, editable] = await Promise.all([
      getPlayersWithCountry(),
      getCoaches(),
      getEditableRound(),
    ]);
    const user = await getCurrentUser();
    isAuthed = !!user;
    if (user) initial = await getEditableLineup(user.id);
  } catch {
    error = true;
  }

  // Label del deadline (kickoff del primer partido de la fecha editable).
  const deadlineLabel = editable?.deadline
    ? `CERRÁ TU EQUIPO · ${editable.deadline.toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      }).toUpperCase()}`
    : "EDITÁ LIBRE HASTA QUE ARRANQUE EL MUNDIAL";
  const locked = !error && players.length > 0 && !editable;

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
          title="No pudimos cargar la base de jugadores."
          hint="Probá recargar la página en un rato."
        />
      ) : locked ? (
        <EmptyState
          title="Equipo bloqueado: la fecha está en curso."
          hint="Vas a poder volver a editar cuando se publiquen los puntos de esta fecha."
        />
      ) : (
        <div className="space-y-3">
          {/* Aviso: cada fecha se cierra al arrancar su primer partido (cerrable, se recuerda en localStorage) */}
          <LineupLockNotice variant="compact" />
          <FieldBuilder
            players={players}
            coaches={coaches}
            budget={BUDGET}
            maxPerCountry={editable?.round.type === "group" ? MAX_PER_COUNTRY : null}
            initial={initial}
            initialTeamName={initial?.teamName ?? ""}
            deadlineLabel={deadlineLabel}
            isAuthed={isAuthed}
          />
        </div>
      )}
    </div>
  );
}
