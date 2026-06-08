import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getMatchEditor } from "@/lib/queries";
import { MatchEditor } from "@/components/match-editor";

export const dynamic = "force-dynamic";

export default async function AdminMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const id = Number(matchId);

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let data: Awaited<ReturnType<typeof getMatchEditor>> = null;
  try {
    user = await getCurrentUser();
    data = Number.isInteger(id) ? await getMatchEditor(id) : null;
  } catch {
    // sin DB / sin auth -> acceso restringido
  }

  if (!user || !user.isAdmin) {
    return (
      <div>
        <PageTitle title="Editar partido" />
        <EmptyState title="Acceso restringido" hint="Necesitás ser administrador." />
      </div>
    );
  }
  if (!data) return notFound();

  const { match, players } = data;

  return (
    <div className="space-y-4">
      <Link href={`/admin/fecha/${match.roundId}`} className="eyebrow text-ink-3 hover:text-ink">
        ← {match.roundName ?? "Fecha"}
      </Link>
      <PageTitle
        title={`${match.homeName ?? "?"} vs ${match.awayName ?? "?"}`}
        subtitle="Cargá/corregí stats por jugador. El puntaje se recalcula al guardar; después publicá la fecha desde el panel."
      />
      {players.length === 0 ? (
        <EmptyState
          title="Partido sin selecciones asignadas."
          hint="Los cruces de eliminatorias se completan al re-correr npm run seed cuando API-Football los publica."
        />
      ) : (
        <MatchEditor match={match} players={players} />
      )}
    </div>
  );
}
