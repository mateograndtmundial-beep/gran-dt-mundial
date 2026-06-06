"use client";

import { useState } from "react";
import { syncRoundAction, publishRoundAction } from "@/lib/admin-actions";
import { Card } from "@/components/ui";

type R = { id: number; name: string; status: string };
type ActionResult = { ok: true; info: string } | { ok: false; error: string };

export function AdminControls({ rounds }: { rounds: R[] }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [log, setLog] = useState<Record<number, string>>({});

  async function run(id: number, fn: (id: number) => Promise<ActionResult>, label: string) {
    setBusy(id);
    const r = await fn(id);
    setBusy(null);
    setLog((p) => ({ ...p, [id]: r.ok ? `${label}: ${r.info}` : `Error: ${r.error}` }));
  }

  return (
    <div className="space-y-2">
      {rounds.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-white/40">
                {r.status}
                {log[r.id] ? ` · ${log[r.id]}` : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy === r.id}
                onClick={() => run(r.id, syncRoundAction, "Sync")}
                className="rounded bg-white/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                Sincronizar
              </button>
              <button
                disabled={busy === r.id}
                onClick={() => run(r.id, publishRoundAction, "Publicado")}
                className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-pitch disabled:opacity-50"
              >
                Publicar
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
