import type { ReactNode } from "react";
import { POSITION_COLORS, type Position } from "@/lib/game/config";

export function PositionChip({ position }: { position: Position }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-pitch"
      style={{ backgroundColor: POSITION_COLORS[position] }}
    >
      {position}
    </span>
  );
}

export function PlayerCard({
  name,
  position,
  price,
  club,
  countryName,
  flagUrl,
  eliminated,
  action,
}: {
  name: string;
  position: Position;
  price: number;
  club?: string | null;
  countryName: string;
  flagUrl?: string | null;
  eliminated?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-white/10 bg-pitch-card p-3 ${
        eliminated ? "opacity-40" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {flagUrl ? <img src={flagUrl} alt={countryName} className="h-5 w-7 rounded-sm object-cover" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PositionChip position={position} />
          <span className="truncate font-semibold">{name}</span>
        </div>
        <p className="truncate text-xs text-white/50">
          {countryName}
          {club ? ` · ${club}` : ""}
          {eliminated ? " · Eliminado" : ""}
        </p>
      </div>
      <div className="text-right">
        <div className="font-bold text-gold">{price}M</div>
        {action}
      </div>
    </div>
  );
}
