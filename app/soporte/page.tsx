import type { Metadata } from "next";
import Link from "next/link";
import { Mail, HelpCircle, Shield } from "lucide-react";
import { InstagramIcon } from "@/components/icons";
import { PageTitle, Card } from "@/components/ui";
import { Eyebrow, SecondaryButton } from "@/components/editorial";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Soporte · Los 11 de Sampa",
  description:
    "¿Necesitás ayuda con Los 11 de Sampa? Escribinos por mail y seguinos en Instagram.",
};

export default function SoportePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageTitle title="Soporte" subtitle="¿Necesitás una mano? Estamos para ayudarte." />

      {/* Contacto principal */}
      <Card className="p-6">
        <Eyebrow className="mb-2">Escribinos</Eyebrow>
        <h2 className="font-display text-2xl leading-none text-ink">
          ¿Tenés un problema o una duda?
        </h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">
          Mandanos un mail contándonos qué te pasa: si es sobre tu cuenta, un pago o el juego,
          cuantos más detalles nos des, más rápido te ayudamos. Incluí el{" "}
          <strong>email registrado en tu cuenta</strong> y tu{" "}
          <strong>nombre de usuario (DT)</strong> para que podamos encontrarte. Te respondemos lo
          antes posible.
        </p>
        <a
          href={`mailto:${SITE.contactEmail}`}
          className="mt-5 inline-flex items-center gap-2.5 rounded-[6px] bg-blue px-6 py-3 font-display text-base text-white btn-shadow transition-all duration-100 hover:bg-blue-hover hover:-translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <Mail size={18} strokeWidth={2} aria-hidden />
          {SITE.contactEmail}
        </a>
      </Card>

      {/* Antes de escribirnos */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-blue" aria-hidden>
            <HelpCircle size={22} strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">¿Una duda rápida del juego?</p>
            <p className="text-sm leading-relaxed text-ink-3">
              Quizás ya está respondida en Cómo funciona (reglas, puntajes y preguntas frecuentes).
            </p>
          </div>
        </div>
        <SecondaryButton href="/como-funciona" className="shrink-0">
          Ver Cómo funciona →
        </SecondaryButton>
      </Card>

      {/* Instagram */}
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
            <p className="text-sm text-ink-3">Novedades, tips y el día a día del Mundial.</p>
          </div>
        </div>
        <span className="shrink-0 font-display text-base text-blue">{SITE.instagram.handle} →</span>
      </a>

      {/* Privacidad */}
      <div className="flex items-center gap-2 pt-1 text-sm text-ink-3">
        <Shield size={15} strokeWidth={1.5} aria-hidden />
        <span>
          ¿Cómo cuidamos tus datos? Leé nuestra{" "}
          <Link href="/privacidad" className="font-semibold text-blue hover:underline">
            política de privacidad
          </Link>{" "}
          y las{" "}
          <Link href="/bases" className="font-semibold text-blue hover:underline">
            Bases y Condiciones de la Liga Premium
          </Link>
          .
        </span>
      </div>
    </div>
  );
}
