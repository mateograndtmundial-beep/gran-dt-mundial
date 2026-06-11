import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import type { ChangesStatus } from "@/lib/queries";

/**
 * Cuadro de "cambios disponibles" para /mi-equipo. Mismo lenguaje y fórmula que
 * el contador del armador (`field-builder.tsx`), para que el usuario sepa de un
 * vistazo cuántos cambios gratis le quedan para la fecha vigente y, si los
 * agotó (o nunca tuvo), que los extra se compran con pines.
 */
export function ChangesStatusCard({ status }: { status: ChangesStatus }) {
  if (status.state === "locked") return null;

  const unlimited = status.state === "premium" || status.state === "unlimited";

  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <ArrowLeftRight size={16} strokeWidth={1.75} />
          </span>
          <Eyebrow>Cambios · {status.roundName}</Eyebrow>
        </div>
        <span className="jersey-numeral text-lg leading-none text-ink">
          {unlimited ? "∞" : status.freeLeft}{" "}
          <span className="text-[11px] font-normal text-ink-3">
            {unlimited ? "ilimitados" : status.freeLeft === 1 ? "disponible" : "disponibles"}
          </span>
        </span>
      </div>

      {status.state === "premium" && (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
          Tenés el pack premium: cambios ilimitados en todas las fechas.
        </p>
      )}

      {status.state === "unlimited" && (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
          Armado libre hasta que arranque la <strong>{status.roundName}</strong>. Desde ahí, 1
          cambio gratis por fecha.
        </p>
      )}

      {status.state === "limited" && (
        <>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
            {status.freeLeft === 1
              ? "1 cambio gratis por fecha. Si querés hacer más, cada uno extra cuesta 1 pin."
              : "Ya usaste tu cambio gratis de esta fecha. Cada cambio extra cuesta 1 pin."}{" "}
            Tenés <strong>{status.pinBalance}</strong> {status.pinBalance === 1 ? "pin" : "pines"}.
          </p>
          <Link
            href="/pines"
            className="mt-1 inline-block text-xs font-display text-gold-ink transition-colors hover:text-gold"
          >
            ¿Querés más cambios? Comprá pines →
          </Link>
        </>
      )}
    </Card>
  );
}
