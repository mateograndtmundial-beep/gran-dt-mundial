import { EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { FieldBuilder } from "@/components/field-builder";
import { LineupLockNotice } from "@/components/lineup-lock-notice";
import { getPlayersWithCountry, getCoaches, getEditableLineup, getEditableRound, getEditContext, getPlayerTournamentStats, getPlayerOwnership, type PlayerRow, type CoachRow, type PlayerStats } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getPinBalance } from "@/lib/pins";
import { BUDGET, MAX_PER_COUNTRY, FREE_CHANGES_PER_ROUND } from "@/lib/game/config";
import { shortRoundName } from "@/lib/game/round-format";

export const dynamic = "force-dynamic";

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  // Deep-link desde /jugadores ("Agregar a mi equipo"): el armador coloca al
  // jugador en un slot libre de su posición. Number("") y NaN → null.
  const { add } = await searchParams;
  const addPlayerId = Number(add) > 0 ? Number(add) : null;
  let players: PlayerRow[] = [];
  let coaches: CoachRow[] = [];
  let stats: Record<number, PlayerStats> = {};
  let ownership: Record<number, number> = {};
  let initial: Awaited<ReturnType<typeof getEditableLineup>> = null;
  let editable: Awaited<ReturnType<typeof getEditableRound>> = null;
  let editContext: Awaited<ReturnType<typeof getEditContext>> | null = null;
  let pinBalance = 0;
  let isPremium = false;
  let isAuthed = false;
  let error = false;
  try {
    [players, coaches, editable, stats] = await Promise.all([
      getPlayersWithCountry(),
      getCoaches(),
      getEditableRound(),
      getPlayerTournamentStats(),
    ]);
    // Ownership de la fecha editable (% de equipos que tiene a cada jugador), para
    // el orden "Más elegidos" del picker. Vacío si no hay fecha editable.
    ownership = editable ? await getPlayerOwnership(editable.round.id) : {};
    const user = await getCurrentUser();
    isAuthed = !!user;
    if (user) {
      isPremium = user.isPremium;
      initial = await getEditableLineup(user.id);
      // Contexto de cambios solo si hay fecha editable (si no, no hay nada que contar/cobrar).
      if (editable) {
        [editContext, pinBalance] = await Promise.all([
          getEditContext(user.id, editable.round.id, editable.round.order),
          getPinBalance(user.id),
        ]);
      }
    }
  } catch {
    error = true;
  }

  // Contexto para el contador de cambios + cartel de confirmación del armador.
  // null = edición libre (sin fecha previa: primer equipo o fecha 1) → sin límite.
  const changeContext =
    editable && editContext
      ? {
          baselinePlayerIds: editContext.baselinePlayerIds,
          alreadySpent: editContext.alreadySpentThisRound,
          pinBalance,
          isPremium,
          freeChanges: FREE_CHANGES_PER_ROUND,
          roundName: shortRoundName(editable.round.name),
          roundStarted: editable.round.order > 1,
        }
      : null;

  // Label del deadline: QUÉ fecha estás editando + cuándo cierra (kickoff del
  // primer partido de esa fecha). La ventana de cambios va desde que arranca una
  // fecha hasta el primer partido de la siguiente.
  const deadlineLabel = editable?.deadline
    ? `${shortRoundName(editable.round.name).toUpperCase()} · CERRÁ TU EQUIPO ANTES DEL ${editable.deadline
        .toLocaleString("es-AR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Argentina/Buenos_Aires",
        })
        .toUpperCase()}`
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
            stats={stats}
            ownership={ownership}
            budget={BUDGET}
            maxPerCountry={editable?.round.type === "group" ? MAX_PER_COUNTRY : null}
            initial={initial}
            initialTeamName={initial?.teamName ?? ""}
            deadlineLabel={deadlineLabel}
            isAuthed={isAuthed}
            changeContext={changeContext}
            addPlayerId={addPlayerId}
          />
        </div>
      )}
    </div>
  );
}
