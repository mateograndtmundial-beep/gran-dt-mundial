import { Info } from "lucide-react";
import { COPA_PAUSED_ENROLLED, COPA_PAUSED_PROSPECT } from "@/lib/copa/announcement";

/**
 * Cartel de la Liga Premium pausada/cancelada. Reemplaza al CTA de inscripción.
 *  - `variant="prospect"`: para quien NO está inscripto (inscripciones en pausa).
 *  - `variant="enrolled"`: para los inscriptos (cancelación + reembolso + pines).
 *
 * El texto vive en `lib/copa/announcement.ts` (fuente única, fácil de editar). En
 * clave dorada calma, mobile-first (ancho completo, apila bien en celular).
 */
export function CopaPausedNotice({ variant }: { variant: "prospect" | "enrolled" }) {
  const msg = variant === "enrolled" ? COPA_PAUSED_ENROLLED : COPA_PAUSED_PROSPECT;
  return (
    <div className="flex gap-3 rounded-[10px] border-2 border-gold-border bg-gold-bg p-4 card-shadow sm:p-5">
      <Info size={20} className="mt-0.5 shrink-0 text-gold-ink" aria-hidden />
      <div className="min-w-0">
        <p className="font-display text-lg leading-tight tracking-tight text-gold-ink">
          {msg.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{msg.body}</p>
      </div>
    </div>
  );
}
