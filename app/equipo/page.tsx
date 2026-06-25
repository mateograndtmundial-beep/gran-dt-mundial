import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { FieldBuilder } from "@/components/field-builder";
import { getPlayersWithCountry, getCoaches, getEditableLineup, getEditableRound, getEditContext, getPlayerTournamentStats, getPlayerOwnership, isEnrolledInGoldenTicket, type PlayerRow, type CoachRow, type PlayerStats } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getPinBalance } from "@/lib/pins";
import { BUDGET, MAX_PER_COUNTRY, MAX_PER_COUNTRY_KNOCKOUT, getFreeChangesForRound } from "@/lib/game/config";
import { shortRoundName } from "@/lib/game/round-format";

export const dynamic = "force-dynamic";

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; from?: string }>;
}) {
  // Deep-link desde /jugadores ("Agregar a mi equipo"): el armador coloca al
  // jugador en un slot libre de su posición. Number("") y NaN → null.
  const { add, from } = await searchParams;
  const addPlayerId = Number(add) > 0 ? Number(add) : null;
  // Llegó desde la campaña de la Liga Premium (/copa): mostramos un recordatorio de que
  // armar el equipo es el paso previo a sumarse por el premio. Al guardar, /mi-equipo
  // cierra el loop con el CTA de inscripción.
  const fromCopa = from === "copa";
  let players: PlayerRow[] = [];
  let coaches: CoachRow[] = [];
  let stats: Record<number, PlayerStats> = {};
  let ownership: Record<number, number> = {};
  let initial: Awaited<ReturnType<typeof getEditableLineup>> = null;
  let editable: Awaited<ReturnType<typeof getEditableRound>> = null;
  let editContext: Awaited<ReturnType<typeof getEditContext>> | null = null;
  let pinBalance = 0;
  let isPremium = false;
  let inCopa = false;
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
        [editContext, pinBalance, inCopa] = await Promise.all([
          getEditContext(user.id, editable.round.id, editable.round.order),
          getPinBalance(user.id),
          isEnrolledInGoldenTicket(user.id),
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
          priorChanges: editContext.priorChanges,
          alreadySpent: editContext.alreadySpentThisRound,
          pinBalance,
          isPremium,
          freeChanges: getFreeChangesForRound(editable.round.order, inCopa),
          roundName: shortRoundName(editable.round.name),
          roundStarted: editable.round.order > 1,
        }
      : null;

  // Label del deadline: QUÉ fecha estás editando + cuándo empieza (kickoff del
  // primer partido de esa fecha). La ventana de cambios va desde que arranca una
  // fecha hasta el primer partido de la siguiente.
  const deadlineLabel = editable?.deadline
    ? `${shortRoundName(editable.round.name).toUpperCase()} · EMPIEZA EL ${editable.deadline
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
    : editable
      ? // Fecha editable sin fixtures todavía (playoffs antes del cuadro): la ventana
        // está abierta pero el cierre se define al cargarse los partidos.
        `${shortRoundName(editable.round.name).toUpperCase()} · CIERRE A DEFINIR`
      : "EDITÁ LIBRE HASTA QUE ARRANQUE EL MUNDIAL";
  const locked = !error && players.length > 0 && !editable;

  return (
    <div>
      {/* Recordatorio de la Liga Premium cuando se llega desde la campaña (/copa). */}
      {fromCopa && (
        <div className="mb-3 flex items-center gap-2 rounded-[10px] border-2 border-gold-border bg-gold-bg px-4 py-2.5 card-shadow">
          <Trophy size={18} className="shrink-0 text-gold" aria-hidden />
          <p className="text-sm font-semibold text-gold-ink">
            Estás a un paso de la Liga Premium. Armá tu equipo y, al guardar, te sumás por el premio.
          </p>
        </div>
      )}

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
          <FieldBuilder
            players={players}
            coaches={coaches}
            stats={stats}
            ownership={ownership}
            budget={BUDGET}
            maxPerCountry={
              editable == null
                ? null
                : editable.round.type === "group"
                  ? MAX_PER_COUNTRY
                  : MAX_PER_COUNTRY_KNOCKOUT
            }
            initial={initial}
            initialTeamName={initial?.teamName ?? ""}
            deadlineLabel={deadlineLabel}
            deadline={editable?.deadline?.toISOString() ?? null}
            isAuthed={isAuthed}
            changeContext={changeContext}
            addPlayerId={addPlayerId}
            fromCopa={fromCopa}
          />
        </div>
      )}
    </div>
  );
}
