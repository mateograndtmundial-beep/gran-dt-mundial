"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeague, joinLeague } from "@/lib/actions";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";

export function LeagueActions() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg,  setMsg]  = useState<string | null>(null);
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
      {/* Crear liga */}
      <Card className="p-4 space-y-3">
        <Eyebrow>Crear liga</Eyebrow>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la liga"
          className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
        />
        <PrimaryButton onClick={onCreate} disabled={busy || !name.trim()} className="w-full justify-center">
          {busy ? "Creando…" : "CREAR LIGA →"}
        </PrimaryButton>
      </Card>

      {/* Unirse */}
      <Card className="p-4 space-y-3">
        <Eyebrow>Unirme con código</Eyebrow>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ej: ABC123"
          maxLength={6}
          className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink uppercase outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors font-mono tracking-widest"
        />
        <button
          onClick={onJoin}
          disabled={busy || code.length < 4}
          className="w-full rounded-[6px] border border-gold-border bg-gold-bg text-gold-ink font-display text-base px-6 py-3 hover:bg-gold hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          UNIRME
        </button>
        {msg && (
          <p className="text-xs font-semibold text-danger">{msg}</p>
        )}
      </Card>
    </div>
  );
}
