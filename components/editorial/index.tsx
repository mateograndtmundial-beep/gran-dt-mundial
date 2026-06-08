/**
 * Primitivas editoriales de Los 11 de Sampa.
 * Gran DT + Panini: tipografía a escala, franja de posición, numerales estadio.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { POSITION_COLORS, POSITION_BG, POSITION_ABBR, type Position } from "@/lib/game/config";

/* ─── Eyebrow ─── */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("eyebrow", className)}>{children}</span>
  );
}

/* ─── PositionChip — álbum Panini ─── */
export function PositionChip({
  position,
  className,
}: {
  position: Position;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-11 shrink-0 items-center justify-center rounded-[4px] py-0.5 text-[10px] font-bold uppercase tracking-wide",
        className,
      )}
      style={{
        color: POSITION_COLORS[position],
        backgroundColor: POSITION_BG[position],
      }}
    >
      {POSITION_ABBR[position]}
    </span>
  );
}

/* ─── StatNumeral — número de estadio ─── */
export function StatNumeral({
  value,
  label,
  size = "md",
  className,
}: {
  value: string | number;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    sm: "text-[clamp(1.5rem,3vw,2rem)]",
    md: "text-[clamp(2rem,4vw,4rem)]",
    lg: "text-[clamp(3rem,7vw,6rem)]",
  }[size];

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "jersey-numeral leading-none tracking-tight text-ink",
          sizeClass,
        )}
      >
        {value}
      </span>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

/* ─── SectionHeader ─── */
export function SectionHeader({
  title,
  count,
  action,
  className,
}: {
  title: string;
  count?: number | string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between pb-3 mb-4 border-b-2 border-border",
        className,
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="eyebrow">{title}</span>
        {count !== undefined && (
          <span className="text-[11px] text-ink-faint">({count})</span>
        )}
      </div>
      {action}
    </header>
  );
}

/* ─── CaptainBadge — brazalete del capitán ─── */
export function CaptainBadge({ className }: { className?: string }) {
  return (
    <span
      aria-label="Capitán"
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        "bg-gold text-gold-ink font-display text-[11px] leading-none",
        className,
      )}
    >
      C
    </span>
  );
}

/* ─── PrimaryButton — único componente con sombra dura ─── */
const PRIMARY_CLASSES = [
  "inline-flex items-center justify-center",
  "bg-blue text-white font-display text-base px-6 py-3 rounded-[6px]",
  "btn-shadow",
  "hover:bg-blue-hover hover:-translate-y-[1px]",
  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  "transition-all duration-100",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-none disabled:shadow-none",
];

export function PrimaryButton({
  children,
  className,
  disabled,
  onClick,
  href,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
}) {
  if (href) {
    return (
      <Link href={href} className={cn(PRIMARY_CLASSES, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(PRIMARY_CLASSES, className)}
    >
      {children}
    </button>
  );
}

/* ─── SecondaryButton ─── */
const SECONDARY_CLASSES = [
  "inline-flex items-center justify-center",
  "bg-surface text-ink font-semibold text-sm px-5 py-3 rounded-[6px]",
  "border border-border card-shadow",
  "hover:border-border-strong hover:card-shadow-md hover:-translate-y-[1px]",
  "transition-all duration-150",
  "disabled:opacity-40 disabled:cursor-not-allowed",
];

export function SecondaryButton({
  children,
  className,
  disabled,
  onClick,
  href,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
}) {
  if (href) {
    return (
      <Link href={href} className={cn(SECONDARY_CLASSES, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(SECONDARY_CLASSES, className)}
    >
      {children}
    </button>
  );
}

/* ─── GhostButton ─── */
export function GhostButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-blue font-semibold text-sm",
        "px-3 py-2 rounded-[6px] hover:bg-blue-light transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ─── ValidationCallout — errores del FieldBuilder ─── */
export function ValidationCallout({
  type = "warning",
  children,
  className,
}: {
  type?: "warning" | "danger" | "success";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    warning: "bg-warning-bg border-warning text-warning",
    danger: "bg-danger-bg border-danger text-danger",
    success: "bg-success-bg border-success text-success",
  }[type];

  return (
    <div
      className={cn(
        "border-l-4 rounded-r-[6px] px-4 py-3 font-semibold text-sm",
        styles,
        className,
      )}
    >
      {children}
    </div>
  );
}
