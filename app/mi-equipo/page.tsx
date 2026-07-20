import Link from "next/link";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, SecondaryButton, PrimaryButton, PositionChip } from "@/components/editorial";
import { PointsBreakdown } from "@/components/domain/PointsBreakdown";
import { Pitch, type PitchPlayer } from "@/components/pitch";
import { ChangesStatusChip } from "@/components/changes-status-card";
import { SaveConfirmBanner } from "@/components/save-confirm-banner";
import { DeadlineNotice } from "@/components/deadline-notice";
import { getCurrentUser } from "@/lib/auth";
import { getMyTeam, getLineupPlayers, getLineupCoach, getUserGlobalRank, isRankingsVisible, getChangesStatus, getEditableRound, getGoldenTicketCopas, isDoubleChangeNoticeActive, isTournamentFinished, type ChangesStatus } from "@/lib/queries";
import { DoubleChangeNotice } from "@/components/double-change-notice";
import { CopaMiEquipoBanner } from "@/components/copa/CopaMiEquipoBanner";
import { COPA_PAUSED } from "@/lib/copa/announcement";
import { POSITIONS, type Position } from "@/lib/game/config";
import { roundWithArticle } from "@/lib/game/round-format";
import { formatPoints, formatPrice } from "@/lib/utils";
import { flagUrl } from "@/lib/flags";

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
  // Se lee ACÁ ARRIBA a propósito: los bloques "sin sesión" y "sin equipo" hacen
  // return temprano y también necesitan saber si el torneo terminó (si no, ofrecen
  // "armar mi equipo", que ya no se puede).
  let finished = false;
  try {
    finished = await isTournamentFinished();
  } catch {
    // sin DB: asumimos torneo en juego (fallback seguro)
  }
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
          hint={
            finished
              ? "El Mundial terminó, pero podés entrar a ver cómo te fue."
              : "Podés armarlo primero y guardarlo al iniciar sesión."
          }
        />
        <div className="mt-4 text-center">
          {finished ? (
            <PrimaryButton href="/ranking">VER EL RANKING FINAL →</PrimaryButton>
          ) : (
            <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
          )}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <PageTitle title="Mi equipo" />
        <EmptyState
          title={finished ? "El Mundial terminó y no llegaste a armar equipo." : "Todavía no armaste tu equipo."}
          hint={
            finished
              ? "Te esperamos en la próxima. Mientras tanto podés ver cómo terminó el ranking."
              : undefined
          }
        />
        <div className="mt-4 text-center">
          {finished ? (
            <PrimaryButton href="/ranking">VER EL RANKING FINAL →</PrimaryButton>
          ) : (
            <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
          )}
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

  // Empujón a la Liga Premium: el usuario ya tiene equipo, así que si hay una copa abierta
  // (con cupo y en término) y no está inscripto, le ofrecemos sumarse. Reusamos la card de
  // promo en modo link → lleva a /copa, donde se cierra la inscripción. Esto cubre tanto el
  // momento post-guardado (viene de armar su equipo) como las visitas posteriores.
  let copaPromo: Awaited<ReturnType<typeof getGoldenTicketCopas>>[number] | undefined;
  try {
    const copas = await getGoldenTicketCopas(user.id);
    // Liga Premium en pausa → sin empujón de promo.
    copaPromo = COPA_PAUSED
      ? undefined
      : copas
          .filter((c) => !c.isEnrolled && c.status === "open" && (c.spotsLeft ?? 0) > 0 && !c.deadlinePassed)
          .sort((a, b) => (a.spotsLeft ?? 0) - (b.spotsLeft ?? 0))[0];
  } catch {
    copaPromo = undefined;
  }

  // "Puntos por fecha": mostramos las fechas que YA arrancaron, es decir las
  // ANTERIORES a la editable (la que se está armando, que aún no empezó). Las
  // publicadas van con sus puntos; las en juego / sin publicar van con la etiqueta
  // "Al cierre" (los puntos se liberan recién al publicar). Si no hay fecha
  // editable (torneo terminado) o falla la query, mostramos todas las del usuario.
  let editableOrder = Number.POSITIVE_INFINITY;
  try {
    const editable = await getEditableRound();
    if (editable) editableOrder = editable.round.order;
  } catch {
    // sin fecha editable / sin DB → no recortamos (mostramos las del usuario)
  }
  const breakdownRounds = team.rounds
    .filter((r) => r.order < editableOrder)
    .map((r) => ({ id: r.id, roundName: r.roundName, points: r.points, published: r.status === "published" }));

  // Lineup de la fecha vigente (la más reciente) para la cancha read-only
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
  const picks: Record<string, PitchPlayer> = {};
  for (const p of lineup) {
    if (!p.isStarter || !p.slot) continue;
    picks[p.slot] = {
      id: p.id,
      name: p.name,
      position: p.position as Position,
      code: p.code,
      countryName: p.countryName,
      price: p.price,
      eliminatedRound: p.eliminatedRound,
    };
  }
  const hasLineup = Object.keys(picks).length > 0;

  // Si la primera alineación del usuario es de una fecha posterior a la 1, llegó
  // con el torneo ya empezado: su equipo recién suma desde esa fecha.
  const firstRound = team.rounds.length ? team.rounds[0]! : null;
  const lateStartName =
    firstRound && firstRound.order > 1 ? roundWithArticle(firstRound.roundName) : null;
  const subs = lineup
    .filter((p) => !p.isStarter && p.slot)
    .sort((a, b) => POSITIONS.indexOf(a.position as Position) - POSITIONS.indexOf(b.position as Position));

  // Aviso de novedad "2 cambios gratis por fecha": solo en la fecha del estreno
  // (8vos); desde 4tos el beneficio sigue pero el aviso ya no. El usuario acá ya
  // tiene equipo (garantizado arriba), así que no re-chequeamos sesión/entry; el
  // cliente se encarga de mostrarlo una sola vez.
  let showDoubleChangeNotice = false;
  try {
    showDoubleChangeNotice = await isDoubleChangeNoticeActive();
  } catch {
    showDoubleChangeNotice = false;
  }

  return (
    <div className="space-y-5">
      {/* Confirmación tras guardar desde el armador (?saved=1) */}
      {justSaved && <SaveConfirmBanner changes={Number(sp.ch ?? 0)} pins={Number(sp.pins ?? 0)} />}

      {/* Novedad: 2 cambios gratis por fecha en playoffs (dismissible, 1 sola vez). */}
      {showDoubleChangeNotice && <DoubleChangeNotice />}

      {/* Empujón SUTIL a la Liga Premium si hay una copa abierta y todavía no está inscripto.
          Franja chica y cerrable para no estorbar al equipo. */}
      {copaPromo && (
        <CopaMiEquipoBanner prizeArs={copaPromo.prizeArs ?? 400000} startsAt={copaPromo.closesAt} />
      )}

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
          {finished && ranking && (
            <p className="text-xs text-ink-3">
              El Mundial terminó: quedaste <strong className="text-ink-2">#{ranking}</strong> entre
              todos los DT de Los 11 de Sampa. Gracias por jugar.
            </p>
          )}
        </div>
        <div className="flex items-stretch gap-2">
          <SecondaryButton href={finished ? "/ranking" : "/equipo"}>
            {finished ? "RANKING FINAL" : "EDITAR EQUIPO"}
          </SecondaryButton>
          {/* Chip compacto: cambios disponibles para la fecha vigente */}
          {changesStatus && <ChangesStatusChip status={changesStatus} />}
        </div>
      </section>

      {/* Leyenda del cierre de la fecha: roja si faltan <24 h, amarilla si no. */}
      {changesStatus &&
        (changesStatus.state === "limited" ||
          changesStatus.state === "unlimited" ||
          changesStatus.state === "premium") &&
        changesStatus.deadline && (
          <DeadlineNotice deadline={changesStatus.deadline} roundName={changesStatus.roundName} />
        )}

      {/* El equipo manda: cancha grande + suplentes; los puntos van al costado */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <Card className="p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-border pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Eyebrow>Tu equipo</Eyebrow>
              {user.username && (
                <>
                  <span className="h-3 w-px shrink-0 bg-border-strong" aria-hidden />
                  <span className="truncate text-[13px] leading-none font-semibold text-ink-2" title="Tu nombre de DT">
                    @{user.username}
                  </span>
                </>
              )}
            </div>
            {latestRound && <span className="shrink-0 text-[11px] text-ink-3">{latestRound.formation}</span>}
          </div>

          {hasLineup ? (
            <div className="flex flex-col items-center gap-6">
              <Pitch
                formation={latestRound?.formation ?? "4-4-2"}
                picks={picks}
                captainId={latestRound?.captainPlayerId ?? null}
                style={{ width: "min(100%, 400px)" }}
              />

              {subs.length > 0 && (
                <div className="w-full">
                  <Eyebrow className="mb-2">Suplentes</Eyebrow>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {subs.map((s) => (
                      <div
                        key={s.slot}
                        className="flex items-center gap-2 rounded-[6px] border border-border bg-surface px-2.5 py-2"
                      >
                        <PositionChip position={s.position as Position} />
                        {flagUrl(s.code) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagUrl(s.code)!} alt={s.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                        ) : (
                          <div className="h-4 w-6 shrink-0 rounded-sm bg-surface-2" />
                        )}
                        <span
                          className={`min-w-0 flex-1 truncate text-sm font-semibold ${s.eliminatedRound != null ? "text-ink-faint line-through" : "text-ink"}`}
                          title={s.name}
                        >
                          {s.name}
                        </span>
                        <span className="jersey-numeral shrink-0 text-xs text-gold-ink">{formatPrice(s.price)}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {coach && (
                <div className="w-full">
                  <Eyebrow className="mb-2">Técnico</Eyebrow>
                  <div className="flex items-center gap-2 rounded-[6px] border border-border bg-surface px-2.5 py-2">
                    <span className="shrink-0 rounded-[4px] bg-blue/10 px-1.5 py-0.5 text-[10px] font-display tracking-wide text-blue">
                      DT
                    </span>
                    {flagUrl(coach.code) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={flagUrl(coach.code)!} alt={coach.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <div className="h-4 w-6 shrink-0 rounded-sm bg-surface-2" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={coach.name}>
                      {coach.name}
                    </span>
                    <span className="shrink-0 text-xs text-ink-3">{coach.countryName}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="Todavía no armaste tu equipo." />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between border-b-2 border-border pb-3">
            <Eyebrow>Puntos por fecha</Eyebrow>
            <Link
              href="/como-funciona"
              className="text-xs font-semibold text-ink-3 transition-colors hover:text-blue"
            >
              ¿Cómo se calculan?
            </Link>
          </div>
          <p className="mb-3 text-xs text-ink-3">
            {finished
              ? "El Mundial terminó: estos son tus puntos definitivos, fecha por fecha."
              : "Los puntos se publican al cierre de cada fecha, cuando terminan todos sus partidos."}
          </p>
          <PointsBreakdown rounds={breakdownRounds} />
        </Card>
      </div>
    </div>
  );
}
