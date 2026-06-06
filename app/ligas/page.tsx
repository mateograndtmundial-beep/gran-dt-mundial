import Link from "next/link";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getMyLeagues } from "@/lib/queries";
import { LeagueActions } from "@/components/league-actions";

export const dynamic = "force-dynamic";

export default async function LigasPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let leagues: Awaited<ReturnType<typeof getMyLeagues>> = [];
  let error = false;
  try {
    user = await getCurrentUser();
    if (user) leagues = await getMyLeagues(user.id);
  } catch {
    error = true;
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Ligas" subtitle="Creá una liga privada o unite con un código." />

      {error ? (
        <EmptyState title="No se pudo cargar tus ligas." hint="Revisá la base." />
      ) : !user ? (
        <EmptyState
          title="Ingresá para crear o unirte a ligas."
          hint="Competí contra tus amigos por el primer puesto."
        />
      ) : (
        <>
          <LeagueActions />
          <Card>
            <h3 className="mb-2 font-bold">Mis ligas</h3>
            {leagues.length === 0 ? (
              <p className="text-sm text-white/50">Todavía no estás en ninguna liga.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {leagues.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/ligas/${l.code}`}
                      className="flex items-center justify-between py-2.5 text-sm hover:text-gold"
                    >
                      <span className="font-semibold">{l.name}</span>
                      <span className="font-mono text-xs text-white/40">{l.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
