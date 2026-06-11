import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
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
  if (status.state === "locked") return null;

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
        title="Ya usaste tu cambio gratis. Comprá pines para hacer más."
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
          ? `1 cambio gratis por fecha. Extra: 1 pin c/u (tenés ${status.pinBalance}).`
          : "Armado libre hasta que arranque la próxima fecha. Después, 1 cambio gratis por fecha."
      }
    >
      {content}
    </div>
  );
}
