import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}
