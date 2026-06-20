import { Trophy } from "lucide-react";
import { Eyebrow } from "@/components/editorial";
import { formatArs } from "./format";

/**
 * Header premium del ranking de una Liga Premium en `/ligas/[code]`. Marca la liga
 * como premium y muestra premio / entrada / cupo. Sin tabla de distribución (decisión del
 * dueño). El ranking de los inscriptos se renderiza debajo con el LeagueRanking normal.
 */
export function CopaPrizeHeader({
  prizeArs,
  entryFeeArs,
  capacity,
  enrolled,
}: {
  prizeArs: number | null;
  entryFeeArs: number | null;
  capacity: number | null;
  enrolled: number;
}) {
  const cap = capacity ?? 100;
  const stats = [
    { label: "Premio garantizado", value: formatArs(prizeArs ?? 400000), strong: true },
    { label: "Entrada", value: formatArs(entryFeeArs ?? 5000), strong: false },
    { label: "Cupo", value: `${enrolled}/${cap}`, strong: false },
  ];

  return (
    <div className="rounded-[10px] border-2 border-gold-border bg-gold-bg p-4 card-shadow">
      <div className="flex items-center gap-2">
        <Trophy size={16} className="text-gold shrink-0" aria-hidden />
        <Eyebrow className="text-gold-ink">Liga Premium · premio para el top 10</Eyebrow>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <span
              className={
                s.strong
                  ? "jersey-numeral text-2xl leading-none tracking-tight text-gold-ink"
                  : "jersey-numeral text-2xl leading-none tracking-tight text-ink"
              }
            >
              {s.value}
            </span>
            <Eyebrow className="text-ink-3">{s.label}</Eyebrow>
          </div>
        ))}
      </div>
    </div>
  );
}
