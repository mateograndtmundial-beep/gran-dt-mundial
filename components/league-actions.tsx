"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeague, joinLeague } from "@/lib/actions";
import { PrimaryButton } from "@/components/editorial";

type Mode = "idle" | "create" | "join";

export function LeagueActions() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg,  setMsg]  = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset(next: Mode) {
    setMode(next);
    setMsg(null);
  }

  async function onCreate() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await createLeague(name);
      if (!r.ok && r.error === "auth") return router.push("/sign-in");
      if (r.ok) return router.push(`/ligas/${r.code}`);
      // createLeague hoy sólo devuelve "auth" o ok — pero cubrimos cualquier
      // otro código que se agregue a futuro con un mensaje genérico.
      setMsg("No pudimos crear la liga. Probá de nuevo.");
    } catch {
      // p.ej. colisión de código de invitación (genCode) u otro error del server.
      setMsg("No pudimos crear la liga. Probá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await joinLeague(code);
      if (!r.ok && r.error === "auth") return router.push("/sign-in");
      if (!r.ok && r.error === "premium") {
        // Copa premium: no se entra con código, la inscripción es paga.
        setMsg("Esa es una Copa premium: se entra inscribiéndote, no con código.");
        return;
      }
      if (!r.ok) {
        // joinLeague devuelve "auth" | "premium" | "not-found" además de ok.
        setMsg("No se encontró ninguna liga con ese código.");
        return;
      }
      router.push(`/ligas/${r.code}`);
    } catch {
      setMsg("No pudimos unirte a la liga. Probá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Estado colapsado: el camino principal es CREAR; unirse con código es secundario
          (lo normal es entrar por el link compartido, que ya tiene su propio CTA). */}
      {mode === "idle" && (
        <div className="space-y-3">
          <PrimaryButton onClick={() => reset("create")} className="w-full justify-center">
            + CREAR LIGA
          </PrimaryButton>
          <p className="text-center text-sm text-ink-3">
            ¿Tenés un código de invitación?{" "}
            <button
              onClick={() => reset("join")}
              className="font-semibold text-blue underline-offset-2 hover:underline"
            >
              Unite →
            </button>
          </p>
        </div>
      )}

      {/* Crear: nombre + confirmar/cancelar */}
      {mode === "create" && (
        <div className="rounded-[10px] border border-border bg-surface p-4 space-y-3 animate-fade-in">
          <label className="eyebrow block text-ink-3">Nombre de la liga</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && !busy && onCreate()}
            placeholder="Ej: Los cracks del barrio"
            className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
          />
          <div className="flex gap-2">
            <PrimaryButton onClick={onCreate} disabled={busy || !name.trim()} className="flex-1 justify-center">
              {busy ? "Creando…" : "Crear liga"}
            </PrimaryButton>
            <button
              onClick={() => reset("idle")}
              disabled={busy}
              className="rounded-[6px] border border-border px-4 py-3 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Unirse con código (secundario) */}
      {mode === "join" && (
        <div className="rounded-[10px] border border-border bg-surface p-4 space-y-3 animate-fade-in">
          <label className="eyebrow block text-ink-3">Código de invitación</label>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && !busy && onJoin()}
            placeholder="Ej: ABC123"
            maxLength={6}
            className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2.5 text-sm text-ink uppercase outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors font-mono tracking-widest"
          />
          <div className="flex gap-2">
            <button
              onClick={onJoin}
              disabled={busy || code.length < 4}
              className="flex-1 rounded-[6px] border border-gold-border bg-gold-bg text-gold-ink font-display text-base px-6 py-3 hover:bg-gold hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Uniéndote…" : "UNIRME"}
            </button>
            <button
              onClick={() => reset("idle")}
              disabled={busy}
              className="rounded-[6px] border border-border px-4 py-3 text-sm font-semibold text-ink-2 hover:bg-surface-2 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs font-semibold text-danger">{msg}</p>}
    </div>
  );
}
