import { PageTitle, EmptyState } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { LeagueRanking } from "@/components/domain/LeagueRanking";
import { getLeagueRanking } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let data: Awaited<ReturnType<typeof getLeagueRanking>> = null;
  let error = false;
  try {
    data = await getLeagueRanking(code);
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div>
        <PageTitle title="Liga" />
        <EmptyState title="No se pudo cargar la liga." hint="Revisá la base." />
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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageTitle title={data.league.name} />
        <div className="text-right shrink-0">
          <Eyebrow>CÓDIGO DE LIGA</Eyebrow>
          <p
            className="font-display text-3xl text-ink-3 tracking-widest cursor-pointer select-all"
            title="Copiá este código para invitar amigos"
          >
            {data.league.code}
          </p>
        </div>
      </div>

      <LeagueRanking
        rows={data.rows.map((r, i) => ({
          entryId: i,
          entryName: r.entryName,
          username: r.username,
          totalPoints: r.totalPoints ?? 0,
        }))}
      />
    </div>
  );
}
