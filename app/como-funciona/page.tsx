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
import { isTournamentFinished } from "@/lib/queries";
import {
  FORMATIONS,
  POSITION_COLORS,
  POSITION_BG,
  POSITION_ABBR,
  type Position,
} from "@/lib/game/config";

// La página lee `isTournamentFinished()` para pasar a modo "referencia" cuando el
// Mundial termina, así que no puede prerenderarse de una vez para siempre. El
// `revalidate` es el techo de staleness; en la práctica el flip entra antes, porque
// la query está cacheada con el tag `leaderboard` que publicarFecha invalida.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "¿Cómo funciona? · Los 11 de Sampa",
  description:
    "Cómo se arma el equipo, cómo se suman los puntos y cómo se juega Los 11 de Sampa durante el Mundial.",
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

/* Orden de posiciones y de qué campo de la fila sale cada valor. */
const POS_ORDER: { pos: Position; key: keyof Pick<Row, "gk" | "def" | "mid" | "fwd"> }[] = [
  { pos: "GK", key: "gk" },
  { pos: "DEF", key: "def" },
  { pos: "MID", key: "mid" },
  { pos: "FWD", key: "fwd" },
];

/* Pin de valor por posición (mobile): chip de color Panini + el puntaje. */
function ValuePill({ pos, value }: { pos: Position; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-[4px] px-1 py-0.5 text-[11px] font-bold tabular-nums"
      style={{ color: POSITION_COLORS[pos], backgroundColor: POSITION_BG[pos] }}
    >
      <span className="opacity-70">{POSITION_ABBR[pos]}</span>
      {value}
    </span>
  );
}

/* Vista mobile de una fila: solo las posiciones que puntúan (saltea "—" y "0").
   Si las 4 posiciones valen lo mismo, lo colapsa en un único "Todas". */
function ScoringRowMobile({ row }: { row: Row }) {
  const scoring = POS_ORDER.map((p) => ({ pos: p.pos, value: row[p.key] })).filter(
    (e) => e.value !== "—" && e.value !== "0",
  );
  const allFour =
    scoring.length === 4 && scoring.every((e) => e.value === scoring[0].value);

  return (
    <div className="rounded-[6px] border border-border bg-surface-2/40 p-2.5">
      <span className="block text-[13px] font-semibold leading-tight text-ink">{row.concept}</span>
      {row.note && <span className="mt-0.5 block text-[10px] leading-tight text-ink-3">{row.note}</span>}
      <div className="mt-1.5 grid grid-cols-2 justify-items-start gap-1">
        {allFour ? (
          <span className="col-span-2 inline-flex items-center gap-1 rounded-[4px] border border-border bg-surface px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink">
            <span className="text-ink-3">Todas</span>
            {scoring[0].value}
          </span>
        ) : (
          scoring.map((e) => <ValuePill key={e.pos} pos={e.pos} value={e.value} />)
        )}
      </div>
    </div>
  );
}

