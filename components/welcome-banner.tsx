"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";

const STORAGE_KEY = "sampa.welcomeSeen";

export function WelcomeBanner() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  // Lee localStorage solo en el cliente para evitar el flash. Diferimos a rAF
  // para no llamar setState de forma síncrona dentro del effect (regla de lint).
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
    <Card className="relative border-l-4 border-l-blue p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-[6px] p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X size={18} strokeWidth={1.5} aria-hidden />
      </button>

      <Eyebrow className="mb-2">PRIMERA VEZ POR ACÁ</Eyebrow>
      <h2 className="font-display text-xl leading-none tracking-tight text-ink">
        Bienvenido a Los 11 de Sampa
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
        Sos el DT: armás tu plantel del Mundial, elegís capitán y técnico, y sumás puntos fecha a
        fecha. Antes de arrancar, leé cómo se juega y cómo se reparten los puntos.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PrimaryButton href="/como-funciona" onClick={dismiss}>
          Cómo funciona
        </PrimaryButton>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm font-semibold text-ink-2 transition-colors hover:text-blue"
        >
          Entendido
        </button>
      </div>
    </Card>
  );
}
