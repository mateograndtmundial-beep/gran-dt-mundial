"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function Digit({ v, l, isChanging }: { v: number; l: string; isChanging: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "jersey-numeral text-[clamp(3rem,7vw,6rem)] leading-none tracking-tight text-ink",
          isChanging && "animate-countdown-tick",
        )}
        key={isChanging ? "changing" : "stable"}
      >
        {String(v).padStart(2, "0")}
      </span>
      <span className="eyebrow">{l}</span>
    </div>
  );
}

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);
  const [prevSec, setPrevSec] = useState<number | null>(null);

  useEffect(() => {
    // El primer set va en rAF (no sincrónico en el cuerpo del effect) para no
    // disparar renders en cascada; igual mantenemos el esqueleto hasta montar.
    const tick = () =>
      setNow((prev) => {
        setPrevSec(prev !== null ? Math.floor((Math.max(0, new Date(target).getTime() - prev) % 60000) / 1000) : null);
        return Date.now();
      });
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [target]);

  if (now === null) {
    return (
      <div className="flex gap-6">
        {["DÍAS", "HS", "MINUTOS", "SEG"].map((l) => (
          <div key={l} className="flex flex-col items-center gap-1">
            <span className="jersey-numeral text-[clamp(3rem,7vw,6rem)] leading-none tracking-tight text-ink-faint animate-pulse-skeleton">
              --
            </span>
            <span className="eyebrow">{l}</span>
          </div>
        ))}
      </div>
    );
  }

  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const isSecChanging = prevSec !== null && prevSec !== s;

  return (
    // role=timer + label estático: describe la cuenta sin anunciar cada segundo
    // (un aria-live por tick sería ruido para lectores de pantalla).
    <div
      className="flex items-start gap-2 md:gap-4"
      role="timer"
      aria-label={`Faltan ${d} días, ${h} horas y ${m} minutos para el inicio`}
    >
      <Digit v={d} l="DÍAS" isChanging={false} />
      <span className="jersey-numeral text-2xl text-ink-3 self-start mt-3">:</span>
      <Digit v={h} l="HS" isChanging={false} />
      <span className="jersey-numeral text-2xl text-ink-3 self-start mt-3">:</span>
      <Digit v={m} l="MINUTOS" isChanging={false} />
      <span className="jersey-numeral text-2xl text-ink-3 self-start mt-3">:</span>
      <Digit v={s} l="SEG" isChanging={isSecChanging} />
    </div>
  );
}
