import type { Metadata } from "next";
import Link from "next/link";
import { Shirt, Calculator, Users, Crown, ArrowLeftRight, Coins } from "lucide-react";
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
      <p className="mb-1.5 text-[11px] text-ink-3 sm:hidden">Deslizá para ver todas las posiciones →</p>
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
                  <span className="block text-[11px] font-normal text-ink-3">{r.note}</span>
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
          <strong>8 fechas</strong> del torneo (3 de grupos + 5 playoffs) y competís
          con tus amigos en tu liga.
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
              11 titulares y 4 suplentes. Si un titular no llega a jugar 20 minutos, entra{" "}
              <strong>automáticamente</strong> el primer suplente de su misma posición que sí haya
              jugado, y puntúa en su lugar (no tenés que hacer nada vos).
            </RuleItem>
            <RuleItem icon={<Users size={22} strokeWidth={1.5} />} title="Máximo 3 por país">
              No podés tener más de 3 jugadores de la misma selección durante la{" "}
              <strong>fase de grupos</strong>. Desde los <strong>16avos de final</strong> en
              adelante (playoffs) ese tope se libera. El técnico nunca cuenta para este límite.
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
              <strong>rating del partido (0 a 10, redondeado al entero más cercano)</strong>, siempre que haya jugado al menos{" "}
              <strong>20 minutos</strong> de tiempo reglamentario (90' o 120' si hay tiempo extra;
              el agregado no cuenta). Si jugó menos de 20', <strong>no suma absolutamente nada</strong>{" "}
              —ni el rating, ni goles, asistencias, tarjetas ni nada de lo que hizo en la cancha—:
              puntúa en su lugar el suplente de su misma posición que sí haya jugado ≥20'. Así tu
              equipo nunca suma más de 11 jugadores por fecha.
            </p>
            <p>
              A esa base se le suman (o restan) bonos según lo que hizo en la cancha. Los goles
              valen distinto según la posición: un gol de un arquero o un defensor vale mucho más
              que el de un delantero.
            </p>
          </div>

          <ValidationCallout type="success">
            El capitán <strong>duplica solo su puntaje base</strong> (el rating del partido), no
            los bonos por goles, asistencias ni la figura. Si no llega a jugar 20 minutos, ese
            bonus se <strong>pierde</strong> —no pasa al suplente que entra por él—, aunque el
            suplente sí puntúa normalmente en su lugar.
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
            Antes de cada fecha podés hacer 1 cambio gratis en tu plantel. Cada cambio extra
            cuesta <strong>1 pin</strong>, la moneda del juego que podés conseguir en la sección{" "}
            <Link href="/pines" className="font-semibold text-blue hover:underline">
              Pines
            </Link>
            . Si tenés el <strong>pack premium de cambios ilimitados</strong>, no pagás pines por
            los cambios extra.
          </RuleItem>
          <RuleItem icon={<Coins size={22} strokeWidth={1.5} />} title="Pines acumulables, cambio gratis no">
            Los pines son tuyos: si no los gastás en una fecha, quedan guardados para las
            siguientes (no vencen). El <strong>cambio gratis es distinto</strong>: es 1 por fecha y
            no se acumula — si no lo usás en una fecha, se pierde, no pasa a la siguiente.
          </RuleItem>
          <ValidationCallout type="success">
            Cuando armás tu equipo por primera vez (o todavía no jugaste ninguna fecha puntuable),
            los cambios son <strong>ilimitados y gratis</strong> hasta que arranque tu primera
            fecha. A partir de ahí entra a regir el esquema de 1 cambio gratis por fecha.
          </ValidationCallout>
          <ValidationCallout type="warning">
            Cada fecha se cierra cuando arranca su primer partido: el equipo que tenés en ese
            momento es el que suma los puntos de esa fecha. La ventana para los cambios de la
            fecha siguiente va <strong>desde que arranca una fecha hasta el primer partido de la
            siguiente</strong> — fijate el horario exacto en el armador.
          </ValidationCallout>
          <p className="text-sm leading-relaxed text-ink-3">
            Si no hacés cambios, no perdés nada: tu equipo se mantiene tal cual y sigue sumando
            fecha tras fecha. Los puntajes se publican una vez que termina cada fecha.
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
                  bonos por goles, asistencias, valla o figura se suman una sola vez. Y si el
                  capitán no llega a jugar 20 minutos, ese bonus de duplicación se{" "}
                  <strong>pierde</strong> —no se transfiere a nadie— aunque el suplente que entra
                  por él sí suma sus puntos normalmente.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="no-juega">
              <AccordionTrigger>¿Qué pasa si un jugador no juega?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Si un titular jugó menos de 20 minutos, entra <strong>automáticamente</strong> el
                  primer suplente de su misma posición que sí haya jugado, y puntúa en su lugar
                  (vos no hacés nada, es automático). El orden de tu banco define a quién le toca
                  primero. Si no hay un suplente válido de esa posición, el titular queda con 0. Por
                  eso conviene armar bien el banco y revisar tu equipo antes del cierre de la fecha.
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
                  cada cambio extra cuesta <strong>1 pin</strong>. Si comprás el pack premium de
                  cambios ilimitados, dejás de pagar pines por los cambios extra. Los pines que
                  comprás <strong>no vencen</strong>: si no los usás en una fecha, quedan
                  disponibles para las siguientes. El cambio gratis, en cambio, es por fecha y no
                  se acumula.
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
            <AccordionItem value="deadline">
              <AccordionTrigger>¿Hasta cuándo puedo cambiar mi equipo?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Cada fecha se cierra cuando arranca su primer partido: el equipo que tenés en ese
                  momento es el que suma los puntos de esa fecha. Apenas arranca, ya podés hacer los
                  cambios para la fecha siguiente (1 gratis, los extra con pines), y tenés tiempo
                  hasta el primer partido de esa fecha siguiente. El horario exacto del cierre lo
                  ves siempre en el armador.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sin-cambios">
              <AccordionTrigger>¿Qué pasa si no hago cambios entre fechas?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Nada malo: tu equipo se mantiene tal cual y sigue sumando puntos fecha tras
                  fecha. No hace falta volver a guardarlo. Eso sí, conviene revisarlo entre fecha y
                  fecha: si una selección quedó eliminada, sus jugadores ya no suman.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="llegue-tarde">
              <AccordionTrigger>Me sumo con el Mundial ya empezado, ¿desde cuándo sumo puntos?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Si armás tu equipo cuando una fecha ya está en juego, empezás a sumar desde la{" "}
                  <strong>fecha siguiente</strong> (la primera que todavía no arrancó). Por ejemplo,
                  si te registrás con la Fecha 1 ya iniciada, tu equipo compite desde la Fecha 2 en
                  adelante. El ranking es por puntos acumulados, así que cuanto antes entres, mejor.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="extra-penales">
              <AccordionTrigger>¿Cómo se cuentan el tiempo extra y los penales?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Lo que pasa en el tiempo suplementario cuenta normal (goles, asistencias,
                  tarjetas), porque es parte del partido. En cambio, los goles de la tanda de penales
                  (la definición) no suman como gol a tus jugadores, y la valla invicta se mira por
                  los goles en juego —90 minutos más tiempo extra—, no por la tanda. Para el técnico,
                  la selección que avanza por penales cuenta como que ganó (+2) y la que queda
                  afuera, como que perdió (−2).
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
