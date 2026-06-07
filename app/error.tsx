"use client";

import { useEffect } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/editorial";
import { reportClientError } from "@/lib/error-actions";

// Error boundary global: captura fallos de render/datos en cualquier ruta y ofrece
// reintentar, en vez de mostrar un estado vacío ambiguo o una pantalla rota.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Visibilidad en consola/observabilidad. Reemplazable por un logger real.
    console.error(error);
    // Reporte a Slack (no bloquea ni rompe si falla).
    reportClientError({
      message: error.message,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
    }).catch(() => {});
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="eyebrow text-danger">Algo salió mal</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none text-ink">
        No pudimos cargar esto
      </h1>
      <p className="mt-3 text-sm text-ink-3">
        Hubo un error inesperado. Probá de nuevo; si sigue, volvé al inicio.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <PrimaryButton onClick={reset}>Reintentar</PrimaryButton>
        <SecondaryButton onClick={() => (window.location.href = "/")}>Ir al inicio</SecondaryButton>
      </div>
    </div>
  );
}
