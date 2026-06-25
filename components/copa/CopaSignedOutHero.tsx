import Link from "next/link";
import { CalendarDays, Trophy, UserPlus, Users } from "lucide-react";
import { Eyebrow, PrimaryButton } from "@/components/editorial";
import { formatArs, copaStartLine } from "./format";

/**
 * Estado de /copa para visitantes SIN sesión. Es la primera pantalla que ve quien llega
 * del link de Instagram, así que en vez de un EmptyState gris vende el premio y empuja a
 * crear la cuenta. El CTA de alta lleva al armador (`redirect_url=/equipo?from=copa`): la
 * jugada de conversión es que primero armen su equipo (el gancho gratis y divertido) y se
 * inscriban después, ya invertidos — al guardar, /mi-equipo los empuja a la copa. Quien ya
 * tiene cuenta (link "Ingresar") vuelve directo a /copa para inscribirse. Mobile-first (la
 * mayoría entra del celular): hero centrado + pasos 1-2-3 que apilan en una columna.
 */
export function CopaSignedOutHero({
  prizeArs,
  entryFeeArs,
  capacity,
  startsAt,
}: {
  prizeArs: number | null;
  entryFeeArs: number | null;
  capacity: number | null;
  startsAt: string | Date | null;
}) {
  const steps = [
    { icon: UserPlus, title: "Creá tu cuenta", desc: "Gratis, en 30 segundos." },
    { icon: Users, title: "Armá tu equipo", desc: "15 cracks del Mundial + DT, con tu presupuesto." },
    { icon: Trophy, title: "Sumate a la Copa", desc: "Competís desde los 16vos por el pozo." },
  ];

  return (
    <div className="space-y-5">
      {/* Hero dorado: el premio es el gancho de la campaña. */}
      <div className="rounded-[12px] border-2 border-gold-border bg-gold-bg p-6 text-center card-shadow">
        <div className="inline-flex items-center gap-2">
          <Trophy size={20} className="text-gold" aria-hidden />
          <Eyebrow className="text-gold-ink">Premio garantizado · top 10</Eyebrow>
        </div>
        <p className="mt-2 jersey-numeral text-[clamp(3rem,16vw,5.5rem)] leading-none tracking-tight text-gold-ink">
          {formatArs(prizeArs ?? 400000)}
        </p>
        <p className="mt-2 text-sm font-semibold text-ink-2">
          Armá tu equipo del Mundial y llevate tu parte del pozo.
        </p>
        <p className="text-sm text-ink-3">
          Entrada {formatArs(entryFeeArs ?? 5000)} · cupo {capacity ?? 100} · pagás una sola vez.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-ink">
          <CalendarDays size={15} className="shrink-0" aria-hidden />
          {copaStartLine(startsAt)}
        </p>

        <div className="mt-5 flex flex-col items-center gap-2">
          <PrimaryButton
            href="/sign-up?redirect_url=%2Fequipo%3Ffrom%3Dcopa"
            className="w-full max-w-xs justify-center bg-gold-ink hover:bg-gold-ink"
          >
            CREAR CUENTA Y JUGAR
          </PrimaryButton>
          <Link href="/sign-in?redirect_url=%2Fcopa" className="text-sm font-semibold text-ink-2 underline">
            Ya tengo cuenta · Ingresar
          </Link>
        </div>
      </div>

      {/* Cómo sumarte, 1-2-3. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-[10px] border border-border bg-surface p-4 card-shadow">
            <div className="flex items-center gap-2">
              <span className="jersey-numeral text-xl leading-none text-gold-ink">{i + 1}</span>
              <s.icon size={16} className="text-ink-3" aria-hidden />
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{s.title}</p>
            <p className="text-xs text-ink-3">{s.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-ink-3">
        Al inscribirte aceptás las{" "}
        <Link href="/bases" className="font-semibold text-gold-ink underline">
          Bases y Condiciones
        </Link>
        .
      </p>
    </div>
  );
}
