import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, PositionChip } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getRoundWithMatches, getRoundLivePoints } from "@/lib/queries";
import { AdminControls } from "@/components/admin-controls";
import { MatchRecapButton } from "@/components/match-recap-button";
import { formatPoints } from "@/lib/utils";

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
  let livePoints: Awaited<ReturnType<typeof getRoundLivePoints>> = [];
  try {
    user = await getCurrentUser();
    data = Number.isInteger(id) ? await getRoundWithMatches(id) : null;
    // Solo el admin ve puntos antes de publicar — los usuarios recién al cierre.
    if (user?.isAdmin && data) livePoints = await getRoundLivePoints(id);
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
                <div className="flex flex-wrap items-center gap-2">
                  <MatchRecapButton matchId={m.id} hasStats={m.statsCount > 0} />
                  <Link
                    href={`/admin/partido/${m.id}`}
                    className="rounded-[6px] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all"
                  >
                    Editar →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Puntos en vivo de la fecha — SOLO ADMIN. Lee player_match_stats directo
          (lo que va dejando el sync); los usuarios ven puntajes recién cuando la
          fecha se publica. */}
      {livePoints.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>PUNTOS EN VIVO · SOLO ADMIN</Eyebrow>
            <span className="text-[11px] text-ink-faint">
              {livePoints.length} jugadores con stats · los usuarios los ven al publicar la fecha
            </span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto overflow-x-auto rounded-[8px] border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2 text-ink-3">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Jugador</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Selección</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold">Min</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold">Nota</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {livePoints.map((p, i) => (
                  <tr key={p.playerId} className="border-t border-border">
                    <td className="px-2 py-1 text-xs text-ink-faint tabular-nums">{i + 1}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <PositionChip position={p.position} />
                        <span className="font-medium text-ink">{p.name}</span>
                        {p.isMotm && <span title="Figura del partido">⭐</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-ink-2">{p.countryName}</td>
                    <td className="px-1.5 py-1 text-center tabular-nums text-ink-2">{p.minutes}</td>
                    <td className="px-1.5 py-1 text-center tabular-nums text-ink-2">{p.rating ?? "–"}</td>
                    <td className="px-2 py-1 text-right font-bold tabular-nums text-ink">{formatPoints(Number(p.points))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
