import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/** Parser de una línea CSV con soporte de comillas dobles y comas embebidas. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // comilla escapada ""
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Lee un CSV grande por streaming y llama `onRow` con un objeto {columna: valor}
 * por fila. Asume que ningún valor contiene saltos de línea (cierto para los
 * datasets de Transfermarkt). Devuelve el total de filas de datos procesadas.
 */
export async function streamCsv(
  path: string,
  onRow: (row: Record<string, string>) => void,
): Promise<number> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let header: string[] | null = null;
  let count = 0;
  for await (const line of rl) {
    if (line === "") continue;
    const cells = parseCsvLine(line);
    if (!header) { header = cells.map((h) => h.trim()); continue; }
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cells[i] ?? "";
    onRow(row);
    count++;
  }
  return count;
}
