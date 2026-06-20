import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mail } from "lucide-react";
import { InstagramIcon } from "@/components/icons";
import { PageTitle, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento · Los 11 de Sampa",
  description:
    "Cómo ejercer tu derecho de arrepentimiento (10 días) sobre la entrada a la Liga Premium o la compra de pines en Los 11 de Sampa.",
};

const UPDATED = "20 de junio de 2026";

const MAILTO = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(
  "Botón de arrepentimiento",
)}`;

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

export default function ArrepentimientoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageTitle
        title="Botón de arrepentimiento"
        subtitle="Si te arrepentís de una compra, podés cancelarla y pedir el reembolso. Acá te contamos cómo."
      />
      <Eyebrow>Última actualización · {UPDATED}</Eyebrow>

      <Card className="space-y-7 p-6 sm:p-7">
        <Section title="Qué es">
          <p>
            Tenés un <strong>derecho de arrepentimiento de 10 días corridos</strong> desde la
            compra, sin costo ni penalidad y sin tener que dar explicaciones (art. 34 de la Ley
            24.240 de Defensa del Consumidor y Res. SCI 424/2020). Aplica a la{" "}
            <strong>entrada a la Liga Premium</strong> y a la <strong>compra de pines</strong>.
          </p>
        </Section>

        <Section title="Qué cubre">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Entrada a la Liga Premium:</strong> reembolso del 100% si te arrepentís{" "}
              <strong>antes de que la Copa empiece a jugarse</strong> (kickoff de los 16vos de
              final). Una vez iniciada la competencia, el arrepentimiento ya no aplica.
            </li>
            <li>
              <strong>Pines:</strong> reembolso de los pines <strong>no utilizados</strong> dentro
              de los 10 días (los que ya gastaste no son reintegrables).
            </li>
            <li>
              <strong>Pago sin lugar:</strong> si pagaste la entrada pero no entraste por falta de
              cupo o por inscripción cerrada, te reembolsamos el importe completo, sin importar el
              plazo.
            </li>
          </ul>
          <p>
            Los reembolsos se procesan por el mismo medio de pago (Mercado Pago). El detalle completo
            está en las{" "}
            <Link href="/bases" className="font-semibold text-blue hover:underline">
              Bases y Condiciones
            </Link>
            .
          </p>
        </Section>

        <Section title="Cómo ejercerlo">
          <p>
            Escribinos para cancelar tu compra. Para que podamos identificarla y reembolsarte rápido,
            incluí: el <strong>email registrado en tu cuenta</strong>, tu{" "}
            <strong>nombre de usuario (DT)</strong>, <strong>qué compraste</strong> (entrada a la Liga
            Premium o pines) y la <strong>fecha del pago</strong>.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <a
              href={MAILTO}
              className="inline-flex items-center justify-center gap-2.5 rounded-[6px] bg-blue px-6 py-3 font-display text-base text-white btn-shadow transition-all duration-100 hover:bg-blue-hover hover:-translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <Mail size={18} strokeWidth={2} aria-hidden />
              Pedir el reembolso por mail
            </a>
            <a
              href={SITE.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-[6px] border border-border bg-surface px-6 py-3 font-display text-base text-ink transition-colors hover:bg-canvas"
            >
              <InstagramIcon size={18} />
              Escribir por Instagram
            </a>
          </div>
          <p className="text-sm text-ink-3">
            También podés escribirnos directamente a <Mailto />. Te respondemos lo antes posible.
          </p>
        </Section>
      </Card>

      <p className="text-sm text-ink-3">
        ¿Otra consulta?{" "}
        <Link href="/soporte" className="font-semibold text-blue hover:underline">
          Andá a Soporte
        </Link>
        .
      </p>
    </div>
  );
}
