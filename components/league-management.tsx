"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameLeague, removeMember } from "@/lib/actions";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";

type Member = { userId: number; username: string | null; entryName: string | null };

export function LeagueManagement({
  leagueId,
  leagueName,
  ownerId,
  members,
}: {
  leagueId: number;
  leagueName: string;
  ownerId: number;
  members: Member[];
}) {
  const router = useRouter();
  const [name, setName] = useState(leagueName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<{ userId: number; label: string } | null>(null);

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
