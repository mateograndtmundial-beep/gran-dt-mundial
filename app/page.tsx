import Image from "next/image";
import Link from "next/link";
import { Shirt, Calculator, Trophy } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";
import { TOURNAMENT_START } from "@/lib/game/config";

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
    <Card className="p-5 group hover:card-shadow-md hover:-translate-y-1 transition-all duration-150">
      <div className="text-blue mb-3">{icon}</div>
      <h3 className="font-semibold text-ink text-base mb-1">{title}</h3>
      <p className="text-sm text-ink-3 leading-relaxed">{text}</p>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="space-y-12">
      {/* ─── HERO ─── */}
      <section className="grid gap-10 md:grid-cols-[55%_45%] items-center pt-6">
        {/* Columna izquierda: texto + CTA */}
        <div className="space-y-6">
          <Eyebrow>MUNDIAL 2026 · FANTASY FÚTBOL</Eyebrow>

          <h1 className="font-display text-[clamp(3.5rem,8vw,7rem)] leading-none tracking-tight text-ink">
            LOS{" "}
            <span className="text-blue">11</span>
            {" "}DE SAMPA
          </h1>

          <p className="text-ink-2 text-lg leading-relaxed max-w-[420px]">
            Armá tu plantel del Mundial, elegí capitán y técnico, y competí
            con tus amigos durante las 8 fechas del torneo.
          </p>

          {/* Countdown */}
          <div>
            <Eyebrow className="mb-3">EL MUNDIAL ARRANCA EN</Eyebrow>
            <Countdown target={TOURNAMENT_START} />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <PrimaryButton href="/equipo">CREAR MI EQUIPO →</PrimaryButton>
            <Link
              href="/jugadores"
              className="text-sm font-semibold text-ink-2 hover:text-blue transition-colors"
            >
              Ver jugadores
            </Link>
          </div>
        </div>

        {/* Columna derecha: Sampa protagonista (figurita) */}
        <div className="flex justify-center md:justify-end">
          <div
            className="relative card-shadow-lg rounded-[8px] overflow-hidden rotate-[-1.5deg] hover:rotate-0 transition-transform duration-300"
            style={{ maxWidth: 320 }}
          >
            <Image
              src="/images/logo/logo-square-512.png"
              alt="Caricatura de Sampaoli — Los 11 de Sampa"
              width={512}
              height={512}
              className="w-full h-auto"
              priority
            />
            {/* Eyebrow tipo álbum Panini */}
            <div className="absolute bottom-0 inset-x-0 bg-blue px-4 py-2">
              <span className="font-display text-white text-sm leading-none tracking-wide">
                J. SAMPAOLI · DT · ARGENTINA
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section>
        <Eyebrow className="mb-4">CÓMO FUNCIONA</Eyebrow>
        {/* Grid asimétrico: primer card más ancho */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Feature
              icon={<Shirt size={24} strokeWidth={1.5} />}
              title="Armá tu plantel"
              text="15 jugadores dentro del presupuesto. Titulares, suplentes, formación, capitán y técnico."
            />
          </div>
          <Feature
            icon={<Calculator size={24} strokeWidth={1.5} />}
            title="Sumá puntos por fecha"
            text="Tus jugadores puntúan según su rendimiento real. Goles, asistencias, vallas, figura del partido."
          />
          <Feature
            icon={<Trophy size={24} strokeWidth={1.5} />}
            title="Competí en ligas"
            text="Creá ligas privadas y jugá contra tus amigos por el primer puesto durante las 8 fechas del Mundial."
          />
        </div>
      </section>
    </div>
  );
}