function ScoringTable({ rows }: { rows: Row[] }) {
  return (
    <>
      {/* Mobile: grilla 2-up de mini-tarjetas — compacta y sin scroll horizontal. */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        {rows.map((r) => (
          <ScoringRowMobile key={r.concept} row={r} />
        ))}
      </div>

      {/* Desktop: tabla clásica (sobra el ancho, no necesita scroll). */}
      <table className="hidden w-full border-collapse text-sm sm:table">
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
    </>
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

export default async function ComoFuncionaPage() {
  let finished = false;
  try {
    finished = await isTournamentFinished();
  } catch {
    // sin DB: la página se lee como "en juego" (fallback seguro)
  }

  return (
    <div className="space-y-10">
      <PageTitle
        title="¿Cómo funciona?"
        subtitle="Armás tu plantel del Mundial, elegís capitán y DT, y sumás puntos fecha a fecha por lo que pasa en la cancha real."
      />

      {/* Con el torneo terminado, todo lo que sigue es referencia histórica: lo
          aclaramos arriba de todo para que nadie intente armar equipo. */}
      {finished && (
        <ValidationCallout type="warning">
          El Mundial 2026 terminó y con él esta edición del juego: ya no se arman equipos ni se
          hacen cambios. Lo que sigue queda como referencia de cómo se jugó. El ranking final está
          en{" "}
          <Link href="/ranking" className="font-semibold text-blue hover:underline">
            Ranking
          </Link>
          .
        </ValidationCallout>
      )}

      {/* ─── De qué va ─── */}
      <Card className="p-6">
        <Eyebrow className="mb-3">DE QUÉ VA</Eyebrow>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Sos el DT. Armás un plantel de <strong>15 jugadores</strong> (11 titulares y 4
          suplentes) más un técnico, dentro de un presupuesto. Cada fecha tus jugadores puntúan por
          lo que hacen en sus partidos reales del Mundial —goles, asistencias, vallas, figura— a lo
          largo de las <strong>8 fechas</strong> (3 de grupos + 5 playoffs), y competís con tus
          amigos en tu liga.
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
              11 titulares y 4 suplentes. Si un titular no juega 20 minutos, entra{" "}
              <strong>automáticamente</strong> el suplente de su misma posición que sí jugó, y
              puntúa por él.
            </RuleItem>
            <RuleItem icon={<Users size={22} strokeWidth={1.5} />} title="Máximo por país">
              En la <strong>fase de grupos</strong> no podés tener más de{" "}
              <strong>3 jugadores</strong> de la misma selección. Desde los{" "}
              <strong>16avos de final</strong> en adelante (playoffs) el tope pasa a{" "}
              <strong>5 por país</strong>. El técnico nunca cuenta para este límite.
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
              La base de cada jugador es su{" "}
              <strong>rating del partido</strong> (0 a 10, redondeado al entero), siempre que juegue{" "}
              <strong>al menos 20 minutos</strong> de tiempo reglamentario (90' o 120' con tiempo
              extra; el agregado no cuenta). Si jugó menos, <strong>no suma nada</strong> —ni rating
              ni bonos— y puntúa en su lugar el suplente de su misma posición que sí jugó ≥20'. Así
              nunca sumás más de 11 jugadores por fecha.
            </p>
            <p>
              A esa base se le suman o restan bonos. Los goles valen distinto según la posición: el
              de un arquero o un defensor vale más que el de un delantero.
            </p>
          </div>

          <ValidationCallout type="success">
            El capitán <strong>duplica solo su puntaje base</strong> (el rating), no los bonos. Si
            no juega 20 minutos, ese duplicado se <strong>pierde</strong> (no pasa al suplente),
            aunque el suplente sí puntúa normal.
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

          <p className="text-sm leading-relaxed text-ink-3">
            Todos los datos deportivos (resultados, minutos, goles, ratings y figura del partido)
            los provee{" "}
            <a
              href="https://www.api-football.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue hover:underline"
            >
              API-Football
            </a>
            ; el organizador no los modifica.
          </p>
        </Card>
      </section>

      {/* ─── Cambios y pines ─── */}
      <section>
        <SectionHeader title="CAMBIOS Y PINES" />
        <Card className="space-y-4 p-6">
          <RuleItem
            icon={<ArrowLeftRight size={22} strokeWidth={1.5} />}
            title="Cambios libres por fecha"
          >
            En fase de grupos tenés <strong>1 cambio gratis</strong> por fecha. Desde los{" "}
            <strong>8vos de Final</strong> pasan a ser <strong>2 cambios gratis</strong> por fecha
            (para todos), para acompañar a los equipos con jugadores eliminados. Cada cambio extra
            cuesta <strong>1 pin</strong>, la moneda del juego (sección{" "}
            <Link href="/pines" className="font-semibold text-blue hover:underline">
              Pines
            </Link>
            ). Con el <strong>pack premium de cambios ilimitados</strong> no pagás pines por los
            extra.
          </RuleItem>
          <RuleItem icon={<Coins size={22} strokeWidth={1.5} />} title="Pines acumulables, cambios gratis no">
            Los pines <strong>no vencen</strong>: si no los gastás, quedan para las siguientes
            fechas. Los <strong>cambios gratis no se acumulan</strong>: son por fecha y si no los
            usás, se pierden.
          </RuleItem>
          {/* Instrucciones operativas: con el torneo terminado ya no aplican (no hay
              fecha que cierre ni cambios que hacer), así que se ocultan. */}
          {!finished && (
            <>
              <ValidationCallout type="success">
                Al armar tu equipo por primera vez (o si todavía no jugaste una fecha puntuable), los
                cambios son <strong>ilimitados y gratis</strong> hasta que arranque tu primera fecha.
              </ValidationCallout>
              <ValidationCallout type="warning">
                Cada fecha cierra cuando arranca su primer partido: el equipo que tengas en ese momento
                es el que puntúa. La ventana de cambios para la fecha siguiente va desde que arranca una
                fecha hasta el primer partido de la próxima — el horario exacto está en el armador.
              </ValidationCallout>
              <p className="text-sm leading-relaxed text-ink-3">
                Si no hacés cambios no perdés nada: tu equipo sigue sumando fecha tras fecha. Los
                puntajes se publican al terminar cada fecha.
              </p>
            </>
          )}
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
                  Al terminar cada fecha, con las estadísticas reales de los partidos. Hasta
                  entonces ves tu equipo, pero no el puntaje final de la fecha.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="capitan">
              <AccordionTrigger>¿El capitán duplica todos los puntos?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  No: duplica solo su puntaje base (el rating). Los bonos (goles, asistencias,
                  valla, figura) suman una vez. Si no juega 20 minutos, el duplicado se{" "}
                  <strong>pierde</strong>, pero el suplente que entra sí puntúa.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="no-juega">
              <AccordionTrigger>¿Qué pasa si un jugador no juega?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Entra <strong>automáticamente</strong> el primer suplente de su misma posición que
                  sí haya jugado, y puntúa en su lugar. El orden de tu banco define la prioridad. Si
                  no hay suplente válido de esa posición, el titular queda en 0 — por eso conviene
                  armar bien el banco.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="formacion">
              <AccordionTrigger>¿Puedo cambiar de formación?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Sí, las veces que quieras antes del cierre. Cambiar de formación no consume tu
                  cambio libre; eso es para entrar y sacar jugadores del plantel.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="capitan-dt">
              <AccordionTrigger>¿Cambiar de capitán o técnico gasta un cambio?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  No. Cambiar de capitán, técnico o formación es gratis y no consume tu cambio
                  libre: solo cuenta como cambio entrar o sacar jugadores del plantel.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pines">
              <AccordionTrigger>¿Para qué sirven los pines?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Para hacer más de 1 cambio por fecha: cada cambio extra cuesta <strong>1 pin</strong>{" "}
                  (o nada, con el pack de cambios ilimitados). Los pines <strong>no vencen</strong>;
                  el cambio gratis no se acumula.
                  {finished && (
                    <>
                      {" "}
                      Con el Mundial ya terminado no se pueden usar más: en{" "}
                      <Link href="/pines" className="font-semibold text-blue hover:underline">
                        Pines
                      </Link>{" "}
                      queda tu saldo a la vista.
                    </>
                  )}
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cuesta-dinero">
              <AccordionTrigger>¿Cuesta dinero jugar?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  No, jugar es <strong>gratis</strong>. Los pines son opcionales: solo los necesitás
                  para hacer más de 1 cambio por fecha, y se compran con dinero real (o conseguís el
                  pack premium de cambios ilimitados). Sin gastar un peso competís igual en el
                  ranking y en tus ligas.
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
                  Cada fecha cierra al arrancar su primer partido. Apenas arranca, ya podés hacer
                  cambios para la siguiente (1 gratis en grupos, 2 desde los 8vos; los extra con
                  pines) hasta su primer partido. El horario exacto está en el armador.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sin-cambios">
              <AccordionTrigger>¿Qué pasa si no hago cambios entre fechas?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Nada: tu equipo se mantiene y sigue sumando, no hace falta volver a guardarlo.
                  Conviene revisarlo igual: si una selección quedó eliminada, sus jugadores ya no
                  suman.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="eliminada">
              <AccordionTrigger>¿Qué pasa si una de mis selecciones queda eliminada?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  Sus jugadores dejan de sumar desde que quedan afuera. Podés reemplazarlos con los
                  cambios gratis de la fecha (los extra con pines). Justo para acompañar las
                  eliminaciones, desde los <strong>8vos de Final</strong> los cambios gratis pasan de
                  1 a <strong>2 por fecha</strong>. Además, desde los 16avos el tope sube a{" "}
                  <strong>5 jugadores por país</strong>, así que tenés más margen para rearmar con
                  las selecciones que siguen en carrera.
                </p>
              </AccordionContent>
            </AccordionItem>
            {/* Obsoleta con el torneo terminado: ya no hay "fecha siguiente" a la que sumarse. */}
            {!finished && (
              <AccordionItem value="llegue-tarde">
                <AccordionTrigger>Me sumo con el Mundial ya empezado, ¿desde cuándo sumo puntos?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-ink-2">
                    Empezás a sumar desde la <strong>fecha siguiente</strong> (la primera que todavía
                    no arrancó): si entrás con la Fecha 1 en juego, competís desde la Fecha 2. Como el
                    ranking es por acumulado, cuanto antes entres, mejor.
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="extra-penales">
              <AccordionTrigger>¿Cómo se cuentan el tiempo extra y los penales?</AccordionTrigger>
              <AccordionContent>
                <p className="text-ink-2">
                  El tiempo suplementario cuenta normal (es parte del partido). Los goles de la
                  tanda de penales no suman como gol, y la valla invicta se mira por los goles en
                  juego (90' más tiempo extra), no por la tanda. Para el técnico, quien avanza por
                  penales cuenta como ganador (+2) y quien queda afuera, como perdedor (−2).
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
        {finished ? (
          <PrimaryButton href="/ranking">VER EL RANKING FINAL →</PrimaryButton>
        ) : (
          <PrimaryButton href="/equipo">ARMAR MI EQUIPO →</PrimaryButton>
        )}
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
