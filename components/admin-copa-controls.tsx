"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCopaStatus, snapshotCopaRanking } from "@/lib/admin-actions";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { cn } from "@/lib/utils";

type Copa = {
  id: number;
  code: string;
  name: string;
  status: string;
  capacity: number | null;
  enrolled: number;
};
type Orphan = {
  orderId: number;
  status: string;
  userId: number;
  username: string | null;
  amount: number;
  currency: string;
  providerRef: string | null;
  paidAt: Date | string | null;
  copaId: number;
  copaName: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador (reserva)",
  open: "Abierta",
  full: "Cupo lleno",
  closed: "Cerrada",
};

const NEXT_STATUS: { value: string; label: string }[] = [
  { value: "open", label: "Abrir" },
  { value: "draft", label: "Pasar a reserva" },
  { value: "closed", label: "Cerrar" },
];

export function AdminCopaControls({ copas, orphans }: { copas: Copa[]; orphans: Orphan[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [log, setLog] = useState<Record<number, { ok: boolean; msg: string }>>({});

  async function run(id: number, fn: () => Promise<{ ok: boolean } & Record<string, unknown>>, key = id) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    setLog((p) => ({ ...p, [key]: { ok: r.ok, msg: r.ok ? String(r.info ?? "OK") : `Error: ${String(r.error)}` } }));
    if (r.ok) router.refresh();
  }

  if (copas.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-ink">Copas premium (Liga Premium)</div>
        <Eyebrow>Abrir/cerrar copas a mano y congelar el ranking final para el payout</Eyebrow>
      </div>

      <div className="space-y-2">
        {copas.map((c) => {
          const result = log[c.id];
          const isBusy = busy === c.id;
          return (
            <div key={c.id} className="rounded-[6px] border border-border bg-surface p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{c.name} <span className="text-ink-2">({c.code})</span></div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Eyebrow>{STATUS_LABEL[c.status] ?? c.status}</Eyebrow>
                    <span className="text-[11px] font-medium text-ink-2">
                      {c.enrolled}{c.capacity != null ? ` / ${c.capacity}` : ""} inscriptos
                    </span>
                    {result && (
                      <span className={cn("text-[11px] font-medium", result.ok ? "text-success" : "text-danger")}>
                        · {result.msg}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUS.filter((s) => s.value !== c.status).map((s) => (
                    <button
                      key={s.value}
                      disabled={isBusy}
                      onClick={() => run(c.id, () => setCopaStatus(c.id, s.value))}
                      className="rounded-[6px] border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all disabled:opacity-50"
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    disabled={isBusy}
                    onClick={() => {
                      if (confirm(`¿Congelar el ranking final de "${c.name}"? Correr solo DESPUÉS de publicar la Final.`))
                        run(c.id, () => snapshotCopaRanking(c.id));
                    }}
                    className="rounded-[6px] border border-gold-border bg-surface px-3 py-1.5 text-xs font-semibold text-gold-ink hover:bg-gold-bg hover:border-gold transition-all disabled:opacity-50"
                  >
                    Congelar ranking
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reconciliación: pagaron pero no entraron → reembolsar a mano en Mercado Pago. */}
      <div className="mt-4">
        <div className="text-sm font-semibold text-ink">Pagos sin lugar (a reembolsar)</div>
        <Eyebrow>Órdenes pagas sin inscripción (overflow / fuera de término). Reembolsar a mano en MP.</Eyebrow>
        {orphans.length === 0 ? (
          <p className="mt-2 text-xs text-ink-2">No hay pagos pendientes de reembolso. 🎉</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-2">
                <tr>
                  <th className="py-1 pr-3">Orden</th>
                  <th className="py-1 pr-3">Usuario</th>
                  <th className="py-1 pr-3">Copa</th>
                  <th className="py-1 pr-3">Monto</th>
                  <th className="py-1 pr-3">Ref MP</th>
                  <th className="py-1 pr-3">Estado</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {orphans.map((o) => (
                  <tr key={o.orderId} className="border-t border-border">
                    <td className="py-1 pr-3">#{o.orderId}</td>
                    <td className="py-1 pr-3">{o.username ?? `user ${o.userId}`}</td>
                    <td className="py-1 pr-3">{o.copaName}</td>
                    <td className="py-1 pr-3">{o.amount} {o.currency}</td>
                    <td className="py-1 pr-3 font-mono">{o.providerRef ?? "—"}</td>
                    <td className="py-1 pr-3">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
