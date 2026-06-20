import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getMyLeagues, getGoldenTicketCopas, type CopaStatus } from "@/lib/queries";
import { LeagueActions } from "@/components/league-actions";
import { CopaLeagueRow } from "@/components/copa/CopaLeagueRow";
import { CopaPromoCard } from "@/components/copa/CopaPromoCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LigasPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let leagues: Awaited<ReturnType<typeof getMyLeagues>> = [];
  let copas: CopaStatus[] = [];
  let error = false;
  try {
    user = await getCurrentUser();
    if (user) [leagues, copas] = await Promise.all([getMyLeagues(user.id), getGoldenTicketCopas(user.id)]);
  } catch {
    error = true;
  }

  // Copas en las que ya está inscripto (fila premium arriba de las privadas) y la copa
  // abierta a la que se puede sumar (una sola card de promo, la de menor cupo restante).
  const enrolledCopas = copas.filter((c) => c.isEnrolled);
  const promoCopa = copas
    .filter((c) => !c.isEnrolled && c.status === "open" && (c.spotsLeft ?? 0) > 0)
    .sort((a, b) => (a.spotsLeft ?? 0) - (b.spotsLeft ?? 0))[0];
  // Las copas no se listan como ligas privadas (se muestran como fila premium aparte).
  const privateLeagues = leagues.filter((l) => l.kind !== "golden_ticket");

  return (
    <div className="space-y-6">
      <PageTitle title="Ligas" subtitle="Creá una liga privada o unite con un código." />

      {error ? (
        <EmptyState title="No pudimos cargar tus ligas." hint="Probá recargar la página en un rato." />
      ) : !user ? (
        <EmptyState
          title="Ingresá para crear o unirte a ligas."
          hint="Competí contra tus amigos por el primer puesto."
        />
      ) : (
        <>
          <LeagueActions />

          {/* Liga Premium — card de promo solo si hay una abierta y no estás dentro */}
          {promoCopa && <CopaPromoCard copa={promoCopa} />}

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

              {/* Copa(s) premium inscripta(s) — arriba de las privadas, destacadas en dorado */}
              {enrolledCopas.map((c) => (
                <CopaLeagueRow key={c.id} copa={c} />
              ))}

              {/* Ligas privadas */}
              {privateLeagues.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-ink-3">Todavía no estás en ninguna liga privada.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {privateLeagues.map((l) => (
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
