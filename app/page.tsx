import Image from "next/image";
import Link from "next/link";
import { Shirt, Calculator, Trophy } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { WelcomeBanner } from "@/components/welcome-banner";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";
import { TOURNAMENT_START } from "@/lib/game/config";
import { SITE } from "@/lib/site";
import { InstagramIcon } from "@/components/icons";

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

export default function Home() {
  return (
    <div className="space-y-12">
      <WelcomeBanner />

      {/* ─── HERO ─── */}
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[55%_45%]">
        {/* Columna izquierda: texto + CTA */}
        <div className="space-y-6">
          <Eyebrow>MUNDIAL 2026 · PONETE EL BUZO DE SAMPA</Eyebrow>

          <h1 className="font-display text-[clamp(3.5rem,8vw,7rem)] leading-none tracking-tight text-ink">
            LOS <span className="text-blue">11</span> DE SAMPA
          </h1>

          <p className="max-w-[420px] text-lg leading-relaxed text-ink-2">
            Ponete el buzo de Sampa: armá tu plantel del Mundial, elegí
            capitán y DT, y competí con tus amigos durante las 8 fechas.
          </p>

          {/* Countdown */}
          <div>
            <Eyebrow className="mb-3">EL MUNDIAL ARRANCA EN</Eyebrow>
            <Countdown target={TOURNAMENT_START} />
          </div>

          <div className="flex flex-wrap items-center gap-4">
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
          <Feature
            icon={<Shirt size={24} strokeWidth={1.5} />}
            title="Armá tu plantel"
            text="15 jugadores dentro del presupuesto: titulares, suplentes, formación, capitán y técnico."
          />
          <Feature
            icon={<Calculator size={24} strokeWidth={1.5} />}
            title="Sumá fecha a fecha"
            text="Tus jugadores puntúan por lo que hacen en la cancha real: goles, asistencias, vallas, la figura."
          />
          <Feature
            icon={<Trophy size={24} strokeWidth={1.5} />}
            title="Ganá la liga"
            text="Creá tu liga, sumá a los amigos y peleá el primer puesto durante las 8 fechas del Mundial."
          />
        </div>
      </section>

      {/* ─── Instagram ─── */}
      <section>
        <a
          href={SITE.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-4 rounded-[8px] border border-border bg-surface px-5 py-4 card-shadow transition-all duration-150 hover:-translate-y-0.5 hover:card-shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue text-white">
              <InstagramIcon size={22} />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">Seguinos en Instagram</p>
              <p className="text-sm text-ink-3">
                Para enterarte de todo: novedades, tips y el día a día del Mundial.
              </p>
            </div>
          </div>
          <span className="shrink-0 font-display text-base text-blue">{SITE.instagram.handle} →</span>
        </a>
      </section>
    </div>
  );
}
