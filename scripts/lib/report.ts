import { db } from "../../lib/db";
import type { SQL } from "drizzle-orm";

/**
 * Helpers compartidos para scripts de monitoreo (read-only).
 *
 * Gotcha de Neon-HTTP: `db.execute(sql\`...\`)` NO devuelve un array iterable
 * directo, devuelve un objeto con `.rows`. `query()` lo desempaqueta una vez
 * acá para que el resto del código no se tropiece con "rows is not iterable".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function query<T = Record<string, any>>(chunk: SQL): Promise<T[]> {
  const result = await db.execute(chunk);
  const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
  return rows as T[];
}

// ── Formato ──────────────────────────────────────────────────────

/** Encabezado de sección, consistente entre reportes. */
export function section(title: string): void {
  console.log(`\n${"─".repeat(2)} ${title} ${"─".repeat(Math.max(0, 60 - title.length))}\n`);
}

/** Línea clave: valor, alineada. */
export function kv(label: string, value: string | number, width = 32): void {
  console.log(`${(label + ":").padEnd(width)} ${value}`);
}

/** Porcentaje formateado con 1 decimal. */
export function pct(n: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

/** Número con separador de miles es-AR. */
export function nf(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

type Column<T> = {
  key: keyof T;
  label: string;
  width?: number;
  align?: "left" | "right";
  format?: (value: T[keyof T], row: T) => string;
};

/** Imprime una tabla alineada a consola a partir de filas + definición de columnas. */
export function table<T extends Record<string, any>>(rows: T[], columns: Column<T>[]): void {
  if (rows.length === 0) {
    console.log("  (sin datos)");
    return;
  }
  const widths = columns.map((c) => {
    const cellLens = rows.map((r) => String(c.format ? c.format(r[c.key], r) : r[c.key]).length);
    return Math.max(c.width ?? 0, c.label.length, ...cellLens);
  });
  const pad = (s: string, w: number, align: "left" | "right" = "left") =>
    align === "right" ? s.padStart(w) : s.padEnd(w);

  console.log("  " + columns.map((c, i) => pad(c.label, widths[i], c.align)).join("  "));
  console.log("  " + widths.map((w) => "─".repeat(w)).join("  "));
  for (const row of rows) {
    console.log(
      "  " +
        columns
          .map((c, i) => {
            const raw = c.format ? c.format(row[c.key], row) : String(row[c.key]);
            return pad(raw, widths[i], c.align);
          })
          .join("  "),
    );
  }
}
