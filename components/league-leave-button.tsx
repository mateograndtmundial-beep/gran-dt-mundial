"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveLeague } from "@/lib/actions";

export function LeagueLeaveButton({ leagueId, leagueName }: { leagueId: number; leagueName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirmLeave() {
    setBusy(true);
    setErr(null);
    const r = await leaveLeague(leagueId);
    setBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) {
      setErr("No pudimos sacarte de la liga. Probá de nuevo en un momento.");
      return;
    }
    setConfirming(false);
    router.push("/ligas");
    router.refresh();
  }

  return (
    <>
      <div className="text-center">
        <button
          onClick={() => setConfirming(true)}
          className="text-xs font-semibold text-danger hover:underline"
        >
          Salir de esta liga
        </button>
        {err && <p className="mt-2 text-xs font-semibold text-danger">{err}</p>}
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar salida de la liga"
          onClick={() => !busy && setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-[12px] border border-border bg-surface card-shadow-lg p-5 md:rounded-[12px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-ink">¿Salir de {leagueName}?</h3>
            <p className="mt-2 text-sm text-ink-2">
              Vas a dejar de aparecer en este ranking. Podés volver a unirte después con el código de la liga.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={confirmLeave}
                disabled={busy}
                className="rounded-[6px] bg-danger px-4 py-2.5 text-sm font-display text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {busy ? "Saliendo…" : "Salir de la liga"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="rounded-[6px] border border-border px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
