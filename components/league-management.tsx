"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameLeague, removeMember, setLeagueScoringStart } from "@/lib/actions";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";
import { roundDisplayName } from "@/lib/game/round-format";

type Member = { userId: number; username: string | null; entryName: string | null };
type Round = { id: number; name: string; order: number };

export function LeagueManagement({
  leagueId,
  leagueName,
  ownerId,
  members,
  rounds,
  scoringStartRoundId,
}: {
  leagueId: number;
  leagueName: string;
  ownerId: number;
  members: Member[];
  rounds: Round[];
  scoringStartRoundId: number | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(leagueName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<{ userId: number; label: string } | null>(null);
  const [startBusy, setStartBusy] = useState(false);

  async function onChangeStart(value: string) {
    const roundId = value === "" ? null : Number(value);
    setStartBusy(true);
    setMsg(null);
    const r = await setLeagueScoringStart(leagueId, roundId);
    setStartBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) return setMsg("No se pudo cambiar la instancia.");
    setMsg("Instancia de puntuación actualizada.");
    router.refresh();
  }

  async function onRename() {
    setBusy(true);
    setMsg(null);
    const r = await renameLeague(leagueId, name);
    setBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) return setMsg("No se pudo renombrar.");
    setMsg("Liga renombrada.");
    router.refresh();
  }

  async function confirmRemove() {
    if (!toRemove) return;
    const { userId } = toRemove;
    setToRemove(null);
    setMsg(null);
    const r = await removeMember(leagueId, userId);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) return setMsg("No se pudo expulsar al miembro.");
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-4">
      <Eyebrow>Administrar liga</Eyebrow>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la liga"
          className="flex-1 rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
        />
        <PrimaryButton onClick={onRename} disabled={busy || !name.trim() || name.trim() === leagueName}>
          {busy ? "…" : "Renombrar"}
        </PrimaryButton>
      </div>

      <div className="border-t border-border pt-3">
        <Eyebrow className="mb-1">Puntúa desde</Eyebrow>
        <p className="mb-2 text-xs text-ink-3">
          Elegí desde qué instancia se cuentan los puntos en esta liga. Quien se sume con el
          Mundial ya empezado arranca en 0 dentro de la liga.
        </p>
        <select
          value={scoringStartRoundId ?? ""}
          onChange={(e) => onChangeStart(e.target.value)}
          disabled={startBusy}
          className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors disabled:opacity-50"
        >
          <option value="">Desde el inicio (Fecha 1)</option>
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {roundDisplayName(r.name)}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-border pt-3">
        <Eyebrow className="mb-2">Miembros ({members.length})</Eyebrow>
        <div className="space-y-1">
          {members.map((m) => {
            const label = m.username ?? m.entryName ?? "DT";
            const isOwner = m.userId === ownerId;
            return (
              <div key={m.userId} className="flex items-center justify-between rounded-[6px] px-2 py-1.5 hover:bg-surface-2">
                <span className="truncate text-sm text-ink">
                  {label}
                  {isOwner && <span className="ml-1.5 text-[10px] font-semibold text-gold-ink">(dueño)</span>}
                </span>
                {!isOwner && (
                  <button
                    onClick={() => setToRemove({ userId: m.userId, label })}
                    className="shrink-0 text-xs font-semibold text-danger hover:underline"
                  >
                    Expulsar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {msg && <p className="text-xs font-semibold text-ink-2">{msg}</p>}

      {toRemove && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar expulsión"
          onClick={() => setToRemove(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-[12px] border border-border bg-surface card-shadow-lg p-5 md:rounded-[12px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-ink">¿Expulsar a {toRemove.label}?</h3>
            <p className="mt-2 text-sm text-ink-2">
              Va a salir de la liga y dejar de aparecer en este ranking. Puede volver a unirse con el código.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={confirmRemove}
                className="rounded-[6px] bg-danger px-4 py-2.5 text-sm font-display text-white hover:opacity-90 transition-opacity"
              >
                Expulsar
              </button>
              <button
                onClick={() => setToRemove(null)}
                className="rounded-[6px] border border-border px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
