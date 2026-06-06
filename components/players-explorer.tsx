"use client";

import { useMemo, useState } from "react";
import { POSITIONS, type Position } from "@/lib/game/config";
import { PlayerCard } from "@/components/player-card";
import { cn } from "@/lib/utils";

type P = {
  id: number;
  name: string;
  position: Position;
  price: number;
  club: string | null;
  countryName: string;
  flagUrl: string | null;
  eliminatedRound: number | null;
};

export function PlayersExplorer({ players }: { players: P[] }) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "ALL">("ALL");

  const filtered = useMemo(
    () =>
      players.filter(
        (p) =>
          (pos === "ALL" || p.position === pos) &&
          p.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [players, q, pos],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar jugador…"
          className="w-full rounded-lg border border-white/10 bg-pitch-card px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...POSITIONS] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={cn(
                "rounded-full border border-white/10 px-3 py-1 text-xs font-semibold",
                pos === p ? "bg-accent text-pitch" : "text-white/60",
              )}
            >
              {p === "ALL" ? "Todos" : p}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/40">{filtered.length} jugadores</p>

      <div className="grid gap-2 md:grid-cols-2">
        {filtered.slice(0, 200).map((p) => (
          <PlayerCard
            key={p.id}
            name={p.name}
            position={p.position}
            price={p.price}
            club={p.club}
            countryName={p.countryName}
            flagUrl={p.flagUrl}
            eliminated={p.eliminatedRound != null}
          />
        ))}
      </div>
      {filtered.length > 200 && (
        <p className="text-center text-xs text-white/40">Mostrando los primeros 200. Refiná la búsqueda.</p>
      )}
    </div>
  );
}
