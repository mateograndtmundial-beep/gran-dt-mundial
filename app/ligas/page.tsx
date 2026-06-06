import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getMyLeagues } from "@/lib/queries";
import { LeagueActions } from "@/components/league-actions";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
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

          {/* Liga global */}
          <div>
            <Eyebrow className="mb-3">LIGAS</Eyebrow>
            <Card className="overflow-hidden">
              {/* Liga global — siempre primera, diferenciada */}
              <Link
                href="/ranking"
                className="flex items-center gap-3 px-4 py-3.5 bg-blue-light border-l-4 border-l-blue hover:bg-blue-light/70 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">Liga Global</p>
                  <p className="text-xs text-ink-3">Todos los participantes</p>
                </div>
                <ChevronRight size={16} className="text-blue shrink-0" aria-hidden />
              </Link>

              {/* Ligas privadas */}
              {leagues.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-ink-3">Todavía no estás en ninguna liga privada.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {leagues.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/ligas/${l.code}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block font-semibold text-sm text-ink">{l.name}</span>
                          <span className={cn(
                            "font-mono text-xs text-ink-3 tracking-widest"
                          )}>
                            {l.code}
                          </span>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-ink-faint group-hover:text-ink-3 transition-colors shrink-0"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
