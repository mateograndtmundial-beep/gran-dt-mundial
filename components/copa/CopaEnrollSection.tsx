"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/editorial";
import { EnrollButton } from "./EnrollButton";

/**
 * Sección de inscripción de la Liga Premium en /copa. Decide qué mostrar según si el
 * usuario ya armó su equipo:
 *
 * - CON equipo (`needsTeam=false`) → el flujo de pago directo (`EnrollButton`).
 * - SIN equipo (`needsTeam=true`) → empujamos primero a armar el equipo (el gancho gratis
 *   que invierte al usuario antes de pedirle la plata). El CTA primario lleva al armador;
 *   debajo, un link discreto "Prefiero inscribirme igual" revela el pago para no bloquear
 *   a quien está decidido (es un empujón fuerte, no un muro).
 *
 * Mobile-first: botones a ancho completo, apilados.
 */
export function CopaEnrollSection({
  entrySku,
  needsTeam,
}: {
  entrySku: string | null;
  needsTeam: boolean;
}) {
  const [showEnroll, setShowEnroll] = useState(false);

  if (!needsTeam) return <EnrollButton entrySku={entrySku} />;

  return (
    <div className="flex flex-col gap-2">
      <PrimaryButton
        href="/equipo?from=copa"
        className="w-full justify-center bg-gold-ink hover:bg-gold-ink"
      >
        ARMÁ TU EQUIPO →
      </PrimaryButton>
      <p className="text-center text-xs text-ink-3">
        Armás tu equipo (gratis) y después te sumás a la copa.
      </p>

      {showEnroll ? (
        <div className="mt-1 border-t border-gold-border/60 pt-3">
          <EnrollButton entrySku={entrySku} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowEnroll(true)}
          className="text-center text-xs font-semibold text-ink-3 underline underline-offset-2 hover:text-ink-2"
        >
          Prefiero inscribirme igual
        </button>
      )}
    </div>
  );
}
