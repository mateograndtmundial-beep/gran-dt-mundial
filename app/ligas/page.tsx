import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getMyLeagues, getGoldenTicketCopas, isTournamentFinished, type CopaStatus } from "@/lib/queries";
import { LeagueActions } from "@/components/league-actions";
import { CopaLeagueRow } from "@/components/copa/CopaLeagueRow";
import { CopaPromoCard } from "@/components/copa/CopaPromoCard";
import { CopaSoldOutCard } from "@/components/copa/CopaSoldOutCard";
import { COPA_PAUSED } from "@/lib/copa/announcement";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LigasPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let leagues: Awaited<ReturnType<typeof getMyLeagues>> = [];
  let copas: CopaStatus[] = [];
  let finished = false;
  let error = false;
  try {
    finished = await isTournamentFinished();
    user = await getCurrentUser();
    if (user) {
      [leagues, copas] = await Promise.all([getMyLeagues(user.id), getGoldenTicketCopas(user.id)]);
    } else {
      // Sin sesión: igual traemos las copas para el CTA de la Liga Premium (premio, entrada,
      // fecha de arranque). getGoldenTicketCopas sin userId marca isEnrolled/hasTeam en false.
      copas = await getGoldenTicketCopas();
    }
  } catch {
    error = true;
  }

  // Copas en las que ya está inscripto (fila premium arriba de las privadas) y la copa
  // abierta a la que se puede sumar (una sola card de promo, la de menor cupo restante).
  const enrolledCopas = copas.filter((c) => c.isEnrolled);
  // Liga Premium en pausa → no mostramos promo ni "agotado" a los no inscriptos (los
  // inscriptos siguen viendo su fila premium, con el aviso de cancelación adentro).
  const promoCopa = COPA_PAUSED
    ? undefined
    : copas
        .filter((c) => !c.isEnrolled && c.status === "open" && (c.spotsLeft ?? 0) > 0 && !c.deadlinePassed)
        .sort((a, b) => (a.spotsLeft ?? 0) - (b.spotsLeft ?? 0))[0];
  // Cupos agotados: hay copas premium visibles pero ninguna abierta para sumarse y el
  // usuario no está dentro de ninguna → mostramos la invitación a escribir por Instagram.
  const soldOut = !COPA_PAUSED && !promoCopa && enrolledCopas.length === 0 && copas.length > 0;
  // Las copas no se listan como ligas privadas (se muestran como fila premium aparte).
  const privateLeagues = leagues.filter((l) => l.kind !== "golden_ticket");

  return (
    <div className="space-y-6">
      <PageTitle title="Ligas" subtitle="Creá una liga privada o unite con un código." />

      {error ? (
        <EmptyState title="No pudimos cargar tus ligas." hint="Probá recargar la página en un rato." />
      ) : !user ? (
        <div className="space-y-5">
          {/* Liga Premium: el gancho más fuerte para el visitante sin cuenta. */}
          {promoCopa && <CopaPromoCard copa={promoCopa} href="/copa" />}
          {soldOut && <CopaSoldOutCard />}

          {/* CTA general: crear cuenta + armar equipo para participar (ranking, ligas, copa). */}
          <Card className="p-6 text-center">
            <Eyebrow className="mb-2 block">{finished ? "ESTA EDICIÓN TERMINÓ" : "EMPEZÁ A JUGAR"}</Eyebrow>
            <p className="mx-auto mb-4 max-w-md text-sm text-ink-2">
              {finished
                ? "El Mundial 2026 terminó y con él esta edición de Los 11 de Sampa. Podés ver cómo quedó el ranking final de todos los DT."
                : "Creá tu cuenta gratis y armá tu equipo del Mundial para competir en el ranking global, en ligas con tus amigos y en la Liga Premium."}
            </p>
            {finished ? (
              <PrimaryButton href="/ranking">VER EL RANKING FINAL →</PrimaryButton>
            ) : (
              <>
                <PrimaryButton href="/sign-up?redirect_url=%2Fequipo">
                  CREAR CUENTA Y ARMAR EQUIPO →
                </PrimaryButton>
                <p className="mt-3 text-xs text-ink-3">
                  ¿Ya tenés cuenta?{" "}
                  <Link href="/sign-in?redirect_url=%2Fligas" className="font-semibold text-blue underline">
                    Ingresar
                  </Link>
                </p>
              </>
            )}
          </Card>
        </div>
      ) : (
        <>
          {/* Liga Premium — card de promo si hay una abierta, o "cupos agotados" si no */}
          {promoCopa && <CopaPromoCard copa={promoCopa} href="/copa" />}
          {soldOut && <CopaSoldOutCard />}

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

          {/* Crear o unirse a una liga — acción secundaria, debajo del listado */}
          <LeagueActions />
        </>
      )}
    </div>
  );
}
