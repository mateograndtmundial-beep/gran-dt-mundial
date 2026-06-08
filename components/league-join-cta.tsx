"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { joinLeague } from "@/lib/actions";
import { Card } from "@/components/ui";
import { PrimaryButton } from "@/components/editorial";

// Recordamos la intención de unirse mientras el invitado se registra y elige su
// nombre de DT, así al volver lo unimos solo.
const PENDING_KEY = "pendingLeague";

/**
 * CTA para unirse a una liga desde el link de invitación (/ligas/[code]).
 *
 * Ojo con el onboarding: un usuario logueado pero SIN nombre de DT (username null)
 * tiene bloqueadas las acciones por el gate del middleware — si intenta unirse ahí,
 * el join choca con el gate y falla. Por eso el flujo es:
 *   sin cuenta        → registrarse → (vuelve) → elegir nombre → (vuelve) → se une solo
 *   con cuenta sin DT  → elegir nombre (/bienvenida) → (vuelve) → se une solo
 *   con cuenta + DT    → se une al toque
 */
export function LeagueJoinCTA({
  code,
  leagueName,
  isMember,
  isAuthed,
  isOnboarded,
}: {
  code: string;
  leagueName: string;
  isMember: boolean;
  isAuthed: boolean;
  isOnboarded: boolean;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const autoTried = useRef(false);

  const leaguePath = `/ligas/${code}`;
  const remember = () => {
    try {
      localStorage.setItem(PENDING_KEY, code);
    } catch {}
  };

  // Sólo se llama con el usuario logueado Y con nombre de DT (si no, el gate bloquea el join).
  async function join() {
    setBusy(true);
    setErr(null);
    try {
      const r = await joinLeague(code);
      if (!r.ok) {
        setErr("No pudimos unirte a la liga. Probá de nuevo en un momento.");
        return;
      }
      try {
        localStorage.removeItem(PENDING_KEY);
      } catch {}
      setJoined(true);
      router.refresh();
    } catch {
      setErr("No pudimos unirte a la liga. Probá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  // Rutea según el estado de la sesión. Recién une cuando hay cuenta + nombre de DT.
  function onJoinClick() {
    if (!isAuthed) {
      remember();
      router.push(`/sign-up?redirect_url=${encodeURIComponent(leaguePath)}`);
      return;
    }
    if (!isOnboarded) {
      remember();
      router.push(`/bienvenida?next=${encodeURIComponent(leaguePath)}`);
      return;
    }
    void join();
  }

  // Al volver con intención pendiente: completar onboarding si falta, o unirse solo.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    if (!isAuthed || isMember) return;
    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_KEY) === code;
    } catch {}
    if (!pending) return;
    if (!isOnboarded) {
      router.push(`/bienvenida?next=${encodeURIComponent(leaguePath)}`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isMember && !joined) return null;

  if (joined) {
    return (
      <Card className="border-success/40 bg-success/5 p-4">
        <p className="font-display text-lg text-ink">¡Te uniste a {leagueName}! 🎉</p>
        <p className="mt-1 text-sm text-ink-3">Ahora armá (o revisá) tu equipo para empezar a sumar.</p>
        <div className="mt-3">
          <PrimaryButton href="/equipo">ARMÁ TU EQUIPO →</PrimaryButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-blue/30 bg-blue-light/40 p-4">
      <p className="font-display text-lg text-ink">¿Te invitaron a {leagueName}?</p>
      <p className="mt-1 text-sm text-ink-3">Unite para competir con tu equipo en esta liga.</p>
      <div className="mt-3">
        <PrimaryButton onClick={onJoinClick} disabled={busy}>
          {busy ? "Uniéndote…" : "UNIRME A ESTA LIGA →"}
        </PrimaryButton>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-danger">{err}</p>}
    </Card>
  );
}
