"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { syncRoundAction, publishRoundAction } from "@/lib/admin-actions";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { cn } from "@/lib/utils";

type R = { id: number; name: string; status: string };
type ActionResult = { ok: true; info: string } | { ok: false; error: string };

const STATUS_LABEL: Record<string, string> = {
  pending:   "Pendiente",
  published: "Publicada",
  live:      "En curso",
};

export function AdminControls({ rounds }: { rounds: R[] }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [log,  setLog]  = useState<Record<number, { ok: boolean; msg: string }>>({});

  async function run(id: number, fn: (id: number) => Promise<ActionResult>, label: string) {
    setBusy(id);
    const r = await fn(id);
    setBusy(null);
    setLog((p) => ({
      ...p,
      [id]: { ok: r.ok, msg: r.ok ? `${label}: ${r.info}` : `Error: ${r.error}` },
    }));
  }

  return (
    <div className="space-y-2">
      {rounds.map((r) => {
        const isLive = busy === r.id;
        const result = log[r.id];
        const statusLabel = STATUS_LABEL[r.status] ?? r.status;

        return (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink text-sm">{r.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Eyebrow>{statusLabel}</Eyebrow>
                  {result && (
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        result.ok ? "text-success" : "text-danger",
                      )}
                    >
                      · {result.msg}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={isLive}
                  onClick={() => run(r.id, syncRoundAction, "Sync")}
                  className="rounded-[6px] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all disabled:opacity-50"
                >
                  Sincronizar
                </button>
                <button
                  disabled={isLive}
                  onClick={() => run(r.id, publishRoundAction, "Publicado")}
                  className={cn(
                    "rounded-[6px] px-4 py-2 font-display text-base text-white transition-colors disabled:opacity-50",
                    r.status === "published"
                      ? "bg-success cursor-default"
                      : "bg-blue hover:bg-blue-hover",
                  )}
                >
                  {r.status === "published" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check size={16} strokeWidth={1.5} aria-hidden />
                      PUBLICADA
                    </span>
                  ) : (
                    "PUBLICAR FECHA"
                  )}
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
