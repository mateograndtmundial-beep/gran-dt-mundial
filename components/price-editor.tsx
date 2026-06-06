"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlayerPrice } from "@/lib/admin-actions";
import { PRICING } from "@/lib/game/config";
import { PositionChip } from "@/components/editorial";
import { cn, formatPrice } from "@/lib/utils";
import type { Position } from "@/lib/game/config";

type P = {
  id: number;
  name: string;
  position: Position;
  price: number;
  countryName: string;
  flagUrl: string | null;
};

const LIMIT = 250;

export function PriceEditor({ players }: { players: P[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [saved, setSaved] = useState<Record<number, number>>({}); // id → precio guardado
  const [err, setErr] = useState<Record<number, string>>({});

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return players
      .filter((p) => {
        if (onlyReview && (saved[p.id] ?? p.price) > PRICING.MIN) return false;
        return (
          p.name.toLowerCase().includes(needle) ||
          p.countryName.toLowerCase().includes(needle)
        );
      })
      .slice(0, LIMIT);
  }, [players, q, onlyReview, saved]);

  const reviewCount = players.filter((p) => (saved[p.id] ?? p.price) <= PRICING.MIN).length;

  async function save(p: P) {
    const raw = draft[p.id];
    const value = raw == null ? p.price : Number(raw.replace(",", "."));
    if (!Number.isFinite(value)) {
      setErr((e) => ({ ...e, [p.id]: "Número inválido" }));
      return;
    }
    setBusy(p.id);
    setErr((e) => ({ ...e, [p.id]: "" }));
    const r = await updatePlayerPrice(p.id, value);
    setBusy(null);
    if (!r.ok) {
      if (r.error === "forbidden") return router.push("/sign-in");
      setErr((e) => ({ ...e, [p.id]: r.error }));
      return;
    }
    setSaved((s) => ({ ...s, [p.id]: r.price }));
    setDraft((d) => ({ ...d, [p.id]: String(r.price).replace(".", ",") }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar jugador o país…"
          className="flex-1 min-w-48 rounded-[8px] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-border-strong focus:outline-none"
        />
        <label className="flex items-center gap-1.5 text-sm text-ink-2 cursor-pointer">
          <input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} className="accent-blue" />
          Solo a revisar ({reviewCount})
        </label>
      </div>

      <p className="eyebrow">
        {filtered.length} {filtered.length === 1 ? "jugador" : "jugadores"}
        {filtered.length === LIMIT ? " (refiná la búsqueda para ver más)" : ""}
      </p>

      <div className="space-y-1.5">
        {filtered.map((p) => {
          const current = saved[p.id] ?? p.price;
          const needsReview = current <= PRICING.MIN;
          const value = draft[p.id] ?? formatPrice(current);
          const dirty = Number(value.replace(",", ".")) !== current;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-[8px] border bg-surface px-3 py-2",
                needsReview ? "border-warning/60" : "border-border",
              )}
            >
              {p.flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.flagUrl} alt={p.countryName} className="h-4 w-6 rounded-sm object-cover shrink-0" />
              ) : (
                <div className="h-4 w-6 rounded-sm bg-surface-2 shrink-0" />
              )}
              <PositionChip position={p.position} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                <div className="truncate text-xs text-ink-3">
                  {p.countryName}
                  {needsReview ? <span className="ml-1 text-warning">· revisar</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") save(p); }}
                  className="w-20 rounded-[6px] border border-border bg-canvas px-2 py-1 text-right text-sm text-ink focus:border-border-strong focus:outline-none"
                />
                <span className="text-xs text-ink-3">M</span>
                <button
                  disabled={busy === p.id || !dirty}
                  onClick={() => save(p)}
                  className="rounded-[6px] bg-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-hover transition-colors disabled:opacity-40"
                >
                  {busy === p.id ? "…" : "Guardar"}
                </button>
              </div>
              {err[p.id] ? <span className="text-[11px] text-danger">{err[p.id]}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
