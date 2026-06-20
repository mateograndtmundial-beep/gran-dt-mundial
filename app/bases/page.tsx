import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageTitle, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bases y Condiciones · Liga Premium · Los 11 de Sampa",
  description:
    "Bases y Condiciones de la Liga Premium de Los 11 de Sampa: entrada, premio garantizado, distribución, desempate y entrega del premio.",
};

const UPDATED = "19 de junio de 2026";

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
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
        subtitle="Entrada, premio garantizado, distribución, desempate y entrega del premio."
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
            Personas mayores de 18 años con una cuenta válida en {SITE.name}. Un (1) equipo por
            usuario: la Liga Premium se juega con el <strong>mismo equipo</strong> del juego, no con
            un equipo nuevo. No participan los organizadores ni personas vinculadas a la
            administración del juego.
          </p>
        </Section>

        <Section title="Mecánica">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Entrada:</strong> $5.000 ARS por usuario, por Mercado Pago (en el checkout
              figura como "GOLDEN TICKET"). La inscripción se confirma automáticamente al acreditarse
              el pago.
            </li>
            <li>
              <strong>Cupo:</strong> 100 participantes por copa. Al completarse, se cierra y se
              habilita la siguiente copa idéntica. Si no quedan cupos, podés pedir la apertura de una
              nueva por Instagram (a criterio del organizador).
            </li>
            <li>
              <strong>Ranking:</strong> la Liga Premium puntúa desde los <strong>16vos de final</strong>{" "}
              en adelante (la fase de grupos no cuenta), según las reglas de puntaje del juego (ver{" "}
              <Link href="/como-funciona" className="font-semibold text-blue hover:underline">Cómo funciona</Link>).
            </li>
            <li>
              <strong>Cierre de inscripción:</strong> al completarse el cupo de 100 o al llegar el
              kickoff de los 16vos de final, lo que ocurra primero.
            </li>
            <li>
              <strong>Cambios:</strong> en los 16vos, los inscriptos reciben cambios gratis extra esa
              fecha (se reinician, no se acumulan).
            </li>
          </ul>
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

        <Section title="Pagos sin lugar / reembolsos">
          <p>
            Si abonás la entrada pero <strong>no entrás por falta de cupo</strong> o por haberse
            cerrado la inscripción, <strong>te reembolsamos</strong> el importe de la entrada (por
            Mercado Pago).
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
            maniobra que vulnere la mecánica del juego o estas bases.
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
