import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getRoundWithMatches } from "@/lib/queries";
import { AdminControls } from "@/components/admin-controls";

export const dynamic = "force-dynamic";

const MATCH_STATUS: Record<string, string> = {
  scheduled: "Programado",
  live: "En vivo",
  finished: "Finalizado",
};

export default async function AdminRoundPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const id = Number(roundId);

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let data: Awaited<ReturnType<typeof getRoundWithMatches>> = null;
  try {
    user = await getCurrentUser();
    data = Number.isInteger(id) ? await getRoundWithMatches(id) : null;
  } catch {
    // sin DB / sin auth -> acceso restringido
  }

  if (!user || !user.isAdmin) {
    return (
      <div>
        <PageTitle title="Revisar fecha" />
        <EmptyState title="Acceso restringido" hint="Necesitás ser administrador." />
      </div>
    );
  }
  if (!data) return notFound();

  const { round, matches } = data;

  return (
    <div className="space-y-5">
      <Link href="/admin" className="eyebrow text-ink-3 hover:text-ink">← Panel de administración</Link>
      <PageTitle
        title={round.name}
        subtitle="Sincronizá, revisá/editá cada partido y después publicá la fecha (una sola vez)."
      />

      <AdminControls rounds={[{ id: round.id, name: round.name, status: round.status }]} />

      {matches.length === 0 ? (
        <EmptyState title="La fecha no tiene partidos." hint="Corré: npm run seed" />
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const pen =
              m.homePenalties != null && m.awayPenalties != null
                ? ` (${m.homePenalties}-${m.awayPenalties} pen)`
                : "";
            return (
              <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">
                    {m.homeName ?? "?"} <span className="tabular-nums">{m.homeScore ?? "–"}</span>
                    {" : "}
                    <span className="tabular-nums">{m.awayScore ?? "–"}</span> {m.awayName ?? "?"}
                    <span className="text-ink-faint">{pen}</span>
                  </div>
                  <Eyebrow>
                    {m.statsCount} con stats · {MATCH_STATUS[m.status] ?? m.status}
                  </Eyebrow>
                </div>
                <Link
                  href={`/admin/partido/${m.id}`}
                  className="rounded-[6px] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all"
                >
                  Editar →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
