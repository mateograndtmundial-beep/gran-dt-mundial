"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeague, joinLeague } from "@/lib/actions";
import { Card } from "@/components/ui";

export function LeagueActions() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setBusy(true);
    setMsg(null);
    const r = await createLeague(name);
    setBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (r.ok) router.push(`/ligas/${r.code}`);
  }

  async function onJoin() {
    setBusy(true);
    setMsg(null);
    const r = await joinLeague(code);
    setBusy(false);
    if (!r.ok && r.error === "auth") return router.push("/sign-in");
    if (!r.ok) return setMsg("No se encontró ninguna liga con ese código.");
    router.push(`/ligas/${r.code}`);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <h3 className="mb-2 font-bold">Crear liga</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la liga"
          className="mb-2 w-full rounded-lg border border-white/10 bg-pitch px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={onCreate}
          disabled={busy}
          className="w-full rounded-lg bg-accent py-2 font-bold text-pitch disabled:opacity-50"
        >
          Crear
        </button>
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">Unirme con código</h3>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ej: ABC123"
          maxLength={6}
          className="mb-2 w-full rounded-lg border border-white/10 bg-pitch px-3 py-2 text-sm uppercase outline-none focus:border-accent"
        />
        <button
          onClick={onJoin}
          disabled={busy}
          className="w-full rounded-lg bg-gold py-2 font-bold text-pitch disabled:opacity-50"
        >
          Unirme
        </button>
        {msg && <p className="mt-2 text-xs text-amber-300">{msg}</p>}
      </Card>
    </div>
  );
}
