import Link from "next/link";
import { cn } from "@/lib/utils";
import { shortRoundName } from "@/lib/game/round-format";
import { RoundSelectMobile } from "./RoundSelectMobile";

export type RoundPill = { order: number; name: string };

/**
 * Selector "General / por fecha" para los rankings (global y ligas). Responsive:
 * en mobile un <select> nativo (compacto, escala a muchas fechas sin scroll), y
 * en desktop una fila de pills (cada una un Link, sin JS). Navega por query param
 * (`?fecha=N`); `General` = acumulado (sin param). La fecha activa se resalta.
 */
export function RoundFilterPills({
  rounds,
  active,
  basePath,
  paramName = "fecha",
}: {
  rounds: RoundPill[];
  /** `order` de la fecha activa, o null para "General". */
  active: number | null;
  /** Ruta base, ej. "/ranking" o "/ligas/ABC123". */
  basePath: string;
  paramName?: string;
}) {
  if (rounds.length === 0) return null;

  const hrefFor = (order: number | null) =>
    order == null ? basePath : `${basePath}?${paramName}=${order}`;

  const Pill = ({ label, order }: { label: string; order: number | null }) => {
    const isActive = order === active;
    return (
      <Link
        href={hrefFor(order)}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
          isActive
            ? "border-blue bg-blue text-white"
            : "border-border bg-surface text-ink-2 hover:bg-surface-2",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile: dropdown nativo (compacto, sin scroll horizontal). */}
      <div className="sm:hidden">
        <RoundSelectMobile rounds={rounds} active={active} basePath={basePath} paramName={paramName} />
      </div>
      {/* Desktop: pills en fila. */}
      <div className="hidden flex-wrap gap-2 sm:flex">
        <Pill label="General" order={null} />
        {rounds.map((r) => (
          <Pill key={r.order} label={shortRoundName(r.name)} order={r.order} />
        ))}
      </div>
    </>
  );
}
