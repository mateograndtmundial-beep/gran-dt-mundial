import { Trophy } from "lucide-react";
import { Eyebrow } from "@/components/editorial";
import { SITE } from "@/lib/site";

/**
 * Card que se muestra cuando todas las copas premium están llenas/cerradas y el usuario
 * no está inscripto en ninguna abierta. Invita a escribir por Instagram para que abramos
 * otro cupo (no hay Liga Premium III automática). Ver docs/MONETIZACION.md.
 */
export function CopaSoldOutCard() {
  return (
    <div className="rounded-[10px] border-2 border-gold-border bg-gold-bg p-5 card-shadow">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-gold shrink-0" aria-hidden />
        <Eyebrow className="text-gold-ink">Liga Premium</Eyebrow>
      </div>
      <p className="mt-3 text-base font-semibold text-ink">Cupos agotados por ahora</p>
      <p className="mt-1 text-sm text-ink-2">
        Las copas disponibles ya están completas. Si querés que abramos un nuevo cupo,
        escribinos por Instagram y te avisamos.
      </p>
      <a
        href={SITE.instagram.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center rounded-[6px] border border-gold-border bg-surface px-4 py-2 text-sm font-semibold text-gold-ink hover:bg-gold-bg transition-all"
      >
        Escribinos por Instagram →
      </a>
    </div>
  );
}
