"use client";

import { useState } from "react";
import { generateMatchRecapAction } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

/**
 * Botón por partido: fuerza la generación + posteo de la story a #SOCIAL (re-trigger,
 * aunque ya se haya posteado). Se deshabilita si el partido no tiene stats cargadas.
 */
export function MatchRecapButton({ matchId, hasStats }: { matchId: number; hasStats: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const r = await generateMatchRecapAction(matchId);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: r.info } : { ok: false, text: r.error });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className={cn("text-[11px] font-medium", msg.ok ? "text-success" : "text-danger")}>{msg.text}</span>
      )}
      <button
        onClick={run}
        disabled={busy || !hasStats}
        title={hasStats ? "Genera y postea la story a #SOCIAL" : "El partido todavía no tiene stats cargadas"}
        className="rounded-[6px] border border-blue/40 bg-surface px-3 py-1.5 text-sm font-semibold text-blue hover:bg-blue/5 hover:border-blue transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Generando…" : "Generar story →"}
      </button>
    </div>
  );
}
