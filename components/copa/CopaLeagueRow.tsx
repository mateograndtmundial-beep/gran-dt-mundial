import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import type { CopaStatus } from "@/lib/queries";
import { formatArs, formatCopaStart } from "./format";
import { COPA_PAUSED } from "@/lib/copa/announcement";

/**
 * Fila premium dorada de una Liga Premium en la que el usuario YA está inscripto.
 * Va dentro de la Card de ligas de `/ligas`, arriba de las privadas. Linkea al ranking
 * (`/ligas/[code]`). Mismo patrón que la fila de Liga Global, en clave dorada.
 */
export function CopaLeagueRow({ copa }: { copa: CopaStatus }) {
  const capacity = copa.capacity ?? 100;
  const startDate = formatCopaStart(copa.closesAt);
  return (
    <Link
      href={`/ligas/${copa.code}`}
      className="flex items-center gap-3 px-4 py-3.5 bg-gold-bg border-l-4 border-l-gold hover:bg-gold-bg/70 transition-colors group"
    >
      <Trophy size={18} className="text-gold shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-ink text-sm">{copa.name}</p>
        {COPA_PAUSED ? (
          <p className="truncate text-xs font-semibold text-gold-ink">
            Torneo suspendido — tocá para ver el aviso
          </p>
        ) : (
          <p className="truncate text-xs text-ink-3">
            Premio {formatArs(copa.prizeArs ?? 400000)} · {copa.enrolled}/{capacity} inscriptos
            {startDate ? ` · arranca ${startDate}` : ""}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-gold shrink-0" aria-hidden />
    </Link>
  );
}
