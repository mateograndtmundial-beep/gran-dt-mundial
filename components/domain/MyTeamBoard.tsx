"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { Eyebrow, PositionChip } from "@/components/editorial";
import { Pitch, type PitchPlayer } from "@/components/pitch";
import { PointsBreakdown, type RoundPoints } from "@/components/domain/PointsBreakdown";
import { POSITIONS, type Position } from "@/lib/game/config";
import { formatPoints, formatPrice } from "@/lib/utils";
import { flagUrl } from "@/lib/flags";
import { getRoundLineupAction } from "@/lib/lineup-actions";

type Lineup = NonNullable<Awaited<ReturnType<typeof getRoundLineupAction>>>;

export type BoardRound = {
  entryRoundId: number;
  roundName: string;
  order: number;
  status: string;
  points: number;
  formation: string;
  captainPlayerId: number | null;
};

/** "Fecha 1 — Grupos (J1)" -> "Fecha 1" (para el selector compacto). */
function shortRound(name: string): string {
  const m = name.match(/Fecha\s+\d+/i);
  return m ? m[0] : name;
}

export function MyTeamBoard({
  rounds,
  initial,
  playedRounds,
}: {
  rounds: BoardRound[]; // ascendente por order
  initial: Lineup; // alineación de la fecha más reciente (primer paint)
  playedRounds: RoundPoints[]; // fechas publicadas, para el card de puntos
}) {
  const latest = rounds[rounds.length - 1]!;
  const publishedIds = new Set(playedRounds.map((r) => r.id));

  const [selectedId, setSelectedId] = useState(latest.entryRoundId);
  const [pointsOpenId, setPointsOpenId] = useState<number | null>(
    publishedIds.has(latest.entryRoundId) ? latest.entryRoundId : null,
  );
  const [cache, setCache] = useState<Record<number, Lineup>>({ [latest.entryRoundId]: initial });
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const idx = Math.max(0, rounds.findIndex((r) => r.entryRoundId === selectedId));
  const round = rounds[idx] ?? latest;
  const data: Lineup | undefined = cache[selectedId];
  const loading = loadingId === selectedId && data === undefined;
  const isCurrent = round.entryRoundId === latest.entryRoundId;

  async function loadLineup(id: number) {
    if (cache[id] !== undefined) return;
    setLoadingId(id);
    try {
      const r = await getRoundLineupAction(id);
      if (r) setCache((c) => ({ ...c, [id]: r }));
    } finally {
      setLoadingId(null);
    }
  }

  function goToRound(id: number) {
    setSelectedId(id);
    setPointsOpenId(publishedIds.has(id) ? id : null);
    void loadLineup(id);
  }

  // Sincronización inversa: al abrir/cerrar una fecha en "Puntos por fecha",
  // la cancha se mueve a esa fecha (y al cerrar, la cancha se queda donde está).
  function handlePointsToggle(id: number | null) {
    setPointsOpenId(id);
    if (id != null) {
      setSelectedId(id);
      void loadLineup(id);
    }
  }

  // Picks de la cancha + suplentes a partir de la alineación cargada.
  const picks: Record<string, PitchPlayer> = {};
  const subs: Lineup["players"] = [];
  if (data) {
    for (const p of data.players) {
      if (p.isStarter && p.slot) {
        picks[p.slot] = {
          id: p.id,
          name: p.name,
          position: p.position as Position,
          code: p.code,
          countryName: p.countryName,
          price: p.price,
          eliminatedRound: p.eliminatedRound,
        };
      } else if (!p.isStarter && p.slot) {
        subs.push(p);
      }
    }
    subs.sort(
      (a, b) => POSITIONS.indexOf(a.position as Position) - POSITIONS.indexOf(b.position as Position),
    );
  }
  const coach = data?.coach ?? null;
  const hasLineup = Object.keys(picks).length > 0;

  const canPrev = idx > 0;
  const canNext = idx < rounds.length - 1;
  const multi = rounds.length > 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <Card className="p-4 lg:p-6">
        {/* Selector de fecha con flechas */}
        <div className="mb-4 border-b-2 border-border pb-3">
          <Eyebrow className="mb-2">Tu equipo</Eyebrow>
          <div className="flex items-center justify-between gap-2">
            {multi ? (
              <button
                onClick={() => canPrev && goToRound(rounds[idx - 1]!.entryRoundId)}
                disabled={!canPrev}
                aria-label="Fecha anterior"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-ink-2 transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
            ) : (
              <span className="h-9 w-9 shrink-0" aria-hidden />
            )}

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate font-display text-lg leading-none text-ink">
                {shortRound(round.roundName)}
                {isCurrent && <span className="ml-1.5 text-xs font-normal text-blue">· actual</span>}
              </p>
              <p className="mt-1 text-[11px] text-ink-3">
                {round.status === "published"
                  ? `${formatPoints(round.points)} pts · ${round.formation}`
                  : `Sin publicar · ${round.formation}`}
              </p>
            </div>

            {multi ? (
              <button
                onClick={() => canNext && goToRound(rounds[idx + 1]!.entryRoundId)}
                disabled={!canNext}
                aria-label="Fecha siguiente"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-ink-2 transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            ) : (
              <span className="h-9 w-9 shrink-0" aria-hidden />
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Cargando tu equipo…
          </div>
        ) : hasLineup ? (
          <div className="flex flex-col items-center gap-6">
            <Pitch
              formation={round.formation}
              picks={picks}
              captainId={round.captainPlayerId}
              style={{ width: "min(100%, 400px)" }}
            />

            {subs.length > 0 && (
              <div className="w-full">
                <Eyebrow className="mb-2">Suplentes</Eyebrow>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {subs.map((s) => (
                    <div
                      key={s.slot}
                      className="flex items-center gap-2 rounded-[6px] border border-border bg-surface px-2.5 py-2"
                    >
                      <PositionChip position={s.position as Position} />
                      {flagUrl(s.code) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flagUrl(s.code)!} alt={s.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                      ) : (
                        <div className="h-4 w-6 shrink-0 rounded-sm bg-surface-2" />
                      )}
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-semibold ${s.eliminatedRound != null ? "text-ink-faint line-through" : "text-ink"}`}
                        title={s.name}
                      >
                        {s.name}
                      </span>
                      <span className="jersey-numeral shrink-0 text-xs text-gold-ink">{formatPrice(s.price)}M</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {coach && (
              <div className="w-full">
                <Eyebrow className="mb-2">Técnico</Eyebrow>
                <div className="flex items-center gap-2 rounded-[6px] border border-border bg-surface px-2.5 py-2">
                  <span className="shrink-0 rounded-[4px] bg-blue/10 px-1.5 py-0.5 text-[10px] font-display tracking-wide text-blue">
                    DT
                  </span>
                  {flagUrl(coach.code) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={flagUrl(coach.code)!} alt={coach.countryName} width={24} height={16} loading="lazy" decoding="async" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <div className="h-4 w-6 shrink-0 rounded-sm bg-surface-2" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={coach.name}>
                    {coach.name}
                  </span>
                  <span className="shrink-0 text-xs text-ink-3">{coach.countryName}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="No hay alineación para esta fecha." />
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between border-b-2 border-border pb-3">
          <Eyebrow>Puntos por fecha</Eyebrow>
          <Link
            href="/como-funciona"
            className="text-xs font-semibold text-ink-3 transition-colors hover:text-blue"
          >
            ¿Cómo se calculan?
          </Link>
        </div>
        <p className="mb-3 text-xs text-ink-3">
          Los puntos se publican al cierre de cada fecha, cuando terminan todos sus partidos.
        </p>
        <PointsBreakdown rounds={playedRounds} openId={pointsOpenId} onOpenChange={handlePointsToggle} />
      </Card>
    </div>
  );
}
