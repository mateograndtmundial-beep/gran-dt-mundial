import Link from "next/link";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, SecondaryButton, PrimaryButton, PositionChip } from "@/components/editorial";
import { PointsBreakdown } from "@/components/domain/PointsBreakdown";
import { Pitch, type PitchPlayer } from "@/components/pitch";
import { LineupLockNotice } from "@/components/lineup-lock-notice";
import { ChangesStatusChip } from "@/components/changes-status-card";
import { getCurrentUser } from "@/lib/auth";
import { getMyTeam, getLineupPlayers, getUserGlobalRank, isRankingsVisible, getChangesStatus, type ChangesStatus } from "@/lib/queries";
import { POSITIONS, type Position } from "@/lib/game/config";
import { formatPoints, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MiEquipoPage() {
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

  // Lineup de la fecha vigente (la más reciente) para la cancha read-only
  const latestRound = team.rounds.length ? team.rounds[team.rounds.length - 1] : null;
  let lineup: Awaited<ReturnType<typeof getLineupPlayers>> = [];
  if (latestRound) {
    try {
      lineup = await getLineupPlayers(latestRound.id);
    } catch {
      lineup = [];
    }
  }
  const picks: Record<string, PitchPlayer> = {};
  for (const p of lineup) {
    if (!p.isStarter || !p.slot) continue;
    picks[p.slot] = {
      id: p.id,
      name: p.name,
      position: p.position as Position,
      flagUrl: p.flagUrl,
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
    firstRound && firstRound.order > 1 ? firstRound.roundName.split("—")[0]!.trim() : null;
  const subs = lineup
    .filter((p) => !p.isStarter && p.slot)
    .sort((a, b) => POSITIONS.indexOf(a.position as Position) - POSITIONS.indexOf(b.position as Position));

  return (
    <div className="space-y-5">
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

      {/* El equipo manda: cancha grande + suplentes; los puntos van al costado */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <Card className="p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-border pb-2">
            <Eyebrow>Tu equipo</Eyebrow>
            {latestRound && <span className="text-[11px] text-ink-3">{latestRound.formation}</span>}
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
                        {s.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.flagUrl} alt={s.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
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
          <p className="mb-3 text-xs text-ink-faint">
            Los puntos se publican al cierre de cada fecha, cuando terminan todos sus partidos.
          </p>
          <PointsBreakdown rounds={team.rounds} />
        </Card>
      </div>
    </div>
  );
}
