import { PageTitle, EmptyState, Card } from "@/components/ui";
import { getLeagueRanking } from "@/lib/queries";
import { formatPoints } from "@/lib/utils";

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
    <div>
      <PageTitle title={data.league.name} subtitle={`Código: ${data.league.code}`} />
      <Card>
        {data.rows.length === 0 ? (
          <p className="text-sm text-white/50">Todavía no hay participantes.</p>
        ) : (
          <ol className="divide-y divide-white/10">
            {data.rows.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-6 text-center font-bold text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.entryName ?? "Sin equipo"}</span>
                  <span className="block truncate text-xs text-white/40">{r.username ?? "DT"}</span>
                </span>
                <span className="font-bold text-gold">{formatPoints(r.totalPoints ?? 0)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
