import Image from "next/image";
import Link from "next/link";
import { Shirt, Calculator, Trophy } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { WelcomeBanner } from "@/components/welcome-banner";
import { DoubleChangeBanner } from "@/components/double-change-banner";
import { CopaHomeBanner } from "@/components/copa/CopaHomeBanner";
import { FinalPodium } from "@/components/domain/FinalPodium";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";
import { TOURNAMENT_START } from "@/lib/game/config";
import { getEditableRound, getGoldenTicketCopas, getTournamentResults, type PodiumRow } from "@/lib/queries";
import { COPA_PAUSED } from "@/lib/copa/announcement";
import { getCurrentUser } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { InstagramIcon, XIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

function SocialCard({
  href,
  icon,
  title,
  text,
  handle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  handle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-4 rounded-[8px] border border-border bg-surface px-5 py-4 card-shadow transition-all duration-150 hover:-translate-y-0.5 hover:card-shadow-md"
    >
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue text-white">
          {icon}
        </span>
        <div>
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-3">{text}</p>
        </div>
      </div>
      <span className="shrink-0 font-display text-base text-blue">{handle} →</span>
    </a>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="group p-5 transition-all duration-150 hover:-translate-y-1 hover:card-shadow-md">
      <div className="mb-3 text-blue">{icon}</div>
      <h3 className="mb-1 text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-3">{text}</p>
    </Card>
  );
}

export default async function Home() {
  // Fecha editable: define el aviso y el countdown del hero. Antes del Mundial
  // cuenta para el arranque; con el torneo en juego, para el cierre de cambios
  // (el kickoff del primer partido de la fecha editable, leído de la DB).
  let editable: Awaited<ReturnType<typeof getEditableRound>> = null;
  try {
    editable = await getEditableRound();
  } catch {
    // sin DB: el hero cae al countdown estático del arranque del Mundial
  }

  // Promo SUTIL de la Liga Premium: solo si hay una copa abierta con cupo y el usuario
  // no está inscripto en ninguna. Best-effort: si falla, no mostramos el banner.
  let copaBanner: { prize: number; closesAt: string | Date | null } | null = null;
  try {
    const user = await getCurrentUser();
    if (user) {
      const copas = await getGoldenTicketCopas(user.id);
      const open = copas.find(
        (c) => !c.isEnrolled && c.status === "open" && (c.spotsLeft ?? 0) > 0 && !c.deadlinePassed,
      );
      const enrolledAny = copas.some((c) => c.isEnrolled);
      // Liga Premium en pausa → sin banner de promo (no invitamos a sumarse).
      if (open && !enrolledAny && !COPA_PAUSED) copaBanner = { prize: open.prizeArs ?? 400000, closesAt: open.closesAt };
    }
  } catch {
    // sin DB / sin auth: sin banner
  }
  // ¿Terminó el Mundial? Con la última fecha publicada el hero deja de mostrar el
  // countdown (que si no quedaría clavado en 00:00:00:00, contando a una fecha ya
  // pasada) y pasa a coronar a los campeones del juego. Try/catch aparte del de
  // `editable`: si el podio falla no queremos perder el countdown.
  let finished = false;
  let podium: PodiumRow[] = [];
  try {
    const res = await getTournamentResults();
    finished = res.finished;
    podium = res.podium;
  } catch {
    // sin DB: hero normal (el fallback seguro es "en juego", nunca coronar de más)
  }

  const started = editable != null && editable.round.order > 1;
  // La fecha editable puede no tener fixtures todavía (playoffs antes de que se
  // publique el cuadro) → sin kickoff que contar: el hero muestra un cartel en vez
  // del countdown numérico.
  const hasDeadline = editable?.deadline != null;
  const roundShortName = editable?.round.name.split("—")[0]!.trim();
  const deadlineLabel = editable?.deadline?.toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <>
      {/* Banner de la Copa fuera del rhythm de space-y-12 para que quede pegado arriba
          (su propio mb-4) y no deje el hueco de 3rem antes del hero en mobile. */}
      {copaBanner != null && <CopaHomeBanner prizeArs={copaBanner.prize} startsAt={copaBanner.closesAt} />}
      <div className="space-y-12">
      <WelcomeBanner finished={finished} />
      <DoubleChangeBanner />

      {/* ─── HERO ─── */}
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[55%_45%]">
        {/* Columna izquierda: texto + CTA */}
        <div className="space-y-6">
          <Eyebrow>
            {finished ? "MUNDIAL 2026 · TERMINÓ" : "MUNDIAL 2026 · PONETE EL BUZO DE SAMPA"}
          </Eyebrow>

          <h1 className="font-display text-[clamp(3.5rem,8vw,7rem)] leading-none tracking-tight text-ink">
            LOS <span className="text-blue">11</span> DE SAMPA
          </h1>

          <p className="max-w-[420px] text-lg leading-relaxed text-ink-2">
            {finished ? (
              <>El Mundial terminó. Estos son los DT que mejor la vieron.</>
            ) : (
              <>
                Ponete el buzo de Sampa: armá tu plantel del Mundial, elegí
                capitán y DT, y competí con tus amigos durante las 8 fechas.
              </>
            )}
          </p>

          {/* Countdown: al arranque del Mundial, o al cierre de cambios de la fecha
              editable. Si la próxima fecha todavía no tiene fixtures (playoffs antes
              del cuadro), no hay kickoff que contar → cartel en lugar del countdown. */}
          {finished ? (
            // Torneo terminado: el countdown no tiene a qué apuntar (contaría a una
            // fecha pasada y quedaría en 00:00:00:00) → lo reemplaza el podio.
            <div className="max-w-[460px]">
              <FinalPodium rows={podium} heading="PODIO FINAL · LOS 11 DE SAMPA" />
            </div>
          ) : (
            <div>
              <Eyebrow className="mb-3">
                {started ? `CIERRE DE CAMBIOS · ${roundShortName!.toUpperCase()}` : "EL MUNDIAL ARRANCA EN"}
              </Eyebrow>
              {started && !hasDeadline ? (
                <p className="max-w-[420px] font-display text-2xl leading-tight tracking-tight text-ink-2">
                  SE DEFINE CUANDO TERMINEN LOS GRUPOS
                </p>
              ) : (
                <Countdown target={started ? editable!.deadline!.toISOString() : TOURNAMENT_START} />
              )}
            </div>
          )}

          {editable && (
            <p className="max-w-[420px] text-sm leading-relaxed text-ink-2">
              {!started ? (
                <>
                  Armá tu equipo antes del <strong>{deadlineLabel}</strong> (hora Argentina) para
                  sumar puntos desde la Fecha 1.
                </>
              ) : hasDeadline ? (
                <>
                  El Mundial ya está en juego: armá tu equipo ahora y sumás desde{" "}
                  <strong>{roundShortName}</strong>. Tenés tiempo hasta el{" "}
                  <strong>{deadlineLabel}</strong> (hora Argentina). La ventana ya está
                  abierta — no esperes a que se publiquen los puntos para hacer tus cambios.
                </>
              ) : (
                <>
                  El Mundial ya está en juego: armá tu equipo para{" "}
                  <strong>{roundShortName}</strong> y sumás desde ahí. La ventana ya está
                  abierta; el cierre se define cuando termine la fase de grupos.
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {finished ? (
              <>
                <PrimaryButton href="/ranking">VER EL RANKING FINAL →</PrimaryButton>
                <Link
                  href="/mi-equipo"
                  className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
                >
                  Ver mi equipo
                </Link>
                <Link
                  href="/ligas"
                  className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
                >
                  Mis ligas
                </Link>
              </>
            ) : (
              <>
                <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
                <Link
                  href="/jugadores"
                  className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
                >
                  Ver jugadores
                </Link>
                <Link
                  href="/como-funciona"
                  className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
                >
                  ¿Cómo funciona?
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Columna derecha: Sampa protagonista (figurita) */}
        <div className="flex justify-center md:justify-end">
          <div
            className="relative overflow-hidden rounded-[8px] card-shadow-lg rotate-[-1.5deg] transition-transform duration-300 hover:rotate-0"
            style={{ maxWidth: 320 }}
          >
            <Image
              src="/images/logo/logo-square-512.png"
              alt="Caricatura de Sampaoli — Los 11 de Sampa"
              width={512}
              height={512}
              className="h-auto w-full"
              priority
            />
            {/* Eyebrow tipo álbum Panini */}
            <div className="absolute inset-x-0 bottom-0 bg-blue px-4 py-2">
              <span className="font-display text-sm leading-none tracking-wide text-white">
                J. SAMPAOLI · DT · ARGENTINA
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DE QUÉ VA ─── */}
      <section>
        <Eyebrow className="mb-4">DE QUÉ VA</Eyebrow>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Con el torneo terminado, los imperativos ("armá", "sumá") invitan a algo
              que ya no se puede hacer → la misma sección en pretérito. */}
          <Feature
            icon={<Shirt size={24} strokeWidth={1.5} />}
            title={finished ? "Se armaba un plantel" : "Armá tu plantel"}
            text="15 jugadores dentro del presupuesto: titulares, suplentes, formación, capitán y técnico."
          />
          <Feature
            icon={<Calculator size={24} strokeWidth={1.5} />}
            title={finished ? "Se sumaba fecha a fecha" : "Sumá fecha a fecha"}
            text={
              finished
                ? "Los jugadores puntuaban por lo que hacían en la cancha real: goles, asistencias, vallas, la figura."
                : "Tus jugadores puntúan por lo que hacen en la cancha real: goles, asistencias, vallas, la figura."
            }
          />
          <Feature
            icon={<Trophy size={24} strokeWidth={1.5} />}
            title={finished ? "Se ganaba la liga" : "Ganá la liga"}
            text={
              finished
                ? "Cada uno con su liga y sus amigos, peleando el primer puesto durante las 8 fechas del Mundial."
                : "Creá tu liga, sumá a los amigos y peleá el primer puesto durante las 8 fechas del Mundial."
            }
          />
        </div>
      </section>

      {/* ─── Redes ─── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SocialCard
          href={SITE.instagram.url}
          icon={<InstagramIcon size={22} />}
          title="Seguinos en Instagram"
          text="Para enterarte de todo: novedades, tips y el día a día del Mundial."
          handle={SITE.instagram.handle}
        />
        <SocialCard
          href={SITE.twitter.url}
          icon={<XIcon size={20} />}
          title="Seguinos en X"
          text="Resultados, puntajes y novedades en tiempo real."
          handle={SITE.twitter.handle}
        />
      </section>
      </div>
    </>
  );
}
