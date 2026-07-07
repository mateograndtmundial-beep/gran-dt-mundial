"use client";

import { useEffect, useState } from "react";
import { X, Repeat } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";

// Key única (una sola vez, no por-fecha): es una novedad, no un recordatorio
// recurrente. Se descarta para siempre al cerrarla. Mismo patrón de localStorage
// que WelcomeBanner.
const STORAGE_KEY = "sampa.doblesCambioSeen";

/**
 * Aviso de novedad: "ahora 2 cambios gratis por fecha" en playoffs. El gate
 * server-side (`DoubleChangeBanner`) ya decidió que el beneficio está vigente;
 * este componente solo gestiona la presentación y que se vea una sola vez
 * (localStorage). Banner dismissible, no un modal, para no ser invasivo.
 */
export function DoubleChangeNotice() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  // Lee localStorage solo en el cliente (diferido a rAF) para evitar el flash.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      try {
        setShow(localStorage.getItem(STORAGE_KEY) !== "1");
      } catch {
        setShow(false);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!mounted || !show) return null;

  return (
    <Card className="relative border-l-4 border-l-gold p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-[6px] p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X size={18} strokeWidth={1.5} aria-hidden />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-ink">
          <Repeat size={18} strokeWidth={2} aria-hidden />
        </span>
        <div>
          <Eyebrow className="mb-1.5">NOVEDAD · PLAYOFFS</Eyebrow>
          <h2 className="font-display text-xl leading-none tracking-tight text-ink">
            Ahora tenés 2 cambios gratis por fecha
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
            Desde los 8vos de Final duplicamos los cambios sin costo: cada fecha podés mover{" "}
            <strong className="text-ink">2 jugadores gratis</strong> (antes era 1). Aprovechalo para
            reforzar tu equipo con las selecciones que siguen en carrera.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PrimaryButton href="/equipo" onClick={dismiss}>
              Editar mi equipo
            </PrimaryButton>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
