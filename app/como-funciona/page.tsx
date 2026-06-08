import type { Metadata } from "next";
import Link from "next/link";
import { Shirt, Calculator, Users, Crown, ArrowLeftRight } from "lucide-react";
import { Card, PageTitle } from "@/components/ui";
import {
  Eyebrow,
  SectionHeader,
  PositionChip,
  ValidationCallout,
  PrimaryButton,
  SecondaryButton,
} from "@/components/editorial";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { FORMATIONS } from "@/lib/game/config";

export const metadata: Metadata = {
  title: "¿Cómo funciona? · Los 11 de Sampa",
  description:
    "Cómo armar tu equipo, cómo se suman los puntos y cómo se juega Los 11 de Sampa durante el Mundial.",
};

/* ─── Datos de la tabla de puntajes (espejo de lib/game/config.ts SCORING) ─── */
type Row = { concept: string; note?: string; gk: string; def: string; mid: string; fwd: string };

const POSITIVES: Row[] = [
  { concept: "Gol de jugada", gk: "+12", def: "+9", mid: "+6", fwd: "+4" },
  { concept: "Gol de penal", gk: "+3", def: "+3", mid: "+3", fwd: "+3" },
  { concept: "Asistencia", gk: "+2", def: "+2", mid: "+2", fwd: "+2" },
  {
    concept: "Valla invicta",
    note: "jugó ≥ 20', sin goles en contra",
    gk: "+3",
    def: "+2",
    mid: "0",
    fwd: "0",
  },
  { concept: "Penal atajado", gk: "+4", def: "—", mid: "—", fwd: "—" },
  { concept: "Figura del partido", gk: "+4", def: "+4", mid: "+4", fwd: "+4" },
];

const NEGATIVES: Row[] = [
  {
    concept: "Gol recibido",
    note: "por gol, solo el arquero",
    gk: "−1",
    def: "—",
    mid: "—",
    fwd: "—",
  },
  { concept: "Tarjeta amarilla", gk: "−2", def: "−2", mid: "−2", fwd: "−2" },
  {
    concept: "Tarjeta roja",
    note: "anula las amarillas de ese partido",
    gk: "−4",
    def: "−4",
    mid: "−4",
    fwd: "−4",
  },
  { concept: "Gol en contra (own goal)", gk: "−2", def: "−2", mid: "−2", fwd: "−2" },
  { concept: "Penal errado", gk: "−4", def: "−4", mid: "−4", fwd: "−4" },
];

function ScoringTable({ rows }: { rows: Row[] }) {
  return (
    <div className="relative">
      {/* La tabla mide 420px de ancho mínimo (5 columnas) y en mobile no entra
          completa: agregamos una pista de que se puede deslizar + un degradé
          sobre el borde derecho para que no parezca que el contenido corta ahí. */}
      <p className="mb-1.5 text-[11px] text-ink-faint sm:hidden">Deslizá para ver todas las posiciones →</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-border text-center">
            <th className="py-2 pr-3 text-left">
              <span className="eyebrow">Concepto</span>
            </th>
            <th className="px-2 py-2">
              <PositionChip position="GK" />
            </th>
            <th className="px-2 py-2">
              <PositionChip position="DEF" />
            </th>
            <th className="px-2 py-2">
              <PositionChip position="MID" />
            </th>
            <th className="px-2 py-2">
              <PositionChip position="FWD" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.concept} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-3">
                <span className="font-semibold text-ink">{r.concept}</span>
                {r.note && (
                  <span className="block text-[11px] font-normal text-ink-faint">{r.note}</span>
                )}
              </td>
              <td className="px-2 text-center font-display text-base text-ink tabular-nums">{r.gk}</td>
              <td className="px-2 text-center font-display text-base text-ink tabular-nums">{r.def}</td>
              <td className="px-2 text-center font-display text-base text-ink tabular-nums">{r.mid}</td>
              <td className="px-2 text-center font-display text-base text-ink tabular-nums">{r.fwd}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent sm:hidden"
      />
    </div>
  );
}

