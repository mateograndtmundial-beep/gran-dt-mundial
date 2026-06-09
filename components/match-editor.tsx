"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMatchStats, type StatRowInput } from "@/lib/admin-actions";
import { calcularPuntos } from "@/lib/scoring/calcular-puntos";
import { SCORING, type Position } from "@/lib/game/config";
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

const YELLOW = "#EAB308";
const RED = "#DC2626";
const MIN_TO_SCORE = SCORING.minMinutes;

// Columnas. type define cómo se edita cada una.
type ColType = "minutes" | "rating" | "stepper" | "card";
type Col = { key: (typeof STAT_KEYS)[number]; type: ColType; label?: string; color?: string; help: string };

const CORE_COLS: Col[] = [
  { key: "minutes", type: "minutes", label: "Minutos", help: "Minutos jugados (necesita ≥20 para puntuar)" },
  { key: "rating", type: "rating", label: "Nota", help: "Calificación 0–10 entera (base del puntaje; el capitán la duplica)" },
  { key: "goals", type: "stepper", label: "Goles", help: "Goles (total)" },
  { key: "assists", type: "stepper", label: "Asist", help: "Asistencias" },
  { key: "yellow", type: "card", color: YELLOW, help: "Tarjeta amarilla" },
  { key: "red", type: "card", color: RED, help: "Tarjeta roja (expulsado)" },
];
const EXTRA_COLS: Col[] = [
  { key: "penaltyGoals", type: "stepper", label: "Gol pen", help: "De los goles, cuántos fueron de penal" },
  { key: "ownGoals", type: "stepper", label: "Autogol", help: "Goles en contra" },
  { key: "penaltiesSaved", type: "stepper", label: "Atajó pen", help: "Penales atajados (arquero)" },
  { key: "penaltiesMissed", type: "stepper", label: "Erró pen", help: "Penales errados" },
];

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n));
const toInt = (s: string | undefined) => {
  const v = parseInt(s ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
// La calificación es ENTERA (0-10): si tipean un decimal se redondea.
const toRating = (s: string | undefined): number | null => {
  if (!s || s.trim() === "") return null;
  const v = Number(s.replace(",", "."));
  return Number.isFinite(v) ? Math.round(Math.max(0, Math.min(10, v))) : null;
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

// ── Controles (módulo-level para que los inputs no pierdan foco) ──
function Stepper({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const n = toInt(value);
  const btn =
    "h-6 w-6 shrink-0 rounded-[6px] border border-border bg-surface text-base leading-none text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30";
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" className={btn} onClick={() => onChange(String(Math.max(0, n - 1)))} disabled={n === 0} aria-label="restar">
        −
      </button>
      <span className={cn("w-3 text-center text-sm tabular-nums", n === 0 ? "text-ink-faint" : "font-bold text-ink")}>{n}</span>
      <button type="button" className={btn} onClick={() => onChange(String(n + 1))} aria-label="sumar">
        +
      </button>
    </div>
  );
}

function CardToggle({ on, color, onToggle, title }: { on: boolean; color: string; onToggle: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={title}
      className={cn("h-5 w-3.5 rounded-[2px] border transition", on ? "" : "border-border opacity-25 hover:opacity-60")}
      style={on ? { backgroundColor: color, borderColor: color } : undefined}
    />
  );
}

function CardChip({ color }: { color: string }) {
  return <span className="inline-block h-4 w-3 rounded-[2px]" style={{ backgroundColor: color }} aria-hidden />;
}

function SquadTable({
  title,
  rows,
  drafts,
  motm,
  onField,
  onMotm,
  pointsOf,
  showExtra,
}: {
  title: string | null;
  rows: PlayerRow[];
  drafts: Record<number, Draft>;
  motm: number | null;
  onField: (playerId: number, key: string, value: string) => void;
  onMotm: (playerId: number) => void;
  pointsOf: (p: PlayerRow) => number;
  showExtra: boolean;
}) {
  const cols = showExtra ? [...CORE_COLS, ...EXTRA_COLS] : CORE_COLS;
  return (
    <div className="space-y-2">
      <h3 className="font-display text-lg text-ink">{title ?? "—"}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-faint">Ningún jugador (probá desactivar “solo los que jugaron”).</p>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-ink-3">
                <th className="px-2 py-1.5 text-left font-semibold">Jugador</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-1.5 py-1.5 text-center font-semibold" title={c.help}>
                    {c.type === "card" ? <CardChip color={c.color!} /> : c.label}
                  </th>
                ))}
                <th className="px-1.5 py-1.5 text-center font-semibold" title="Figura del partido (+4)">Figura</th>
                <th className="px-2 py-1.5 text-right font-semibold" title="Puntos (preview en vivo)">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const d = drafts[p.playerId];
                const pts = pointsOf(p);
                const needsRating = toInt(d?.minutes) >= MIN_TO_SCORE && toRating(d?.rating) == null;
                return (
                  <tr key={p.playerId} className={cn("border-t border-border", p.manualEdit && "bg-gold/5")}>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 text-right text-xs text-ink-3 tabular-nums">{p.jerseyNumber ?? ""}</span>
                        <PositionChip position={p.position} />
                        <span className="font-medium text-ink">{p.name}</span>
                      </div>
                    </td>
                    {cols.map((c) => (
                      <td key={c.key} className="px-1.5 py-1 text-center">
                        {c.type === "card" ? (
                          <CardToggle
                            on={toInt(d?.[c.key]) >= 1}
                            color={c.color!}
                            title={c.help}
                            onToggle={() => onField(p.playerId, c.key, toInt(d?.[c.key]) >= 1 ? "0" : "1")}
                          />
                        ) : c.type === "stepper" ? (
                          <Stepper value={d?.[c.key]} onChange={(v) => onField(p.playerId, c.key, v)} />
                        ) : (
                          <input
                            inputMode="numeric"
                            value={d?.[c.key] ?? ""}
                            onChange={(e) => onField(p.playerId, c.key, e.target.value)}
                            placeholder={c.type === "rating" ? "–" : ""}
                            className={cn(
                              "w-14 rounded-[6px] border bg-canvas px-1.5 py-1 text-center text-sm text-ink focus:outline-none focus:border-border-strong",
                              c.type === "rating" && needsRating ? "border-warning bg-warning/5" : "border-border",
                            )}
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-1.5 py-1 text-center">
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
      )}
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
  const [onlyPlayed, setOnlyPlayed] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isKnockout = match.roundType === "knockout";
  const hs = toInt(homeScore);
  const as = toInt(awayScore);

  const setField = (playerId: number, key: string, value: string) =>
    setDrafts((d) => ({ ...d, [playerId]: { ...d[playerId], [key]: value } }));

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

  // Filtro "solo los que jugaron" basado en los minutos del server (estable mientras tipeás).
  const filt = (list: PlayerRow[]) => (onlyPlayed ? list.filter((p) => (p.minutes ?? 0) > 0) : list);
  const home = filt(players.filter((p) => p.countryId === match.homeCountryId));
  const away = filt(players.filter((p) => p.countryId === match.awayCountryId));

  async function onSave() {
    setBusy(true);
    setMsg(null);
    const rows: StatRowInput[] = players
      .filter((p) => {
        const d = drafts[p.playerId];
        if (!d) return false;
        const touched = STAT_KEYS.some((k) => d[k].trim() !== "" && d[k].trim() !== "0");
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
    <div className="space-y-4">
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
            <span className="pb-1.5 text-xs text-ink-3">Penales (tanda):</span>
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

      {/* Controles + leyenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[8px] border border-border bg-surface px-4 py-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-2">
          <input type="checkbox" checked={onlyPlayed} onChange={(e) => setOnlyPlayed(e.target.checked)} className="accent-blue" />
          Mostrar solo los que jugaron
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-2">
          <input type="checkbox" checked={showExtra} onChange={(e) => setShowExtra(e.target.checked)} className="accent-blue" />
          Stats avanzadas (penales, autogol)
        </label>
        <p className="basis-full text-xs text-ink-3">
          <strong>Minutos</strong> jugados (≥20 para puntuar) · <strong>Nota</strong> 0–10 (base) · <strong>Goles</strong> y{" "}
          <strong>Asist</strong> con − 0 + ·{" "}
          <CardChip color={YELLOW} /> amarilla · <CardChip color={RED} /> roja (un clic) ·{" "}
          <strong>Figura</strong> +4. Las notas que faltan (jugó pero sin nota) quedan resaltadas.
        </p>
      </div>

      <SquadTable title={match.homeName} rows={home} drafts={drafts} motm={motm} onField={setField} onMotm={setMotm} pointsOf={livePoints} showExtra={showExtra} />
      <SquadTable title={match.awayName} rows={away} drafts={drafts} motm={motm} onField={setField} onMotm={setMotm} pointsOf={livePoints} showExtra={showExtra} />
    </div>
  );
}
