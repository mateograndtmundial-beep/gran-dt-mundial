"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { shortRoundName } from "@/lib/game/round-format";
import type { RoundPill } from "./RoundFilterPills";

/**
 * Selector de fecha para mobile: un <select> nativo (abre el picker del SO) que
 * navega por query param al cambiar. Compacto y escala a cualquier cantidad de
 * fechas sin scroll horizontal. En desktop se usan las pills (ver RoundFilterPills).
 */
export function RoundSelectMobile({
  rounds,
  active,
  basePath,
  paramName = "fecha",
}: {
  rounds: RoundPill[];
  active: number | null;
  basePath: string;
  paramName?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-3">Ver</span>
      <span className="relative flex-1">
        <select
          value={active ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            router.push(v === "" ? basePath : `${basePath}?${paramName}=${v}`);
          }}
          className="w-full appearance-none rounded-full border border-border bg-surface py-2 pl-4 pr-9 text-sm font-semibold text-ink-2 card-shadow"
        >
          <option value="">General</option>
          {rounds.map((r) => (
            <option key={r.order} value={r.order}>
              {shortRoundName(r.name)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
      </span>
    </label>
  );
}
