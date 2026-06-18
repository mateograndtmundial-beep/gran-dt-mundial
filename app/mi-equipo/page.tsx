import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, SecondaryButton, PrimaryButton } from "@/components/editorial";
import { MyTeamBoard } from "@/components/domain/MyTeamBoard";
import { LineupLockNotice } from "@/components/lineup-lock-notice";
import { ChangesStatusChip } from "@/components/changes-status-card";
import { SaveConfirmBanner } from "@/components/save-confirm-banner";
import { DeadlineNotice } from "@/components/deadline-notice";
import { getCurrentUser } from "@/lib/auth";
import { getMyTeam, getLineupPlayers, getLineupCoach, getUserGlobalRank, isRankingsVisible, getChangesStatus, type ChangesStatus } from "@/lib/queries";
import { roundWithArticle } from "@/lib/game/round-format";
import { formatPoints } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MiEquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; ch?: string; pins?: string }>;
}) {
  const sp = await searchParams;
  const justSaved = sp.saved === "1";
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let team: Awaited<ReturnType<typeof getMyTeam>> = null;
  let error = false;
  try {
    user = await getCurrentUser();
    if (user) team = await getMyTeam(user.id);
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div>
        <PageTitle title="Mi equipo" />
        <EmptyState title="No pudimos cargar tu equipo." hint="Probá recargar la página en un rato." />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <PageTitle title="Mi equipo" />
        <EmptyState
          title="Ingresá para ver tu equipo"
          hint="Podés armarlo primero y guardarlo al iniciar sesión."
        />
        <div className="mt-4 text-center">
          <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <PageTitle title="Mi equipo" />
        <EmptyState title="Todavía no armaste tu equipo." />
        <div className="mt-4 text-center">
          <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
        </div>
      </div>
    );
  }

  let ranking: number | null = null;
  let rankingsVisible = false;
  try {
    rankingsVisible = await isRankingsVisible();
    if (rankingsVisible) ranking = await getUserGlobalRank(team.entry.id);
  } catch {
    ranking = null;
  }

  let changesStatus: ChangesStatus | null = null;
  try {
    changesStatus = await getChangesStatus(user.id, user.isPremium);
  } catch {
    changesStatus = null;
  }

  // Solo las fechas ya PUBLICADAS tienen puntos/datos cargados. Hasta que no se
  // publique la fecha N (terminan sus partidos), no mostramos esa fecha en
  // "Puntos por fecha" (evita listar fechas en juego / futuras con 0 pts).
  const playedRounds = team.rounds.filter((r) => r.status === "published");

  // Lineup de la fecha vigente (la más reciente) para el primer paint de la
  // cancha; el navegador de fechas (MyTeamBoard) carga las demás bajo demanda.
  const latestRound = team.rounds.length ? team.rounds[team.rounds.length - 1] : null;
  let lineup: Awaited<ReturnType<typeof getLineupPlayers>> = [];
  let coach: Awaited<ReturnType<typeof getLineupCoach>> = null;
  if (latestRound) {
    try {
      [lineup, coach] = await Promise.all([
        getLineupPlayers(latestRound.id),
        getLineupCoach(latestRound.id),
      ]);
    } catch {
      lineup = [];
      coach = null;
    }
  }
  const hasLineup = lineup.some((p) => p.isStarter && p.slot);

  // Fechas para el navegador de la cancha (todas las que el usuario tiene snapshot).
  const roundsForBoard = team.rounds.map((r) => ({
    entryRoundId: r.id,
    roundName: r.roundName,
    order: r.order,
    status: r.status,
    points: r.points,
    formation: r.formation,
    captainPlayerId: r.captainPlayerId,
  }));

  // Si la primera alineación del usuario es de una fecha posterior a la 1, llegó
  // con el torneo ya empezado: su equipo recién suma desde esa fecha.
  const firstRound = team.rounds.length ? team.rounds[0]! : null;
  const lateStartName =
    firstRound && firstRound.order > 1 ? roundWithArticle(firstRound.roundName) : null;

  return (
    <div className="space-y-5">
      {/* Confirmación tras guardar desde el armador (?saved=1) */}
      {justSaved && <SaveConfirmBanner changes={Number(sp.ch ?? 0)} pins={Number(sp.pins ?? 0)} />}

      {/* Aviso: cada fecha se cierra al arrancar su primer partido (cerrable, se recuerda en localStorage) */}
      <LineupLockNotice />

      {/* Header compacto: el equipo es el protagonista, el puntaje va al costado */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow>MI EQUIPO</Eyebrow>
          <h1 className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-none text-ink">
            {team.entry.name}
          </h1>
          <p className="text-sm text-ink-3">
            <span className="jersey-numeral text-base text-ink">{formatPoints(team.entry.totalPoints)}</span> pts
            {rankingsVisible && ranking ? (
              <> · <span className="font-semibold text-ink-2">#{ranking}</span> en el ranking global</>
            ) : null}
          </p>
          {!rankingsVisible && (
            <p className="text-xs text-ink-3">
              El ranking global se habilita cuando se publique la Fecha 1 del Mundial.
            </p>
          )}
          {lateStartName && (
            <p className="text-xs text-ink-3">
              Armaste tu equipo con el torneo ya empezado: tu primera fecha puntuable es{" "}
              <strong className="text-ink-2">{lateStartName}</strong>.
            </p>
          )}
        </div>
        <div className="flex items-stretch gap-2">
          <SecondaryButton href="/equipo">EDITAR EQUIPO</SecondaryButton>
          {/* Chip compacto: cambios disponibles para la fecha vigente */}
          {changesStatus && <ChangesStatusChip status={changesStatus} />}
        </div>
      </section>

      {/* Leyenda del cierre de la fecha: roja si faltan <24 h, amarilla si no. */}
      {changesStatus &&
        (changesStatus.state === "limited" ||
          changesStatus.state === "unlimited" ||
          changesStatus.state === "premium") && (
          <DeadlineNotice deadline={changesStatus.deadline} roundName={changesStatus.roundName} />
        )}

      {/* El equipo manda: cancha grande + navegador de fechas; los puntos al costado */}
      {hasLineup ? (
        <MyTeamBoard rounds={roundsForBoard} initial={{ players: lineup, coach }} playedRounds={playedRounds} />
      ) : (
        <Card className="p-4 lg:p-6">
          <EmptyState title="Todavía no armaste tu equipo." />
        </Card>
      )}
    </div>
  );
}
