"use client";

import { useState } from "react";
import Link from "next/link";
import { PrimaryButton } from "@/components/editorial";
import { createEntryOrder } from "@/lib/payment-actions";

/**
 * CTA de inscripción a la Liga Premium (el cobro en Mercado Pago aparece como "GOLDEN
 * TICKET"). Pide aceptar las Bases y Condiciones (checkbox obligatorio) y, al confirmar,
 * crea la orden y redirige al checkout de Mercado Pago. Los errores del backend se
 * mapean a un mensaje claro. Si no hay `entrySku` (copa sin producto), queda deshabilitado.
 */
const ERROR_MSG: Record<string, string> = {
  paused: "Las inscripciones están en pausa.",
  closed: "La inscripción está cerrada.",
  full: "La copa ya está completa.",
  already: "Ya estás dentro de esta copa.",
  unavailable: "El pago no está disponible por ahora.",
  auth: "Ingresá para inscribirte.",
  product: "No pudimos encontrar la entrada.",
  price: "No pudimos calcular el precio.",
};

export function EnrollButton({ entrySku }: { entrySku: string | null }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    if (!entrySku || !accepted || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await createEntryOrder(entrySku);
      if (r.ok) {
        window.location.assign(r.url);
        return; // dejamos el loading puesto durante la redirección
      }
      setError(ERROR_MSG[r.error] ?? "No pudimos iniciar el pago. Probá de nuevo.");
    } catch {
      setError("No pudimos iniciar el pago. Probá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
        />
        <span>
          Acepto las{" "}
          <Link href="/bases" target="_blank" className="font-semibold text-gold-ink underline">
            Bases y Condiciones
          </Link>
          .
        </span>
      </label>

      <PrimaryButton
        disabled={!entrySku || !accepted || loading}
        onClick={enroll}
        className="w-full justify-center bg-gold-ink hover:bg-gold-ink"
      >
        {loading ? "REDIRIGIENDO…" : "INSCRIBIRME"}
      </PrimaryButton>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
