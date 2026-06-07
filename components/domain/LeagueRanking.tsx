import { Award, ChevronRight, Trophy } from "lucide-react";
import { cn, formatPoints } from "@/lib/utils";

export type RankingRow = {
  entryId?: number;
  entryName?: string | null;
  username?: string | null;
  totalPoints?: number | null;
};

export function LeagueRanking({
  rows,
  currentUserId,
}: {
  rows: RankingRow[];
  currentUserId?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-border-strong/50 p-10 text-center">
        <p className="font-semibold text-ink-3">Todavía no hay participantes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-border bg-surface card-shadow overflow-hidden">
      <ol>
        {rows.map((r, i) => {
          const rank = i + 1;
          const isTop3 = rank <= 3;
          const isMine = r.username && currentUserId && r.username === currentUserId;

          const PodiumIcon = rank === 1 ? Trophy : rank <= 3 ? Award : null;
          const podiumIconColor =
            rank === 1 ? "text-gold" : rank === 2 ? "text-ink-3" : "text-[#A8703A]";

          return (
            <li
              key={r.entryId ?? i}
              className={cn(
                "flex items-center gap-3 border-b border-border last:border-0 transition-colors group",
                isTop3 && rank === 1
                  ? "bg-gold-bg border-y-2 border-gold py-5 px-4"
                  : isTop3
                  ? "bg-gold-bg/40 py-4 px-4"
                  : isMine
                  ? "bg-blue-light border-y border-blue-border py-3 px-4"
                  : "hover:bg-surface-2 py-2.5 px-4",
              )}
            >
              {/* Posición — cascada descendente 1 > 2 > 3 > resto */}
              <span className="flex w-9 shrink-0 flex-col items-center gap-0.5">
                {PodiumIcon && (
                  <PodiumIcon
                    size={rank === 1 ? 18 : 15}
                    strokeWidth={1.5}
                    className={podiumIconColor}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "jersey-numeral text-center leading-none",
                    rank === 1 ? "text-2xl text-gold-ink"
                    : rank === 2 ? "text-xl text-gold-ink"
                    : rank === 3 ? "text-lg text-gold-ink"
                    : "text-sm text-ink-3",
                  )}
                >
                  {rank}
                </span>
              </span>

              {/* Info */}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate font-semibold text-ink",
                    rank === 1 ? "text-lg" : isTop3 ? "text-base" : "text-sm",
                  )}
                >
                  {r.username ?? "DT"}
                </span>
                <span className="block truncate text-xs text-ink-3">{r.entryName ?? "Sin equipo"}</span>
              </span>

              {/* Puntos — cascada descendente 1 > 2 > 3 > resto */}
              <span
                className={cn(
                  "jersey-numeral leading-none tracking-tight shrink-0",
                  rank === 1 ? "text-3xl text-ink"
                  : rank === 2 ? "text-2xl text-ink"
                  : rank === 3 ? "text-xl text-ink"
                  : "text-base text-ink-2",
                )}
              >
                {formatPoints(r.totalPoints ?? 0)}
              </span>

              {/* Chevron hover */}
              <ChevronRight
                size={16}
                className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-hidden
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
