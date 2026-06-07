import { db } from "@/lib/db";

export type BatchOp = Parameters<typeof db.batch>[0][number];

/**
 * Ejecuta escrituras en lotes acotados. Cada lote es una transacción de neon-http;
 * acota el tamaño del request en operaciones masivas (publish/sync). No es una única
 * transacción global a propósito: las ops son idempotentes (upsert) y re-ejecutables.
 */
export async function chunkedBatch(ops: BatchOp[], size = 100): Promise<void> {
  for (let i = 0; i < ops.length; i += size) {
    const chunk = ops.slice(i, i + size);
    if (chunk.length) await db.batch(chunk as [BatchOp, ...BatchOp[]]);
  }
}
