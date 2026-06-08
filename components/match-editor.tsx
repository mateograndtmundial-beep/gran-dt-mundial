"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMatchStats, type StatRowInput } from "@/lib/admin-actions";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import type { Position } from "@/lib/game/config";
import { PositionChip } from "@/components/editorial";
import { cn } from "@/lib/utils";

type PlayerRow = {
  playerId: number;
  name: string;
  position: Position;
  countryId: number;
  jerseyNumber: number | null;
  minutes: number | null;
  rating: number | null;
  goals: number | null;
  penaltyGoals: number | null;
  assists: number | null;
  yellow: number | null;
  red: number | null;
  ownGoals: number | null;
  penaltiesSaved: number | null;
  penaltiesMissed: number | null;
  isMotm: boolean | null;
  manualEdit: boolean | null;
  hasStat: boolean;
};

type Match = {
  id: number;
  roundId: number;
  homeCountryId: number | null;
  awayCountryId: number | null;
  homeName: string | null;
  awayName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  motmPlayerId: number | null;
  roundType: "group" | "knockout" | null;
  roundStatus: string | null;
};

type Draft = Record<string, string>;
const STAT_KEYS = [
  "minutes",
  "rating",
  "goals",
  "penaltyGoals",
  "assists",
  "yellow",
  "red",
  "ownGoals",
  "penaltiesSaved",
  "penaltiesMissed",
] as const;

