"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

/**
 * Cartel de confirmación tras guardar el equipo. El armador navega a
 * `/mi-equipo?saved=1&ch=&pins=` (no alcanza un toast en el armador porque se
 * redirige al instante); acá leemos esos números y mostramos qué pasó: cambio
 * gratis usado, pines gastados, o simplemente guardado. Se autodescarta y limpia
 * la query (router.replace) para que no reaparezca al recargar.
 */
export function SaveConfirmBanner({ changes, pins }: { changes: number; pins: number }) {
  const [show, setShow] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Saca los params de la URL sin agregar entrada al historial.
    router.replace("/mi-equipo", { scroll: false });
    const id = setTimeout(() => setShow(false), 7000);
    return () => clearTimeout(id);
  }, [router]);

  if (!show) return null;

  const detail =
    pins > 0
      ? `${changes} ${changes === 1 ? "cambio" : "cambios"} · gastaste ${pins} ${pins === 1 ? "pin" : "pines"}.`
      : changes > 0
        ? "Usaste tu cambio gratis de la fecha."
        : "Tu equipo quedó listo y sigue sumando.";

  return (
    <div className="relative flex items-start gap-2.5 rounded-r-[6px] border-l-4 border-success bg-success-bg px-4 py-3 pr-10">
      <CheckCircle2 size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-success" aria-hidden />
      <p className="text-sm font-semibold leading-snug text-success">
        ¡Equipo guardado! <span className="font-normal text-ink-2">{detail}</span>
      </p>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Cerrar aviso"
        className="absolute right-2.5 top-2.5 rounded-[6px] p-1 text-success/70 transition-colors hover:bg-success/10 hover:text-success"
      >
        <X size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
