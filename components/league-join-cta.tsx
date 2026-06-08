"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { joinLeague } from "@/lib/actions";
import { Card } from "@/components/ui";
import { PrimaryButton } from "@/components/editorial";

// Recordamos la intención de unirse mientras el invitado se registra/loguea, así
// al volver lo unimos solo (el middleware preserva el path pero no el query).
const PENDING_KEY = "pendingLeague";

/**
 * CTA para unirse a una liga desde el link de invitación (/ligas/[code]).
 * - Logueado y NO miembro → se une al toque y muestra el siguiente paso (armar equipo).
 * - Sin loguear → guarda la intención, lo manda a registrarse y vuelve a esta liga,
 *   donde se une automáticamente.
 * - Ya miembro (incluye al dueño) → no muestra nada.
 */
export function LeagueJoinCTA({
  code,
  leagueName,
  isMember,
  isAuthed,
}: {
  code: string;
  leagueName: string;
  isMember: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const autoTried = useRef(false);

  async function doJoin() {
    setBusy(true);
    setErr(null);
    try {
      const r = await joinLeague(code);
      if (!r.ok) {
        if (r.error === "auth") {
          try {
            localStorage.setItem(PENDING_KEY, code);
          } catch {}
          router.push(`/sign-up?redirect_url=${encodeURIComponent(`/ligas/${code}`)}`);
          return;
        }
        setErr("No pudimos unirte a la liga. Probá de nuevo.");
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

  // Al volver del registro: si veníamos con intención de unirnos a ESTA liga, lo hacemos solo.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    if (!isAuthed || isMember) return;
    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_KEY) === code;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pending) void doJoin();
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
        <PrimaryButton onClick={doJoin} disabled={busy}>
          {busy ? "Uniéndote…" : "UNIRME A ESTA LIGA →"}
        </PrimaryButton>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-danger">{err}</p>}
    </Card>
  );
}
