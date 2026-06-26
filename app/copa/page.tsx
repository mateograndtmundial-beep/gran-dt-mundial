import Link from "next/link";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, ValidationCallout } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getGoldenTicketCopas, type CopaStatus } from "@/lib/queries";
import { CopaPromoCard } from "@/components/copa/CopaPromoCard";
import { CopaLeagueRow } from "@/components/copa/CopaLeagueRow";
import { CopaSoldOutCard } from "@/components/copa/CopaSoldOutCard";
import { CopaSignedOutHero } from "@/components/copa/CopaSignedOutHero";
import { CopaPausedNotice } from "@/components/copa/CopaPausedNotice";
import { formatCopaStart } from "@/components/copa/format";
import { COPA_PAUSED } from "@/lib/copa/announcement";

export const dynamic = "force-dynamic";

/**
 * Landing de campaña de la Liga Premium (los11desampa.com/copa). NO va en la nav: se
 * llega por el link de redes y el banner de la home. Reusa los componentes de la Copa.
 * Maneja el retorno del pago (?status=) igual que /ligas/[code].
 */
export default async function CopaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let copas: CopaStatus[] = [];
  let error = false;
  try {
    user = await getCurrentUser();
    copas = await getGoldenTicketCopas(user?.id);
  } catch {
    error = true;
  }

  const enrolledCopas = copas.filter((c) => c.isEnrolled);
  const promoCopa = copas
    .filter((c) => !c.isEnrolled && c.status === "open" && (c.spotsLeft ?? 0) > 0 && !c.deadlinePassed)
    .sort((a, b) => (a.spotsLeft ?? 0) - (b.spotsLeft ?? 0))[0];
  const soldOut = !promoCopa && enrolledCopas.length === 0 && copas.length > 0;
  // Para el hero sin sesión, datos de premio/entrada de la copa abierta (o la primera).
  const featured = promoCopa ?? copas[0] ?? null;
  // ¿Ya armó su equipo? Viene como columna de getGoldenTicketCopas (mismo valor en todas
  // las filas, sin round-trip extra). Si todavía no, empujamos a armarlo antes de pagar.
  const needsTeam = !(copas[0]?.hasTeam ?? false);
  // Fecha de arranque (kickoff de 16vos) para dejar claro en toda la página cuándo empieza.
  const startDate = formatCopaStart(featured?.closesAt ?? null);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Liga Premium"
        subtitle={
          COPA_PAUSED
            ? "Información sobre la Liga Premium."
            : `Premio $400.000 garantizado, repartido entre los 10 primeros. ${
                startDate ? `Arranca el ${startDate} con los 16vos.` : "Arranca con los 16vos de final."
              } Cupo limitado.`
        }
      />

      {status === "success" && (
        <ValidationCallout type="success">
          ¡Pago recibido! Te sumamos a la Liga Premium en cuanto se confirme el pago (puede tardar unos
          segundos).
        </ValidationCallout>
      )}
      {status === "failure" && (
        <ValidationCallout type="danger">El pago no se completó. Podés intentar de nuevo.</ValidationCallout>
      )}
      {status === "pending" && (
        <ValidationCallout type="warning">Estamos confirmando tu pago. Puede demorar unos minutos.</ValidationCallout>
      )}

      {error ? (
        <EmptyState title="No pudimos cargar la Liga Premium." hint="Probá recargar en un rato." />
      ) : COPA_PAUSED ? (
        // Pausada: a los inscriptos el aviso de cancelación + su fila; al resto, el aviso
        // de pausa (sin ningún CTA de inscripción).
        enrolledCopas.length > 0 ? (
          <>
            <CopaPausedNotice variant="enrolled" />
            <div>
              <Eyebrow className="mb-2">YA ESTÁS DENTRO</Eyebrow>
              <Card className="overflow-hidden">
                {enrolledCopas.map((c) => (
                  <CopaLeagueRow key={c.id} copa={c} />
                ))}
              </Card>
            </div>
          </>
        ) : (
          <CopaPausedNotice variant="prospect" />
        )
      ) : !user ? (
        <CopaSignedOutHero
          prizeArs={featured?.prizeArs ?? null}
          entryFeeArs={featured?.entryFeeArs ?? null}
          capacity={featured?.capacity ?? null}
          startsAt={featured?.closesAt ?? null}
        />
      ) : copas.length === 0 ? (
        <EmptyState title="La Liga Premium todavía no está abierta." hint="Seguinos en Instagram para enterarte." />
      ) : (
        <>
          {/* Copas en las que ya estás dentro */}
          {enrolledCopas.length > 0 && (
            <div>
              <Eyebrow className="mb-2">YA ESTÁS DENTRO</Eyebrow>
              <Card className="overflow-hidden">
                {enrolledCopas.map((c) => (
                  <CopaLeagueRow key={c.id} copa={c} />
                ))}
              </Card>
            </div>
          )}

          {/* Inscripción a una copa abierta, o cupos agotados */}
          {promoCopa && <CopaPromoCard copa={promoCopa} needsTeam={needsTeam} />}
          {soldOut && <CopaSoldOutCard />}

          {/* Cómo funciona, resumido. El detalle (distribución, desempate) en /bases. */}
          <Card className="p-5">
            <Eyebrow className="mb-3 text-gold-ink">CÓMO FUNCIONA</Eyebrow>
            <ul className="space-y-2.5 text-sm leading-snug text-ink-2">
              {[
                <>
                  Competís con tu equipo de siempre — {startDate ? `arranca el ${startDate}, ` : ""}rankea
                  desde los 16vos de final.
                </>,
                <>Entrada $5.000 · premio $400.000 garantizado al top 10 (lo pone la casa).</>,
                <>
                  Cupo de 100. Cuando se llena, se cierra la inscripción; si querés que abramos otra,
                  escribinos por Instagram.
                </>,
                <>Si pagás y no entrás por falta de cupo, te reembolsamos.</>,
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-3">
              <Link
                href="/bases"
                className="text-sm font-semibold text-gold-ink underline-offset-2 hover:underline"
              >
                Ver Bases y Condiciones →
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