const COLS: { key: (typeof STAT_KEYS)[number]; label: string; title: string; w?: string }[] = [
  { key: "minutes", label: "Min", title: "Minutos jugados" },
  { key: "rating", label: "Rating", title: "Calificación 0–10 (base del puntaje)", w: "w-16" },
  { key: "goals", label: "G", title: "Goles (total, incluye los de penal)" },
  { key: "penaltyGoals", label: "Gp", title: "De los goles, cuántos fueron de penal" },
  { key: "assists", label: "A", title: "Asistencias" },
  { key: "yellow", label: "Am", title: "Amarillas" },
  { key: "red", label: "Roja", title: "Roja (1 = expulsado)" },
  { key: "ownGoals", label: "AG", title: "Goles en contra (autogol)" },
  { key: "penaltiesSaved", label: "PA", title: "Penales atajados (arquero)" },
  { key: "penaltiesMissed", label: "PE", title: "Penales errados" },
];

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n));
const toInt = (s: string) => {
  const v = parseInt(s, 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const toRating = (s: string): number | null => {
  if (s.trim() === "") return null;
  const v = Number(s.replace(",", "."));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : null;
};

function initDraft(p: PlayerRow): Draft {
  return {
    minutes: numStr(p.minutes),
    rating: numStr(p.rating),
    goals: numStr(p.goals),
    penaltyGoals: numStr(p.penaltyGoals),
    assists: numStr(p.assists),
    yellow: numStr(p.yellow),
    red: numStr(p.red),
    ownGoals: numStr(p.ownGoals),
    penaltiesSaved: numStr(p.penaltiesSaved),
    penaltiesMissed: numStr(p.penaltiesMissed),
  };
}

// Definido a nivel de módulo (no anidado) para que los inputs no pierdan el foco al tipear.
function SquadTable({
  title,
  rows,
  drafts,
  motm,
  onField,
  onMotm,
  pointsOf,
}: {
  title: string | null;
  rows: PlayerRow[];
  drafts: Record<number, Draft>;
  motm: number | null;
  onField: (playerId: number, key: string, value: string) => void;
  onMotm: (playerId: number) => void;
  pointsOf: (p: PlayerRow) => number;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-lg text-ink">{title ?? "—"}</h3>
      <div className="overflow-x-auto rounded-[8px] border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 text-ink-3">
              <th className="px-2 py-1.5 text-left font-semibold">Jugador</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-1 py-1.5 text-center font-semibold" title={c.title}>
                  {c.label}
                </th>
              ))}
              <th className="px-1 py-1.5 text-center font-semibold" title="Figura del partido">Fig</th>
              <th className="px-2 py-1.5 text-right font-semibold" title="Puntos (preview en vivo)">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const d = drafts[p.playerId];
              const pts = pointsOf(p);
              return (
                <tr key={p.playerId} className={cn("border-t border-border", p.manualEdit && "bg-gold/5")}>
                  <td className="px-2 py-1 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-right text-xs text-ink-faint tabular-nums">{p.jerseyNumber ?? ""}</span>
                      <PositionChip position={p.position} />
                      <span className="font-medium text-ink">{p.name}</span>
                    </div>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-1 py-1 text-center">
                      <input
                        inputMode={c.key === "rating" ? "decimal" : "numeric"}
                        value={d?.[c.key] ?? ""}
                        onChange={(e) => onField(p.playerId, c.key, e.target.value)}
                        className={cn(
                          "rounded-[6px] border border-border bg-canvas px-1 py-1 text-center text-sm text-ink focus:border-border-strong focus:outline-none",
                          c.w ?? "w-11",
                        )}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center">
                    <input
                      type="radio"
                      name="motm"
                      checked={motm === p.playerId}
                      onChange={() => onMotm(p.playerId)}
                      className="accent-gold"
                      aria-label="Marcar figura"
                    />
                  </td>
                  <td className={cn("px-2 py-1 text-right font-display tabular-nums", pts < 0 ? "text-danger" : "text-ink")}>
                    {pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MatchEditor({ match, players }: { match: Match; players: PlayerRow[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(players.map((p) => [p.playerId, initDraft(p)])),
  );
  const [homeScore, setHomeScore] = useState(numStr(match.homeScore));
  const [awayScore, setAwayScore] = useState(numStr(match.awayScore));
  const [homePens, setHomePens] = useState(numStr(match.homePenalties));
  const [awayPens, setAwayPens] = useState(numStr(match.awayPenalties));
  const [motm, setMotm] = useState<number | null>(match.motmPlayerId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isKnockout = match.roundType === "knockout";
  const hs = toInt(homeScore);
  const as = toInt(awayScore);

  const setField = (playerId: number, key: string, value: string) =>
    setDrafts((d) => ({ ...d, [playerId]: { ...d[playerId], [key]: value } }));

  // Puntos en vivo: misma función que usa el server (calcularPuntos) → el preview coincide con lo guardado.
  const livePoints = (p: PlayerRow): number => {
    const d = drafts[p.playerId];
    if (!d) return 0;
    const isHome = p.countryId === match.homeCountryId;
    const conceded = isHome ? as : hs;
    return calcularPuntos({
      position: p.position,
      minutes: toInt(d.minutes),
      rating: toRating(d.rating),
      goals: toInt(d.goals),
      penaltyGoals: toInt(d.penaltyGoals),
      assists: toInt(d.assists),
      yellow: toInt(d.yellow),
      red: toInt(d.red),
      ownGoals: toInt(d.ownGoals),
      penaltiesSaved: toInt(d.penaltiesSaved),
      penaltiesMissed: toInt(d.penaltiesMissed),
      goalsConceded: conceded,
      cleanSheet: conceded === 0,
      isMotm: motm === p.playerId,
      isCaptain: false,
    }).total;
  };

  const home = players.filter((p) => p.countryId === match.homeCountryId);
  const away = players.filter((p) => p.countryId === match.awayCountryId);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    const rows: StatRowInput[] = players
      .filter((p) => {
        const d = drafts[p.playerId];
        if (!d) return false;
        const touched = STAT_KEYS.some((k) => d[k].trim() !== "" && d[k].trim() !== "0");
        // Los que participaron, ya tenían stats, o están marcados como figura.
        return p.hasStat || touched || motm === p.playerId;
      })
      .map((p) => {
        const d = drafts[p.playerId];
        return {
          playerId: p.playerId,
          minutes: toInt(d.minutes),
          rating: toRating(d.rating),
          goals: toInt(d.goals),
          penaltyGoals: toInt(d.penaltyGoals),
          assists: toInt(d.assists),
          yellow: toInt(d.yellow),
          red: toInt(d.red),
          ownGoals: toInt(d.ownGoals),
          penaltiesSaved: toInt(d.penaltiesSaved),
          penaltiesMissed: toInt(d.penaltiesMissed),
        };
      });

    const r = await saveMatchStats({
      matchId: match.id,
      homeScore: homeScore.trim() === "" ? null : hs,
      awayScore: awayScore.trim() === "" ? null : as,
      homePenalties: isKnockout && homePens.trim() !== "" ? toInt(homePens) : null,
      awayPenalties: isKnockout && awayPens.trim() !== "" ? toInt(awayPens) : null,
      motmPlayerId: motm,
      rows,
    });
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error === "forbidden" ? "No autorizado" : r.error });
      return;
    }
    setMsg({ ok: true, text: `Guardado (${r.saved} jugadores). Publicá la fecha desde el panel.` });
    router.refresh();
  }

  const scoreInput =
    "w-12 rounded-[6px] border border-border bg-canvas px-2 py-1 text-center text-sm text-ink focus:border-border-strong focus:outline-none";

  return (
    <div className="space-y-5">
      {/* Marcador + penales + guardar */}
      <div className="flex flex-wrap items-end gap-4 rounded-[8px] border border-border bg-surface p-4">
        <div className="flex items-end gap-2">
          <label className="text-xs text-ink-3">
            <div className="mb-1 font-semibold">{match.homeName}</div>
            <input value={homeScore} onChange={(e) => setHomeScore(e.target.value)} inputMode="numeric" className={scoreInput} />
          </label>
          <span className="pb-1.5 text-ink-faint">–</span>
          <label className="text-xs text-ink-3">
            <div className="mb-1 font-semibold">{match.awayName}</div>
            <input value={awayScore} onChange={(e) => setAwayScore(e.target.value)} inputMode="numeric" className={scoreInput} />
          </label>
        </div>
        {isKnockout && (
          <div className="flex items-end gap-2">
            <span className="pb-1.5 text-xs text-ink-faint">Penales (tanda):</span>
            <input value={homePens} onChange={(e) => setHomePens(e.target.value)} inputMode="numeric" placeholder="–" className={scoreInput} />
            <span className="pb-1.5 text-ink-faint">–</span>
            <input value={awayPens} onChange={(e) => setAwayPens(e.target.value)} inputMode="numeric" placeholder="–" className={scoreInput} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {motm != null && (
            <button onClick={() => setMotm(null)} className="text-xs text-ink-3 underline hover:text-ink">
              Quitar figura
            </button>
          )}
          {msg && <span className={cn("text-xs font-medium", msg.ok ? "text-success" : "text-danger")}>{msg.text}</span>}
          <button
            onClick={onSave}
            disabled={busy}
            className="rounded-[6px] bg-blue px-5 py-2 font-display text-base text-white hover:bg-blue-hover transition-colors disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar partido"}
          </button>
        </div>
      </div>

      <SquadTable title={match.homeName} rows={home} drafts={drafts} motm={motm} onField={setField} onMotm={setMotm} pointsOf={livePoints} />
      <SquadTable title={match.awayName} rows={away} drafts={drafts} motm={motm} onField={setField} onMotm={setMotm} pointsOf={livePoints} />

      <p className="text-xs text-ink-faint">
        Min: minutos · Rating: nota 0–10 (base; el capitán la duplica) · G: goles · Gp: de penal · A: asistencias ·
        Am: amarillas · Roja: 1 si expulsado · AG: autogol · PA: penal atajado · PE: penal errado · Fig: figura (+4).
        El rating necesita ≥20′ para puntuar. Las filas en dorado son ediciones manuales (el sync no las pisa).
      </p>
    </div>
  );
}
