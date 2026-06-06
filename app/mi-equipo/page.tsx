import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, StatNumeral, SecondaryButton, PrimaryButton } from "@/components/editorial";
import { PointsBreakdown } from "@/components/domain/PointsBreakdown";
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

  const ranking = 1; // Placeholder — se conecta al leaderboard real

  return (
    <div className="space-y-6">
      {/* Hero con watermark del ranking */}
      <section className="relative overflow-hidden rounded-[8px] border border-border bg-surface card-shadow px-6 py-10">
        {/* Watermark: número de ranking gigante, apenas visible */}
        <span
          className="absolute right-4 top-0 font-display text-[20vw] leading-none text-ink opacity-[0.04] select-none pointer-events-none"
          aria-hidden
        >
          {ranking}
        </span>

        {/* Contenido real */}
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Eyebrow>MI EQUIPO</Eyebrow>
            <h1 className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-none text-ink">
              {team.entry.name}
            </h1>
            <StatNumeral
              value={formatPoints(team.entry.totalPoints)}
              label="PUNTOS TOTALES"
              size="lg"
            />
            <Eyebrow>#{ranking} EN EL RANKING GLOBAL</Eyebrow>
          </div>

          <SecondaryButton href="/equipo">EDITAR EQUIPO</SecondaryButton>
        </div>
      </section>

      {/* Puntos por fecha */}
      <Card className="p-5">
        <div className="flex items-center justify-between pb-3 mb-2 border-b-2 border-border">
          <Eyebrow>Puntos por fecha</Eyebrow>
        </div>
        <PointsBreakdown rounds={team.rounds} />
      </Card>
    </div>
  );
}
