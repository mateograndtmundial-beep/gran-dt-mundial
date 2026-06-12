import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle, EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { LeagueManagement } from "@/components/league-management";
import { LeagueShare } from "@/components/league-share";
import { LeagueJoinCTA } from "@/components/league-join-cta";
import { LeagueLeaveButton } from "@/components/league-leave-button";
import { getLeagueRanking, getLeagueMembersForManagement, isLeagueMember, getAllRounds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { roundWithArticle } from "@/lib/game/round-format";

export const dynamic = "force-dynamic";

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { code } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let data: Awaited<ReturnType<typeof getLeagueRanking>> = null;
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let error = false;
  try {
    [user, data] = await Promise.all([getCurrentUser(), getLeagueRanking(code, page)]);
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

  const isMember = user ? await isLeagueMember(data.league.id, user.id) : false;

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
          <Eyebrow>CÓDIGO DE LIGA</Eyebrow>
          <p className="font-display text-3xl text-ink-3 tracking-widest select-all">
            {data.league.code}
          </p>
          <LeagueShare code={data.league.code} leagueName={data.league.name} />
        </div>
      </div>

      <LeagueJoinCTA
        code={data.league.code}
        leagueName={data.league.name}
        isMember={isMember}
        isAuthed={!!user}
        isOnboarded={!!user?.username}
      />

      <LeagueRanking
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
            href={`/ligas/${data.league.code}${data.page > 2 ? `?page=${data.page - 1}` : ""}`}
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
            href={`/ligas/${data.league.code}?page=${data.page + 1}`}
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

      {user && isMember && user.id !== data.league.ownerId && (
        <LeagueLeaveButton leagueId={data.league.id} leagueName={data.league.name} />
      )}
    </div>
  );
}
