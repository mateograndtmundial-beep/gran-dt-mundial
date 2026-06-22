import { Trophy } from "lucide-react";
import { Eyebrow } from "@/components/editorial";
import type { CopaStatus } from "@/lib/queries";
import { formatArs } from "./format";
import { EnrollButton } from "./EnrollButton";
import { CupoScarcity } from "./CupoScarcity";

/**
 * Card de promoción de la Liga Premium para usuarios NO inscriptos, insertada en
 * `/ligas` encima de las ligas privadas. Muestra premio garantizado y entrada. A
 * propósito NO mostramos el cupo en vivo (inscriptos/total): daría sensación de "vacío"
 * al arranque y desconfianza. Solo se enciende una leyenda de escasez ("Quedan pocos
 * cupos" / "Últimos lugares") cuando de verdad falta poco (ver CupoScarcity). El número
 * exacto solo lo ve quien ya está inscripto (CopaLeagueRow). Mobile-first: stack vertical
 * en celular, fila en desktop.
 */
export function CopaPromoCard({ copa }: { copa: CopaStatus }) {
  const capacity = copa.capacity ?? 100;

  return (
    <div className="rounded-[10px] border-2 border-gold-border bg-gold-bg p-5 card-shadow">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-gold shrink-0" aria-hidden />
        <Eyebrow className="text-gold-ink">{copa.name}</Eyebrow>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="jersey-numeral text-[clamp(2.25rem,9vw,3.5rem)] leading-none tracking-tight text-gold-ink">
            {formatArs(copa.prizeArs ?? 400000)}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            Premio garantizado · repartido entre los 10 primeros
          </p>
          <p className="text-sm text-ink-3">
            Entrada {formatArs(copa.entryFeeArs ?? 5000)} · cupo {capacity}
          </p>
        </div>
      </div>

      {/* Sin cupo en vivo: solo una leyenda de escasez cuando de verdad falta poco. */}
      <div className="mt-4 empty:mt-0">
        <CupoScarcity copaId={copa.id} initialScarcity={copa.scarcity} />
      </div>

      <div className="mt-4">
        <EnrollButton entrySku={copa.entrySku} />
      </div>
    </div>
  );
}
