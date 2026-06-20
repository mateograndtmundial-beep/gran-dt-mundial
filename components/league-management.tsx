"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  removeMember,
  setLeagueScoringStart,
  deleteLeague,
  transferOwnershipAndLeave,
} from "@/lib/actions";
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<{ userId: number; label: string } | null>(null);

  // Selección pendiente de la instancia: el admin navega opciones sin que se
  // apliquen; el cambio recién impacta al tocar "Aplicar".
  const savedStart = scoringStartRoundId == null ? "" : String(scoringStartRoundId);
  const [pendingStart, setPendingStart] = useState(savedStart);
  const [startBusy, setStartBusy] = useState(false);
  const startDirty = pendingStart !== savedStart;

  // "Desde el inicio" ya cubre la Fecha 1 (order 1): no la repetimos como opción.
  const startOptions = rounds.filter((r) => r.order > 1);

  // Zona de peligro: el dueño elimina (si está solo) o transfiere y se va.
  const otherMembers = members.filter((m) => m.userId !== ownerId);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState<string>("");

  async function onApplyStart() {
    const roundId = pendingStart === "" ? null : Number(pendingStart);
    setStartBusy(true);
    setMsg(null);
    const r = await setLeagueScoringStart(leagueId, roundId);
    setStartBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) return setMsg("No se pudo cambiar la instancia.");
    setMsg("Instancia de puntuación actualizada.");
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

  async function onDelete() {
    setBusy(true);
    setMsg(null);
    const r = await deleteLeague(leagueId);
    setBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) {
      setDangerOpen(false);
      return setMsg("No se pudo eliminar la liga.");
    }
    router.push("/ligas");
    router.refresh();
  }

  async function onTransferAndLeave() {
    if (!newOwnerId) return;
    setBusy(true);
    setMsg(null);
    const r = await transferOwnershipAndLeave(leagueId, Number(newOwnerId));
    setBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) {
      setDangerOpen(false);
      return setMsg("No se pudo transferir la liga.");
    }
    router.push("/ligas");
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-4">
      <Eyebrow>Administrar liga</Eyebrow>

      <div>
        <Eyebrow className="mb-1">Puntúa desde</Eyebrow>
        <p className="mb-2 text-xs text-ink-3">
          Elegí desde qué instancia se cuentan los puntos en esta liga. Quien se sume con el
          Mundial ya empezado arranca en 0 dentro de la liga.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={pendingStart}
            onChange={(e) => setPendingStart(e.target.value)}
            disabled={startBusy}
            className="flex-1 rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors disabled:opacity-50"
          >
            <option value="">Desde el inicio (Fecha 1)</option>
            {startOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {roundDisplayName(r.name)}
              </option>
            ))}
          </select>
          <PrimaryButton onClick={onApplyStart} disabled={startBusy || !startDirty}>
            {startBusy ? "…" : "Aplicar"}
          </PrimaryButton>
        </div>
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

      {/* Zona de peligro: eliminar (si el dueño está solo) o transferir y salir. */}
      <div className="border-t border-border pt-3">
        <button
          onClick={() => {
            setMsg(null);
            setNewOwnerId(otherMembers[0] ? String(otherMembers[0].userId) : "");
            setDangerOpen(true);
          }}
          className="text-xs font-semibold text-danger hover:underline"
        >
          {otherMembers.length === 0 ? "Eliminar liga" : "Salir de la liga"}
        </button>
      </div>

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

      {dangerOpen && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={otherMembers.length === 0 ? "Confirmar eliminación de la liga" : "Transferir y salir de la liga"}
          onClick={() => !busy && setDangerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-[12px] border border-border bg-surface card-shadow-lg p-5 md:rounded-[12px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {otherMembers.length === 0 ? (
              <>
                <h3 className="font-display text-xl text-ink">¿Eliminar {leagueName}?</h3>
                <p className="mt-2 text-sm text-ink-2">
                  Sos el único miembro. La liga se elimina para siempre y su código deja de funcionar.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={onDelete}
                    disabled={busy}
                    className="rounded-[6px] bg-danger px-4 py-2.5 text-sm font-display text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {busy ? "Eliminando…" : "Eliminar liga"}
                  </button>
                  <button
                    onClick={() => setDangerOpen(false)}
                    disabled={busy}
                    className="rounded-[6px] border border-border px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl text-ink">¿Salir de {leagueName}?</h3>
                <p className="mt-2 text-sm text-ink-2">
                  La liga tiene más miembros, así que tenés que dejar un nuevo dueño antes de salir.
                </p>
                <label className="mt-4 block">
                  <Eyebrow className="mb-1">Nuevo dueño</Eyebrow>
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    disabled={busy}
                    className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors disabled:opacity-50"
                  >
                    {otherMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.username ?? m.entryName ?? "DT"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={onTransferAndLeave}
                    disabled={busy || !newOwnerId}
                    className="rounded-[6px] bg-danger px-4 py-2.5 text-sm font-display text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {busy ? "Saliendo…" : "Transferir y salir"}
                  </button>
                  <button
                    onClick={() => setDangerOpen(false)}
                    disabled={busy}
                    className="rounded-[6px] border border-border px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
