import Link from "next/link";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getMyTeam } from "@/lib/queries";
import { formatPoints } from "@/lib/utils";

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
        <EmptyState title="No se pudo cargar tu equipo." hint="Revisá la configuración de la base." />
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
          <Link href="/equipo" className="inline-block rounded-lg bg-gold px-5 py-2.5 font-bold text-pitch">
            Armar mi equipo
          </Link>
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
          <Link href="/equipo" className="inline-block rounded-lg bg-gold px-5 py-2.5 font-bold text-pitch">
            Armar mi equipo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <PageTitle title={team.entry.name} subtitle={`${formatPoints(team.entry.totalPoints)} puntos totales`} />
        <Link href="/equipo" className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold">
          Editar
        </Link>
      </div>

      <Card>
        <h3 className="mb-2 font-bold">Puntos por fecha</h3>
        {team.rounds.length === 0 ? (
          <p className="text-sm text-white/50">Todavía no hay fechas jugadas.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {team.rounds.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-white/70">{r.roundName}</span>
                <span className="font-bold text-gold">{formatPoints(r.points)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
