import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

/** Precio con 1 decimal y coma española, sin sufijo: 5,7 · 46,1 · 12,0 */
export function formatPrice(n: number): string {
  return n.toFixed(1).replace(".", ",")
}