function RuleItem({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-blue" aria-hidden>
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="text-sm leading-relaxed text-ink-3">{children}</p>
      </div>
    </div>
  );
}

const FORMACIONES = Object.keys(FORMATIONS);

export default function ComoFuncionaPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        title="¿Cómo funciona?"
        subtitle="Armás tu plantel del Mundial, elegís capitán y DT, y sumás puntos fecha a fecha por lo que pasa en la cancha real."
      />

      {/* ─── De qué va ─── */}
      <Card className="p-6">
        <Eyebrow className="mb-3">DE QUÉ VA</Eyebrow>
        <p className="max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Sos el DT. Armás un plantel de <strong>15 jugadores</strong> (11 titulares y 4
          suplentes) más un técnico, todo dentro de un presupuesto. Cada fecha tus jugadores
          puntúan según lo que hacen en sus partidos reales del Mundial: goles, asistencias,
          vallas invictas, la figura del partido. Sumás esos puntos durante las{" "}
          <strong>8 fechas</strong> del torneo y competís con tus amigos en tu liga.
        </p>
      </Card>

      {/* ─── Armar el equipo ─── */}
      <section>
        <SectionHeader title="ARMAR EL EQUIPO" />
        <Card className="space-y-6 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <RuleItem
              icon={<Calculator size={22} strokeWidth={1.5} />}
              title="Presupuesto: 700M"
            >
              Tenés 700M de presupuesto para repartir entre tus 15 jugadores y el técnico. Cada
              jugador tiene un precio según su valor de mercado.
            </RuleItem>
            <RuleItem icon={<Shirt size={22} strokeWidth={1.5} />} title="15 jugadores">
              11 titulares y 4 suplentes. Si un titular no juega, podés tenerlo cubierto desde
              el banco.
            </RuleItem>
            <RuleItem icon={<Users size={22} strokeWidth={1.5} />} title="Máximo 3 por país">
              No podés tener más de 3 jugadores de la misma selección. El técnico no cuenta para
              este límite.
            </RuleItem>
            <RuleItem icon={<Crown size={22} strokeWidth={1.5} />} title="Capitán y técnico">
              Elegí 1 capitán entre tus titulares (duplica su puntaje base) y 1 técnico, atado a
              una selección.
            </RuleItem>
          </div>

          <div>
            <Eyebrow className="mb-2">FORMACIONES VÁLIDAS</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {FORMACIONES.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center rounded-[4px] border border-border bg-surface-2 px-2.5 py-1 font-display text-sm tracking-wide text-ink"
                >
                  {f}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-3">
              Siempre con 1 arquero y 11 titulares en total. Podés cambiar de formación cuando
              quieras antes del cierre de la fecha.
            </p>
          </div>
        </Card>
      </section>

      {/* ─── Sistema de puntajes ─── */}
      <section>
        <SectionHeader title="SISTEMA DE PUNTAJES" />
        <Card className="space-y-6 p-6">
          <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
            <p>
              La base del puntaje de cada jugador es su{" "}
              <strong>rating del partido (0 a 10)</strong>, siempre que haya jugado al menos{" "}
              <strong>20 minutos</strong>. Si jugó menos, su base es 0 (pero igual puede sumar o
              restar por las acciones de abajo).
            </p>
            <p>
              A esa base se le suman (o restan) bonos según lo que hizo en la cancha. Los goles
              valen distinto según la posición: un gol de un arquero o un defensor vale mucho más
              que el de un delantero.
            </p>
          </div>

          <ValidationCallout type="success">
            El capitán <strong>duplica solo su puntaje base</strong> (el rating del partido), no
            los bonos por goles, asistencias ni la figura.
          </ValidationCallout>

          <div>
            <Eyebrow className="mb-3">SUMAN PUNTOS</Eyebrow>
            <ScoringTable rows={POSITIVES} />
          </div>

          <div>
            <Eyebrow className="mb-3">RESTAN PUNTOS</Eyebrow>
            <ScoringTable rows={NEGATIVES} />
          </div>

          <p className="text-sm leading-relaxed text-ink-3">
            Algunas aclaraciones: el <strong>gol de penal</strong> reemplaza al gol de jugada (no
            se suman los dos). La <strong>tarjeta roja</strong> resta −4 y anula las amarillas de
            ese partido. Los <strong>goles recibidos</strong> solo le restan al arquero.
          </p>

          <div className="rounded-[6px] border border-border bg-surface-2 p-4">
            <Eyebrow className="mb-1">EL TÉCNICO</Eyebrow>
            <p className="text-sm leading-relaxed text-ink-2">
              Tu DT suma <strong>+2 puntos</strong> si su selección gana, <strong>−2</strong> si
              pierde y <strong>0</strong> si empata.
            </p>
          </div>
        </Card>
      </section>

      {/* ─── Cambios y pines ─── */}
      <section>
        <SectionHeader title="CAMBIOS Y PINES" />
        <Card className="space-y-4 p-6">
          <RuleItem
            icon={<ArrowLeftRight size={22} strokeWidth={1.5} />}
            title="1 cambio libre por fecha"
          >
            Antes de cada fecha podés hacer 1 cambio gratis en tu plantel. Los cambios extra
            cuestan <strong>pines</strong>, la moneda del juego que podés conseguir en la sección{" "}
            <Link href="/pines" className="font-semibold text-blue hover:underline">
              Pines
            </Link>
            .
          </RuleItem>
          <p className="text-sm leading-relaxed text-ink-3">
            Cada fecha tiene una hora de cierre (deadline): a partir de ahí tu equipo queda
            bloqueado para esa fecha. Los puntajes se publican una vez que termina la fecha.
          </p>
        </Card>
      </section>

      {/* ─── FAQ ─── */}
      <section>
        <SectionHeader title="PREGUNTAS FRECUENTES" />
        <Card className="px-6 py-2">
          <Accordion>
            <AccordionItem value="puntos">
              <AccordionTrigger>¿Cuándo se actualizan los puntos?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Los puntajes se calculan y publican cuando termina cada fecha, en base a las
                  estadísticas reales de los partidos. Hasta ese momento ves tu equipo, pero no el
                  puntaje final de la fecha.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="capitan">
              <AccordionTrigger>¿El capitán duplica todos los puntos?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  No. El capitán duplica únicamente su puntaje base (el rating del partido). Los
                  bonos por goles, asistencias, valla o figura se suman una sola vez.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="no-juega">
              <AccordionTrigger>¿Qué pasa si un jugador no juega?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Si jugó menos de 20 minutos, su puntaje base es 0. Por eso conviene tener buenos
                  suplentes y revisar tu equipo antes del cierre de la fecha.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="formacion">
              <AccordionTrigger>¿Puedo cambiar de formación?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Sí, podés cambiar de formación todas las veces que quieras antes de que cierre
                  la fecha. Mover entre formaciones no consume tu cambio libre; eso es para entrar
                  y salir jugadores del plantel.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pines">
              <AccordionTrigger>¿Para qué sirven los pines?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Tenés 1 cambio gratis por fecha. Si querés hacer más cambios en una misma fecha,
                  cada cambio extra se paga con pines.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ligas">
              <AccordionTrigger>¿Cómo compito con mis amigos?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Creás o te sumás a una liga con un código y compiten por el acumulado de las 8
                  fechas. También hay un ranking general con todos los DTs.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </section>

      {/* ─── Soporte ─── */}
      <section>
        <SectionHeader title="¿TE QUEDÓ UNA DUDA?" />
        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">¿Necesitás ayuda?</p>
            <p className="text-sm leading-relaxed text-ink-3">
              Escribinos y te damos una mano con tu cuenta, los pagos o el juego. También podés
              leer nuestra{" "}
              <Link href="/privacidad" className="font-semibold text-blue hover:underline">
                política de privacidad
              </Link>
              .
            </p>
          </div>
          <SecondaryButton href="/soporte" className="shrink-0">
            Ir a Soporte →
          </SecondaryButton>
        </Card>
      </section>

      {/* ─── CTA ─── */}
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
        <Link
          href="/jugadores"
          className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
        >
          Ver jugadores
        </Link>
      </div>
    </div>
  );
}
