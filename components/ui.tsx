import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Card — fondo blanco, borde suave, sombra estándar */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[8px] border border-border bg-surface card-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* PageTitle — tipografía a escala de pantalla */
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-tight text-ink">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-sm text-ink-3">{subtitle}</p>
      )}
    </div>
  );
}

/* Badge — pill genérico */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* EmptyState — centrado, tono apagado */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-border-strong/50 p-10 text-center">
      <p className="font-semibold text-ink-3">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}
