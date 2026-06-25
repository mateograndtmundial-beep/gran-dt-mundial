import Link from "next/link";
import { PageTitle, EmptyState, Card } from "@/components/ui";
import { Eyebrow, ValidationCallout } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getGoldenTicketCopas, type CopaStatus } from "@/lib/queries";
import { CopaPromoCard } from "@/components/copa/CopaPromoCard";
import { CopaLeagueRow } from "@/components/copa/CopaLeagueRow";
import { CopaSoldOutCard } from "@/components/copa/CopaSoldOutCard";
import { CopaSignedOutHero } from "@/components/copa/CopaSignedOutHero";

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

  return (
    <div className="space-y-5">
      <PageTitle
        title="Liga Premium"
        subtitle="Premio $400.000 garantizado, repartido entre los 10 primeros. Cupo limitado."
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
      ) : !user ? (
        <CopaSignedOutHero
          prizeArs={featured?.prizeArs ?? null}
          entryFeeArs={featured?.entryFeeArs ?? null}
          capacity={featured?.capacity ?? null}
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
            <Eyebrow className="mb-2">CÓMO FUNCIONA</Eyebrow>
            <ul className="space-y-1.5 text-sm text-ink-2">
              <li>· Competís con tu equipo de siempre — rankea desde los 16vos de final.</li>
              <li>· Entrada $5.000 · premio $400.000 garantizado al top 10 (lo pone la casa).</li>
              <li>· Cupo de 100. Cuando se llena, se cierra la inscripción; si querés que abramos otra, escribinos por Instagram.</li>
              <li>· Si pagás y no entrás por falta de cupo, te reembolsamos.</li>
            </ul>
            <Link href="/bases" className="mt-3 inline-block text-sm font-semibold text-gold-ink underline">
              Ver Bases y Condiciones →
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
