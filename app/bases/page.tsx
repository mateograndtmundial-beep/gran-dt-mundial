import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageTitle, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bases y Condiciones · Liga Premium · Los 11 de Sampa",
  description:
    "Bases y Condiciones de la Liga Premium de Los 11 de Sampa: reglas del juego, cambios, entrada, premio garantizado, distribución, desempate y entrega del premio.",
};

const UPDATED = "20 de junio de 2026";

const PRIZES: [string, string, string][] = [
  ["1°", "30%", "$120.000"],
  ["2°", "18%", "$72.000"],
  ["3°", "12%", "$48.000"],
  ["4°", "9%", "$36.000"],
  ["5°", "7%", "$28.000"],
  ["6°", "6%", "$24.000"],
  ["7°", "5,25%", "$21.000"],
  ["8°", "4,75%", "$19.000"],
  ["9°", "4,25%", "$17.000"],
  ["10°", "3,75%", "$15.000"],
];

function Mailto() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-blue hover:underline">
      {SITE.contactEmail}
    </a>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-2.5">
      <h2 className="font-display text-2xl leading-none tracking-tight text-ink">{title}</h2>
      <div className="space-y-2.5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function BasesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageTitle
        title="Bases y Condiciones — Liga Premium"
        subtitle="Reglas del juego, cambios, entrada, premio garantizado, distribución, desempate y entrega del premio."
      />
      <Eyebrow>Última actualización · {UPDATED}</Eyebrow>

      <Card className="space-y-7 p-6 sm:p-7">
        <Section title="Organizador">
          <p>
            La <strong>Liga Premium</strong> es una competencia organizada por {SITE.name}{" "}
            (los11desampa.com), dentro del juego de fantasy football del Mundial 2026. Consultas y
            soporte: por nuestro <Link href="/soporte" className="font-semibold text-blue hover:underline">canal de soporte</Link>{" "}
            (Instagram {SITE.instagram.handle} y email <Mailto />).
          </p>
        </Section>

        <Section title="Quién puede participar">
          <p>
            Personas <strong>mayores de 18 años</strong> con una cuenta válida en {SITE.name}.
            (El juego en general es apto desde los 13 años, pero la Liga Premium —al involucrar un
            pago y un premio en dinero— es <strong>solo para mayores de 18</strong>.) Un (1) equipo
            y <strong>una (1) inscripción por persona</strong>: la Liga Premium se juega con el{" "}
            <strong>mismo equipo</strong> del juego, no con un equipo nuevo. No participan los
            organizadores ni personas vinculadas a la administración del juego.
          </p>
          <p>
            Sos responsable de la seguridad de tu cuenta y del correo registrado en ella: con ese
            correo se valida tu identidad para entregar el premio (ver{" "}
            <strong>Entrega del premio</strong>). No compartas tus credenciales.
          </p>
        </Section>

        <Section title="El equipo y las reglas del juego">
          <p>
            La Liga Premium <strong>no cambia las reglas del juego</strong>: se compite con el mismo
            equipo y bajo las mismas reglas que el resto del torneo.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Plantel:</strong> 15 jugadores (<strong>11 titulares + 4 suplentes</strong>)
              más <strong>1 director técnico</strong>, dentro de un <strong>presupuesto de 700</strong>.
            </li>
            <li>
              <strong>Capitán:</strong> uno de tus titulares; <strong>duplica su puntaje base</strong>{" "}
              (no los bonos).
            </li>
            <li>
              <strong>Jugadores por país:</strong> máximo <strong>3 por país</strong> en la fase de
              grupos y <strong>5 por país desde los 16vos de final</strong>. Es una regla general del
              juego (para todos los usuarios); como la Liga Premium se juega desde 16vos, el tope que
              aplica es <strong>5 por país</strong>.
            </li>
            <li>
              <strong>Suplentes (auto-sustitución):</strong> si un titular no juega el mínimo de
              minutos (20'), puntúa automáticamente en su lugar un suplente de su misma posición que
              sí haya jugado.
            </li>
            <li>
              <strong>Si no editás una fecha, tu equipo se mantiene:</strong> la última alineación
              que hayas guardado sigue puntuando en las fechas siguientes hasta que la cambies. No
              hace falta volver a armar el equipo cada fecha.
            </li>
            <li>
              <strong>Jugadores eliminados o que no juegan:</strong> un jugador cuya selección quedó
              eliminada (o que no es convocado/juega) simplemente no suma esa fecha; la
              auto-sustitución cubre la ausencia con un suplente. Gestionar tu plantel y reemplazar
              a esos jugadores es tu responsabilidad (con tus cambios de la fecha).
            </li>
            <li>
              <strong>Puntaje:</strong> los puntos salen del rendimiento real de cada jugador en cada
              partido, según la tabla de puntaje del juego (ver{" "}
              <Link href="/como-funciona" className="font-semibold text-blue hover:underline">Cómo funciona</Link>,
              que forma parte de estas bases).
            </li>
          </ul>
        </Section>

        <Section title="Cambios entre fechas">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Tu primer equipo es gratis:</strong> la primera fecha en la que armás tu
              equipo, lo podés editar <strong>cuanto quieras, sin costo</strong> (no se cuenta ningún
              cambio mientras no hayas guardado una fecha posterior).
            </li>
            <li>
              <strong>De ahí en más, cambios gratis por fecha:</strong> a partir de tener una fecha
              anterior guardada, cada fecha tenés cambios gratis respecto de esa alineación:{" "}
              <strong>1 en fase de grupos</strong> y <strong>2 desde los 8vos de final</strong> (para
              todos los usuarios, para acompañar a los equipos con jugadores eliminados). Los cambios{" "}
              <strong>adicionales</strong> cuestan <strong>pines</strong>.
            </li>
            <li>
              <strong>Los cambios gratis NO se acumulan:</strong> son por fecha y se reinician al
              arrancar cada una. El cambio gratis que no uses una fecha <strong>se pierde</strong>{" "}
              (no se traslada a la siguiente).
            </li>
            <li>
              <strong>Los pines SÍ se acumulan:</strong> tu saldo de pines persiste entre fechas, no
              se reinicia ni vence mientras tu cuenta esté activa. Lo que no gastás queda disponible
              para más adelante (ver <Link href="/bases#pines" className="font-semibold text-blue hover:underline">Pines</Link>).
            </li>
            <li>
              <strong>Beneficio Liga Premium (solo en 16vos):</strong> en los{" "}
              <strong>16vos de final</strong>, los <strong>inscriptos</strong> en la Liga Premium
              reciben <strong>5 cambios gratis</strong> esa fecha (en lugar de 1), para emparejar a
              cuentas nuevas y veteranas que entran a la Copa. Es un beneficio{" "}
              <strong>exclusivo de los inscriptos</strong> y <strong>solo</strong> en esa fecha; el
              resto de los usuarios (y los inscriptos en las demás fechas) tiene su 1 cambio gratis
              habitual.
            </li>
          </ul>
          <p className="pt-1">
            <strong>Si entrás a la Copa ya empezado el torneo:</strong>
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Si <strong>ya tenías equipo armado</strong> de una fecha anterior (por ejemplo, lo
              armaste en la Fecha 2), llegás a los 16vos con tus <strong>5 cambios gratis</strong> de
              Copa, igual que todos los usuarios de la Liga Premium.
            </li>
            <li>
              Si <strong>recién armás tu equipo para sumar desde 16vos</strong> (por ejemplo, entrás
              en la Fecha 3 y ese es tu primer equipo), tenés <strong>cambios ilimitados y gratis
              hasta que arranquen los 16vos</strong>: partís de cero y recién ahí empieza a contar tu
              alineación. De los <strong>8vos en adelante</strong>, tenés{" "}
              <strong>2 cambios gratis por fecha</strong> (no acumulables), como todos.
            </li>
          </ul>
        </Section>

        <Section title="Mecánica de la Liga Premium">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Entrada:</strong> $5.000 ARS por usuario, por Mercado Pago (en el checkout
              figura como "GOLDEN TICKET"). La inscripción se confirma automáticamente al acreditarse
              el pago.
            </li>
            <li>
              <strong>Cupo:</strong> 100 participantes por copa. Al completarse, se cierra y se
              habilita una 2da copa idéntica. Si no quedan cupos, podés comunicarte a través del
              Instagram oficial para demostrar interés en una 3ra Liga Premium (a criterio del
              organizador).
            </li>
            <li>
              <strong>Ranking:</strong> la Liga Premium puntúa desde los <strong>16vos de final</strong>{" "}
              en adelante (la fase de grupos no cuenta).
            </li>
            <li>
              <strong>Cierre de inscripción:</strong> al completarse el cupo de 100 o al llegar el
              kickoff de los 16vos de final, lo que ocurra primero.
            </li>
          </ul>
        </Section>

        <Section title="Pines" id="pines">
          <p>
            Los <strong>pines</strong> son la unidad interna del juego que se usa para hacer{" "}
            <strong>cambios extra</strong> de jugadores en una fecha (más allá del cambio gratis).
            No son obligatorios para jugar ni para competir en la Liga Premium.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>No son dinero:</strong> no tienen valor fuera del juego, <strong>no se
              convierten a efectivo</strong> ni se canjean por dinero, y <strong>no son
              transferibles</strong> a otra cuenta o usuario.
            </li>
            <li>
              <strong>La entrada a la Copa no incluye pines:</strong> la inscripción ("GOLDEN
              TICKET") y la compra de pines son <strong>operaciones separadas</strong>.
            </li>
            <li>
              <strong>No vencen</strong> mientras tu cuenta esté activa; tu saldo se acumula entre
              fechas. Si se cierra o elimina la cuenta, el saldo de pines se pierde.
            </li>
            <li>
              El saldo y cada movimiento (compra, gasto en cambios, reintegros) quedan registrados
              en tu cuenta. Los cambios y su costo se calculan y validan siempre del lado del
              servidor.
            </li>
          </ul>
          <p>
            Reembolsos de compras de pines: ver <strong>Arrepentimiento y reembolsos</strong>.
          </p>
        </Section>

        <Section title="Premio">
          <p>
            <strong>Premio fijo garantizado de $400.000 ARS</strong>, aportado por el organizador
            (no es un pozo: se reparte sí o sí). Se distribuye entre los <strong>10 primeros</strong>{" "}
            del ranking final:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-3">
                <tr>
                  <th className="py-1 pr-4">Puesto</th>
                  <th className="py-1 pr-4">%</th>
                  <th className="py-1">Premio</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {PRIZES.map(([pos, pct, amount]) => (
                  <tr key={pos} className="border-t border-border">
                    <td className="py-1 pr-4 font-semibold">{pos}</td>
                    <td className="py-1 pr-4">{pct}</td>
                    <td className="py-1">{amount}</td>
                  </tr>
                ))}
                <tr className="border-t border-border-strong font-semibold">
                  <td className="py-1 pr-4">Total</td>
                  <td className="py-1 pr-4">100%</td>
                  <td className="py-1">$400.000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Desempate">
          <p>A igualdad de puntos totales, el orden se define por:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Mejor puntaje obtenido en una sola fecha dentro de la Liga Premium (de 16vos en adelante).</li>
            <li>Si persiste el empate, la inscripción más temprana (orden de pago).</li>
          </ol>
        </Section>

        <Section title="Momento de corte del ranking">
          <p>
            El ranking se considera final y oficial una vez <strong>publicados los puntos de la
            Final</strong> del Mundial. Ese estado determina los 10 premiados; sincronizaciones
            posteriores no alteran el resultado ya congelado.
          </p>
        </Section>

        <Section title="Datos, puntajes y decisiones del organizador">
          <p>
            <strong>Todos los datos deportivos vienen de un proveedor externo independiente:{" "}
            <a href="https://www.api-football.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue hover:underline">API-Football</a>{" "}
            (api-football.com).</strong> De ahí salen los resultados y marcadores, los minutos
            jugados, los goles, asistencias, tarjetas, atajadas, la valla invicta, el{" "}
            <strong>rating de cada jugador</strong> y la <strong>figura del partido</strong>. El
            rating lo calcula el propio proveedor a partir del rendimiento real en la cancha, y es
            el <strong>insumo base</strong> de nuestra tabla de puntaje (ver{" "}
            <Link href="/como-funciona" className="font-semibold text-blue hover:underline">Cómo funciona</Link>).
          </p>
          <p>
            <strong>El organizador NO modifica los datos reportados por el proveedor.</strong> No
            cambiamos ratings, goles, minutos ni ninguna estadística: lo que API-Football reporta es
            lo que entra al cálculo. Nuestro rol se limita a <strong>sincronizar</strong> (bajar los
            datos del proveedor) y <strong>publicar</strong> los puntos de cada fecha, aplicando la
            tabla de puntaje y las reglas del juego (auto-sustitución, capitán, técnico) de forma
            automática e igual para todos.
          </p>
          <p>
            Si el proveedor corrige un dato (por ejemplo, ajusta un rating o un gol después del
            partido), volvemos a sincronizar para reflejar esa corrección; y podemos corregir{" "}
            <strong>errores propios de carga</strong> hasta el corte oficial del ranking (ver{" "}
            <strong>Momento de corte del ranking</strong>). En ningún caso alteramos la estadística
            de origen. Estas correcciones de buena fe no generan derecho a reclamo.
          </p>
          <p>
            <strong>Puntos provisorios vs. oficiales:</strong> mientras una fecha no está publicada,
            los puntos que veas son <strong>provisorios</strong> y pueden ajustarse al sincronizar
            (datos que el proveedor completa o corrige tras el partido). El puntaje queda firme
            recién al <strong>publicarse</strong> la fecha.
          </p>
          <p>
            La <strong>definición de la figura del partido</strong> ante empates de rating, la
            resolución de empates en el ranking y la interpretación de estas bases quedan a cargo del
            organizador.
          </p>
        </Section>

        <Section title="Suspensión o cambios del torneo">
          <p>
            Si el Mundial o alguno de sus partidos se suspenden, reprograman o cancelan por causas
            ajenas al organizador (decisiones de FIFA, fuerza mayor, etc.), la Liga Premium se adecúa
            de forma razonable a la nueva situación. Si resultara imposible determinar un ranking
            final por esas causas, el organizador podrá definir una alternativa equitativa.
          </p>
        </Section>

        <Section title="Arrepentimiento y reembolsos">
          <p>
            Tenés un <strong>derecho de arrepentimiento de 10 días corridos</strong> desde la compra
            (art. 34 de la Ley 24.240 y Res. SCI 424/2020), tanto para la entrada a la Copa como para
            las compras de pines, con los siguientes alcances:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Entrada a la Copa:</strong> te reembolsamos el 100% si te arrepentís{" "}
              <strong>antes de que la Copa empiece a jugarse</strong> (kickoff de los 16vos de
              final), porque hasta ese momento el servicio —competir— todavía no comenzó a prestarse.
              Una vez <strong>iniciada la competencia</strong>, el derecho de arrepentimiento{" "}
              <strong>ya no aplica</strong> (excepción del art. 1116 del Código Civil y Comercial,
              para servicios cuya ejecución ya empezó con tu conformidad). Es decir: no se puede
              competir y luego pedir el reintegro por ir perdiendo.
            </li>
            <li>
              <strong>Pines:</strong> te reembolsamos los pines <strong>no utilizados</strong> dentro
              de los 10 días. Los pines que ya gastaste (contenido digital ya consumido con tu
              conformidad) no son reintegrables.
            </li>
            <li>
              <strong>Pago sin lugar (cupo lleno):</strong> si abonás la entrada pero{" "}
              <strong>no entrás por falta de cupo</strong> (por ejemplo, dos pagos simultáneos por el
              último lugar) o por haberse cerrado la inscripción, te{" "}
              <strong>reembolsamos</strong> el importe completo, sin importar el plazo.
            </li>
          </ul>
          <p>
            Los reembolsos se procesan por el mismo medio de pago (Mercado Pago). Para ejercer el
            arrepentimiento, escribinos por nuestro{" "}
            <Link href="/soporte" className="font-semibold text-blue hover:underline">canal de soporte</Link>{" "}
            (Instagram {SITE.instagram.handle} o email <Mailto />).
          </p>
        </Section>

        <Section title="Entrega del premio">
          <p>
            Los ganadores se publican en Instagram y se notifican por email. El premio se paga por{" "}
            <strong>transferencia bancaria</strong> a un <strong>CBU/ALIAS de una cuenta bancaria
            argentina</strong> a nombre del ganador (no se paga a cuentas del exterior ni por otros
            medios). Para cobrar, deberás comunicarte con el organizador dentro de la ventana de
            reclamo y <strong>acreditar tu identidad</strong>: se te pedirá demostrar acceso al{" "}
            <strong>correo registrado en tu cuenta</strong> para confirmar que sos el titular.
          </p>
        </Section>

        <Section title="Privacidad y uso de imagen">
          <p>
            Al inscribirte aceptás que, en caso de resultar ganador, se publique tu nombre de usuario
            (y/o nombre) en las redes y comunicaciones del juego para anunciar resultados. El
            tratamiento general de tus datos se rige por la{" "}
            <Link href="/privacidad" className="font-semibold text-blue hover:underline">Política de Privacidad</Link>.
          </p>
        </Section>

        <Section title="Conducta">
          <p>
            El organizador podrá descalificar cuentas que incurran en fraude, multicuenta o cualquier
            maniobra que vulnere la mecánica del juego o estas bases. Una cuenta descalificada pierde
            el derecho al premio.
          </p>
        </Section>

        <Section title="Modificación de las bases">
          <p>
            El organizador podrá actualizar estas bases (por ejemplo, para aclarar reglas o corregir
            errores); los cambios se publican en esta página con su fecha de última actualización. No
            se modifican de forma retroactiva y en tu perjuicio las condiciones esenciales (entrada,
            premio y distribución) de una copa ya iniciada.
          </p>
        </Section>

        <Section title="No afiliación con FIFA y uso de marcas">
          <p>
            Los 11 de Sampa es un juego independiente: <strong>no está afiliado, patrocinado ni
            avalado por la FIFA</strong> ni por ninguna entidad organizadora del Mundial. Los nombres
            de selecciones, jugadores y competiciones se usan con fines informativos e
            identificatorios, sin pretender derechos sobre marcas de terceros.
          </p>
        </Section>

        <Section title="Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley, el organizador no será responsable por
            interrupciones o fallas del servicio, por errores de proveedores externos (datos de
            partidos, procesador de pagos, hosting) ni por hechos de fuerza mayor. Esto no limita los
            derechos que la normativa de defensa del consumidor te reconoce.
          </p>
        </Section>

        <Section title="Ley aplicable">
          <p>
            Estas Bases se rigen por las leyes de la República Argentina, sin perjuicio de los
            derechos que la normativa de defensa del consumidor (Ley 24.240) te reconoce.
          </p>
        </Section>

        <Section title="Aceptación">
          <p>
            La inscripción implica la aceptación total de estas Bases y Condiciones, que declarás
            haber leído antes de pagar.
          </p>
        </Section>
      </Card>
    </div>
  );
}
