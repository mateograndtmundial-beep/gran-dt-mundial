import Link from "next/link";
import { Shirt, Calculator, Trophy } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { Card } from "@/components/ui";
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
    <Card>
      <div className="text-gold">{icon}</div>
      <h3 className="mt-2 font-bold">{title}</h3>
      <p className="mt-1 text-sm text-white/60">{text}</p>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-pitch-card to-pitch p-8 text-center md:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Mundial 2026</p>
        <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">
          Los <span className="text-gold">11</span> de Sampa
        </h1>
        <p className="mt-3 text-white/70">Armá tu equipo. Ganale a tus amigos.</p>
        <div className="mt-8 flex justify-center">
          <Countdown target={TOURNAMENT_START} />
        </div>
        <Link
          href="/equipo"
          className="mt-8 inline-block rounded-lg bg-gold px-6 py-3 font-bold text-pitch transition hover:brightness-110"
        >
          Crear mi equipo
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Feature
          icon={<Shirt />}
          title="Armá tu plantel"
          text="15 jugadores dentro del presupuesto y la formación. Elegí capitán y técnico."
        />
        <Feature
          icon={<Calculator />}
          title="Sumá puntos por fecha"
          text="Tus jugadores puntúan según su rendimiento real en el Mundial."
        />
        <Feature
          icon={<Trophy />}
          title="Competí en ligas"
          text="Creá ligas privadas y jugá contra tus amigos por el primer puesto."
        />
      </section>
    </div>
  );
}
