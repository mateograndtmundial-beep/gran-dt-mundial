import { Award, Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { formatPoints } from "@/lib/utils";
import type { PodiumRow } from "@/lib/queries";

/**
 * Podio final del juego (top 3 del ranking general). Se usa en el hero del home y
 * arriba de /ranking cuando el torneo terminó.
 *
 * Responsive: TODO flex-row con min-w-0 + truncate. Nada de grid de 3 columnas ni
 * podio con alturas escalonadas — a 320px un nickname largo desbordaría y metería
 * scroll horizontal. Los nombres truncan; los puntos nunca se comprimen (shrink-0).
 */
export function FinalPodium({
  rows,
  heading = "PODIO FINAL",
}: {
  rows: PodiumRow[];
  heading?: string;
}) {
  if (rows.length === 0) return null;
  const [first, ...rest] = rows;
  if (!first) return null;

  return (
    <Card className="overflow-hidden">
      {/* Campeón — el protagonista de la placa */}
      <div className="border-b-2 border-gold bg-gold-bg px-4 py-4 sm:px-5">
        <Eyebrow className="block text-gold-ink">{heading}</Eyebrow>
        <div className="mt-2 flex items-center gap-3">
          <Trophy size={24} strokeWidth={1.5} className="shrink-0 text-gold" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-xl leading-none tracking-tight text-ink sm:text-2xl">
              @{first.username ?? "DT"}
            </span>
            {first.name && <span className="mt-1 block truncate text-xs text-ink-3">{first.name}</span>}
          </span>
          <span className="jersey-numeral shrink-0 text-2xl leading-none text-ink sm:text-3xl">
            {formatPoints(first.totalPoints)}
          </span>
        </div>
      </div>

      {/* 2° y 3° */}
      {rest.length > 0 && (
        <ol>
          {rest.map((r, i) => (
            <li
              key={r.entryId}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 sm:px-5"
            >
              <Award
                size={16}
                strokeWidth={1.5}
                className={i === 0 ? "shrink-0 text-ink-3" : "shrink-0 text-[#A8703A]"}
                aria-hidden
              />
              <span className="jersey-numeral w-4 shrink-0 text-center text-base leading-none text-ink-2">
                {i + 2}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  @{r.username ?? "DT"}
                </span>
                {r.name && <span className="block truncate text-xs text-ink-3">{r.name}</span>}
              </span>
              <span className="jersey-numeral shrink-0 text-base leading-none text-ink-2">
                {formatPoints(r.totalPoints)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
