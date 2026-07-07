import Link from "next/link";
import { ArrowLeftRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChangesStatus } from "@/lib/queries";

const CHIP_CLASSES = cn(
  "inline-flex shrink-0 items-center gap-2 rounded-[6px] border border-border bg-surface px-3 py-3 card-shadow",
);

/**
 * Chip compacto de "cambios disponibles" para /mi-equipo, pensado para ir al
 * lado del botón "EDITAR EQUIPO" (misma altura). Mismo lenguaje y fórmula que
 * el contador del armador (`field-builder.tsx`): de un vistazo, cuántos
 * cambios gratis quedan para la fecha vigente. Si se agotaron, es un link a
 * /pines (los extra se compran con pines).
 */
export function ChangesStatusChip({ status }: { status: ChangesStatus }) {
  // Torneo terminado: no hay nada que recordar.
  if (status.state === "ended") return null;

  // Fecha en juego / próxima sin fixtures: en vez de quedar en silencio,
  // avisamos que el equipo está cerrado y cuándo se reabre la edición.
  if (status.state === "waiting") {
    return (
      <div
        className={cn(CHIP_CLASSES, "max-w-[15rem]")}
        title="Tu equipo está cerrado mientras se juega la fecha. Vas a poder hacer cambios para la próxima cuando se habilite."
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink-3">
          <Lock size={13} strokeWidth={1.75} />
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] font-semibold leading-tight text-ink-2">
            Equipo cerrado
          </span>
          <span className="block text-[10px] leading-tight text-ink-faint">
            Cambios para {status.nextRoundName ?? "la próxima fecha"} cuando se habilite
          </span>
        </span>
      </div>
    );
  }

  const unlimited = status.state === "premium" || status.state === "unlimited";
  const numeral = unlimited ? "∞" : status.freeLeft;
  const label = unlimited ? "ilimitados" : status.freeLeft === 1 ? "cambio" : "cambios";

  // Sin cambios gratis disponibles: el chip se vuelve link a /pines (comprar más),
  // y se pinta entero en dorado para que se note que es una acción distinta.
  const exhausted = status.state === "limited" && status.freeLeft === 0;

  const content = (
    <>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          exhausted ? "bg-gold/15 text-gold-ink" : "bg-blue/10 text-blue",
        )}
      >
        <ArrowLeftRight size={13} strokeWidth={1.75} />
      </span>
      <span className="leading-tight">
        <span className={cn("jersey-numeral text-base leading-none", exhausted ? "text-gold-ink" : "text-ink")}>
          {numeral} <span className={cn("text-[11px] font-normal", exhausted ? "text-gold-ink/80" : "text-ink-3")}>{label}</span>
        </span>
        <span className={cn("block text-[10px] leading-none", exhausted ? "text-gold-ink/70" : "text-ink-faint")}>
          {status.roundName}
        </span>
      </span>
    </>
  );

  if (exhausted) {
    return (
      <Link
        href="/pines"
        title="Ya usaste tus cambios gratis de la fecha. Comprá pines para hacer más."
        className={cn(CHIP_CLASSES, "border-gold-border bg-gold-bg hover:bg-gold/20 transition-colors")}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={CHIP_CLASSES}
      title={
        status.state === "limited"
          ? `Cambios gratis que te quedan esta fecha. Extra: 1 pin c/u (tenés ${status.pinBalance}).`
          : "Armado libre hasta que arranque la próxima fecha. Después, tus cambios gratis por fecha (los extra con pines)."
      }
    >
      {content}
    </div>
  );
}
