"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Clock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PrimaryButton } from "@/components/editorial";
import { roundWithArticle } from "@/lib/game/round-format";

const STORAGE_PREFIX = "sampa.changeReminderDismissed";

/**
 * Popup "te quedan menos de 24 h para cambiar tu equipo". El server
 * (`ChangeReminder` → `getChangeReminder`) ya decidió que aplica (usuario con
 * equipo, dentro de la ventana de 24 h y sin cambios hechos); este componente
 * solo gestiona la presentación, el countdown amable y que se vea UNA sola vez
 * por fecha (localStorage keyed por `roundId`, mismo patrón que WelcomeBanner /
 * LineupLockNotice). Como la key incluye el roundId, vuelve a aparecer una vez
 * en cada fecha nueva sin acumular molestia.
 */
export function ChangeReminderPopup({
  roundId,
  roundName,
  deadline,
}: {
  roundId: number;
  roundName: string;
  deadline: string;
}) {
  const [show, setShow] = useState(false);
  const router = useRouter();
  const posthog = usePostHog();
  const trackedShown = useRef(false);
  const storageKey = `${STORAGE_PREFIX}.${roundId}`;

  // Lectura diferida a rAF: evita el flash y no toca localStorage en SSR.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      let visible = true;
      try {
        visible = localStorage.getItem(storageKey) !== "1";
      } catch {
        visible = true;
      }
      setShow(visible);
      // Solo lo contamos como "mostrado" cuando efectivamente se ve (una vez).
      if (visible && !trackedShown.current) {
        trackedShown.current = true;
        posthog?.capture("change_reminder_shown", { round_id: roundId });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [storageKey, posthog, roundId]);

  function dismiss(via: "close" | "ahora_no" = "close") {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    posthog?.capture("change_reminder_dismissed", { round_id: roundId, via });
    setShow(false);
  }

  function goEdit() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    posthog?.capture("change_reminder_cta_click", { round_id: roundId });
    setShow(false);
    router.push("/equipo");
  }

  if (!show) return null;

  const deadlineLabel = new Date(deadline).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <Dialog open={show} onOpenChange={(open) => !open && dismiss()}>
      {/* Bottom-sheet a ancho completo en mobile; tarjeta centrada en desktop. */}
      <DialogContent
        showCloseButton
        className="top-auto bottom-0 left-0 max-w-full translate-x-0 translate-y-0 gap-3 rounded-b-none rounded-t-2xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-ink">
            <Clock size={18} strokeWidth={2} aria-hidden />
          </span>
          <h2 className="font-display text-xl leading-none tracking-tight text-ink">
            Te quedan menos de 24 h
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-ink-2">
          El cierre de la ventana para los cambios de{" "}
          <strong className="text-ink">{roundWithArticle(roundName)}</strong> es el{" "}
          <strong className="text-ink">{deadlineLabel}</strong> (hora Argentina). Si querés cambiar tu
          equipo para esta fecha, hacelo antes — después queda cerrado y el equipo que tenías en ese
          momento es el que va a sumar tus puntos!
        </p>

        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => dismiss("ahora_no")}
            className="rounded-[6px] px-3 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
          >
            Ahora no
          </button>
          <PrimaryButton onClick={goEdit} className="justify-center py-2.5">
            Editar mi equipo →
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
