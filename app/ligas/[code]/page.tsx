import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle, EmptyState } from "@/components/ui";
import { Eyebrow, ValidationCallout } from "@/components/editorial";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { CopaPrizeHeader } from "@/components/copa/CopaPrizeHeader";
import { CopaPausedNotice } from "@/components/copa/CopaPausedNotice";
import { COPA_PAUSED } from "@/lib/copa/announcement";
import { LeagueManagement } from "@/components/league-management";
import { LeagueShare } from "@/components/league-share";
import { LeagueJoinCTA } from "@/components/league-join-cta";
import { LeagueLeaveButton } from "@/components/league-leave-button";
import { RoundFilterPills } from "@/components/domain/RoundFilterPills";
import {
  getLeagueRanking,
  getLeagueUserStanding,
  getLeagueMembersForManagement,
  isLeagueMember,
  getAllRounds,
  getPublishedRounds,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { roundWithArticle } from "@/lib/game/round-format";

export const dynamic = "force-dynamic";

/** Link de paginación que preserva la fecha seleccionada (`?fecha=`). */
function pageHref(code: string, page: number, fecha: number | null): string {
  const qs = new URLSearchParams();
  if (page > 1) qs.set("page", String(page));
  if (fecha != null) qs.set("fecha", String(fecha));
  const s = qs.toString();
  return s ? `/ligas/${code}?${s}` : `/ligas/${code}`;
}

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ page?: string; status?: string; fecha?: string }>;
}) {
  const { code } = await params;
  const { page: pageParam, status, fecha } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const wantedOrder = Number.isFinite(Number(fecha)) ? Number(fecha) : null;

  let data: Awaited<ReturnType<typeof getLeagueRanking>> = null;
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let publishedRounds: Awaited<ReturnType<typeof getPublishedRounds>> = [];
  let error = false;
  try {
    [user, data, publishedRounds] = await Promise.all([
      getCurrentUser(),
      getLeagueRanking(code, page, wantedOrder ?? undefined),
      getPublishedRounds(),
    ]);
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div>
        <PageTitle title="Liga" />
        <EmptyState title="No pudimos cargar la liga." hint="Probá recargar la página en un rato." />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageTitle title="Liga" />
        <EmptyState title="No existe una liga con ese código." />
      </div>
    );
  }

  // Fechas que la liga puntúa (publicadas y dentro de su ventana de scoring).
  const startOrder = data.startOrder;
  const selectedOrder = data.singleRoundOrder;
  const windowRounds = publishedRounds.filter((r) => r.order >= startOrder);
  const activeOrder =
    selectedOrder != null && windowRounds.some((r) => r.order === selectedOrder)
      ? selectedOrder
      : null;
  // Si pidieron una fecha fuera de la ventana de la liga (URL a mano), el ranking
  // de arriba se calculó para esa fecha aislada → re-calcular como acumulado.
  if (wantedOrder != null && activeOrder == null) {
    data = (await getLeagueRanking(code, page)) ?? data;
  }

  const isMember = user ? await isLeagueMember(data.league.id, user.id) : false;
  const isGolden = data.league.kind === "golden_ticket";

  // "Tu posición": el puesto del usuario logueado en la vista actual (acumulado o
  // por fecha), pineado arriba aunque esté en una página lejana del ranking.
  const myStanding =
    user && isMember
      ? await getLeagueUserStanding(data.league.id, user.id, data.startOrder, activeOrder)
      : null;

  // La Liga Premium es PRIVADA: el ranking solo lo ven los inscriptos (que pagaron) y los
  // admins. Cualquier otro cae a /copa, la interfaz pública de inscripción. Así el código
  // de la copa no sirve para espiar el ranking sin haber entrado.
  if (isGolden && !isMember && !user?.isAdmin) {
    redirect("/copa");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <PageTitle title={data.league.name} />
          <p className="mt-1 text-sm text-ink-3">
            {data.scoringStart
              ? `Puntúa desde ${roundWithArticle(data.scoringStart.name)}`
              : "Puntúa desde el inicio"}
          </p>
        </div>
        <div className="text-right shrink-0">
          {isGolden ? (
            // La copa premium NO se comparte por código (la inscripción es paga). El link
            // de invitación lleva directo a /copa: pago + aceptación de Bases y Condiciones.
            <>
              <Eyebrow>INVITÁ A LA COPA</Eyebrow>
              <LeagueShare
                code={data.league.code}
                leagueName={data.league.name}
                href="/copa"
                message={`Sumate a la "${data.league.name}" en Los 11 de Sampa y competí por el premio garantizado`}
              />
            </>
          ) : (
            <>
              <Eyebrow>CÓDIGO DE LIGA</Eyebrow>
              <p className="font-display text-3xl text-ink-3 tracking-widest select-all">
                {data.league.code}
              </p>
              <LeagueShare code={data.league.code} leagueName={data.league.name} />
            </>
          )}
        </div>
      </div>

      {/* Retorno del pago de la entrada (Mercado Pago redirige a /ligas/{code}?status=). */}
      {data.league.kind === "golden_ticket" && status === "success" && (
        <ValidationCallout type="success">
          ¡Pago recibido! Te sumamos a la Liga Premium en cuanto se confirme el pago (puede tardar unos
          segundos). Si no aparecés en el ranking, recargá en un rato.
        </ValidationCallout>
      )}
      {data.league.kind === "golden_ticket" && status === "failure" && (
        <ValidationCallout type="danger">El pago no se completó. Podés intentar la inscripción de nuevo.</ValidationCallout>
      )}
      {data.league.kind === "golden_ticket" && status === "pending" && (
        <ValidationCallout type="warning">Estamos confirmando tu pago. Esto puede demorar unos minutos.</ValidationCallout>
      )}

      {/* Liga Premium en pausa (revisión legal): aviso de cancelación + reembolso para los
          inscriptos, arriba de todo. */}
      {data.league.kind === "golden_ticket" && COPA_PAUSED && <CopaPausedNotice variant="enrolled" />}

      {data.league.kind === "golden_ticket" && (
        <CopaPrizeHeader
          prizeArs={data.league.prizeArs}
          entryFeeArs={data.league.entryFeeArs}
          capacity={data.league.capacity}
          enrolled={data.total}
        />
      )}

      {/* Las copas premium no se unen con código (inscripción paga por el webhook) → sin CTA de join. */}
      {data.league.kind !== "golden_ticket" && (
        <LeagueJoinCTA
          code={data.league.code}
          leagueName={data.league.name}
          isMember={isMember}
          isAuthed={!!user}
          isOnboarded={!!user?.username}
        />
      )}

      {windowRounds.length > 0 && (
        <RoundFilterPills
          rounds={windowRounds}
          active={activeOrder}
          basePath={`/ligas/${data.league.code}`}
        />
      )}

      {myStanding && (
        <div className="space-y-2">
          <Eyebrow>Tu posición</Eyebrow>
          <LeagueRanking
            startRank={myStanding.rank}
            rows={[
              {
                entryName: myStanding.entryName,
                username: myStanding.username,
                totalPoints: myStanding.points,
              },
            ]}
          />
        </div>
      )}

      <LeagueRanking
        currentUserId={user?.username ?? null}
        mineBadge
        startRank={(data.page - 1) * data.pageSize + 1}
        rows={data.rows.map((r, i) => ({
          entryId: (data.page - 1) * data.pageSize + i,
          entryName: r.entryName,
          username: r.username,
          totalPoints: r.totalPoints ?? 0,
        }))}
      />

      {data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-3">
          <Link
            href={pageHref(data.league.code, data.page - 1, activeOrder)}
            aria-disabled={data.page <= 1}
            className={`inline-flex items-center gap-1 rounded-[6px] border border-border px-3 py-2 text-xs font-semibold text-ink-2 transition-colors ${
              data.page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-2"
            }`}
          >
            <ChevronLeft size={14} aria-hidden /> Anterior
          </Link>
          <span className="text-xs text-ink-3">
            Página {data.page} de {Math.ceil(data.total / data.pageSize)} · {data.total} miembros
          </span>
          <Link
            href={pageHref(data.league.code, data.page + 1, activeOrder)}
            aria-disabled={data.page * data.pageSize >= data.total}
            className={`inline-flex items-center gap-1 rounded-[6px] border border-border px-3 py-2 text-xs font-semibold text-ink-2 transition-colors ${
              data.page * data.pageSize >= data.total ? "pointer-events-none opacity-40" : "hover:bg-surface-2"
            }`}
          >
            Siguiente <ChevronRight size={14} aria-hidden />
          </Link>
        </div>
      )}

      {user && user.id === data.league.ownerId && (
        <LeagueManagement
          leagueId={data.league.id}
          leagueName={data.league.name}
          ownerId={data.league.ownerId}
          members={await getLeagueMembersForManagement(data.league.id)}
          rounds={await getAllRounds()}
          scoringStartRoundId={data.league.scoringStartRoundId}
        />
      )}

      {/* La copa premium es paga: no hay auto-salida. Solo un admin saca gente (LeagueManagement). */}
      {user && isMember && !isGolden && user.id !== data.league.ownerId && (
        <LeagueLeaveButton leagueId={data.league.id} leagueName={data.league.name} />
      )}
    </div>
  );
}
