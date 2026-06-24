import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Resumen financiero (breakeven) de Los 11 de Sampa para Slack (#stats).
 *
 * Es un mensaje APARTE del digest de stats (`stats-digest.ts`): mientras aquel
 * mira producto/engagement, éste responde una sola pregunta — ¿estamos en
 * breakeven? Lo consumen:
 *   - `app/api/cron/stats/route.ts` (Vercel Cron diario → posteo a #stats)
 *   - `scripts/stats.ts` (sección `finanzas`, corrida manual / --slack)
 *
 * NO importa "server-only": también corre desde scripts (tsx/Node).
 *
 * Diseño de datos:
 *   - Lo que vive en la DB se lee en vivo: ingresos (orders paid), entradas a la
 *     copa, premio garantizado y cupo de las copas activas.
 *   - Lo que NO está en la DB es config manual editable acá abajo: costos de
 *     infra/marketing, tipo de cambio MEP, comisión de Mercado Pago, usuarios
 *     internos a excluir y reembolsos hechos por fuera del sistema.
 * Cuando cambien costos / TC / se sume un reembolso, se edita FINANCE_CONFIG.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Block = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────
// CONFIG MANUAL (editar acá cuando cambien costos, TC o reembolsos)
// ──────────────────────────────────────────────────────────────
export const FINANCE_CONFIG = {
  // Usuarios internos a excluir de los ingresos (match por username, case-insensitive).
  excludeUsers: ["pepbondiola", "facundo", "bruno"],

  // Órdenes que figuran 'paid' en la DB pero se reembolsaron por fuera del sistema.
  // No se descuentan solas → se listan acá para sacarlas de los ingresos.
  manualRefundOrderIds: [36], // Dino — 10 pines / $10.000 ARS

  // Comisión Mercado Pago: acreditación a 30 días = 3,49% + IVA 21%.
  mpFeeRate: 0.0349,
  mpIva: 0.21,

  // TC para pasar costos en USD → ARS: MEP VENTA del día asignado a CADA costo,
  // valor estático (no se consulta en vivo). Regla: un costo usa el MEP venta de
  // SU fecha. Por ahora todos los costos se imputan al 15/06/2026 (inicio del
  // proyecto) → MEP venta de ese día. Si más adelante hay costos de otras fechas,
  // habrá que separarlos con su propio TC.
  mepArsPerUsd: 1450.36, // MEP venta 15/06/2026

  // Costos en USD (infra). Se convierten a ARS al MEP de arriba.
  costsUsd: {
    vercel: 40, // Vercel Pro — 2 meses × US$20
    footballApi: 19, // API-Football — 1 mes
    dominio: 10, // dominio los11desampa.com
    // Neon: PENDIENTE — variable y la factura del mes todavía no llegó. Cuando
    // llegue, sumar acá (estimado ~US$10/mes). Ver `pendingNote`.
  },

  // Costos en ARS (marketing, one-shot de lanzamiento).
  costsArs: {
    igStories: 35000, // Instagram stories
    fbStories: 50000, // Facebook stories
    publicidadIg: 20000, // publicidad IG
  },

  // Costos conocidos pero todavía sin monto firme → no entran al total, se avisan.
  pendingNote: "Neon (variable, factura del mes sin llegar)",
} as const;

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
async function query<T = Record<string, any>>(chunk: SQL): Promise<T[]> {
  const result = await db.execute(chunk);
  const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
  return rows as T[];
}

function nf(n: number): string {
  return new Intl.NumberFormat("es-AR").format(Math.round(n));
}
const ars = (n: number): string => `$${nf(n)} ARS`;
const usd = (n: number): string => `US$${n}`;
const sum = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0);

const md = (text: string): Block => ({ type: "section", text: { type: "mrkdwn", text } });
const divider = (): Block => ({ type: "divider" });
const context = (text: string): Block => ({ type: "context", elements: [{ type: "mrkdwn", text }] });

// ──────────────────────────────────────────────────────────────
// Cómputo (DB en vivo + config)
// ──────────────────────────────────────────────────────────────
export type FinanceSummary = ReturnType<typeof shape> extends Promise<infer T> ? T : never;

async function shape() {
  const cfg = FINANCE_CONFIG;
  const feeEff = cfg.mpFeeRate * (1 + cfg.mpIva); // comisión efectiva con IVA
  const netFactor = 1 - feeEff;

  // ── Ingresos: todas las órdenes paid en ARS, con flag de si son entrada a copa ──
  const rows = await query<{ id: number; uname: string; amount: number; is_copa: boolean }>(sql`
    select o.id, lower(coalesce(u.username, '')) as uname, o.amount,
           (p.entry_league_id is not null) as is_copa
    from orders o
    join users u on u.id = o.user_id
    join products p on p.id = o.product_id
    where o.status = 'paid' and o.currency = 'ARS'
  `);

  const excluded = new Set(cfg.excludeUsers.map((u) => u.toLowerCase()));
  const refunded = new Set<number>(cfg.manualRefundOrderIds);
  const valid = rows.filter((r) => !excluded.has(r.uname) && !refunded.has(Number(r.id)));

  const brutoTotal = valid.reduce((a, r) => a + Number(r.amount), 0);
  const brutoCopa = valid.filter((r) => r.is_copa).reduce((a, r) => a + Number(r.amount), 0);
  const brutoPines = brutoTotal - brutoCopa;
  const copaEntries = valid.filter((r) => r.is_copa).length;

  const netTotal = brutoTotal * netFactor;

  // ── Premio garantizado + cupo de las copas vivas (no draft) ──
  const copas = await query<{ premio: number; capacity: number; entry_fee: number }>(sql`
    select coalesce(sum(prize_ars), 0) as premio,
           coalesce(sum(capacity), 0) as capacity,
           coalesce(max(entry_fee_ars), 0) as entry_fee
    from leagues
    where kind = 'golden_ticket' and status in ('open', 'full', 'closed')
  `);
  const premioArs = Number(copas[0]?.premio ?? 0);
  const capacity = Number(copas[0]?.capacity ?? 0);
  const entryFee = Number(copas[0]?.entry_fee ?? 0);

  // ── Egresos ──
  const marketingArs = sum(cfg.costsArs);
  const infraUsd = sum(cfg.costsUsd);
  const infraArs = infraUsd * cfg.mepArsPerUsd;
  const totalEgresos = marketingArs + infraArs + premioArs;

  const resultado = netTotal - totalEgresos;

  // ── Breakeven de la copa (entradas para cubrir el premio) ──
  const netPerEntry = entryFee * netFactor;
  const copaBreakeven = netPerEntry > 0 ? Math.ceil(premioArs / netPerEntry) : 0;
  const faltanEntradas = Math.max(0, copaBreakeven - copaEntries);

  return {
    feeEffPct: feeEff * 100,
    mep: cfg.mepArsPerUsd,
    brutoTotal,
    brutoCopa,
    brutoPines,
    netTotal,
    copaEntries,
    capacity,
    entryFee,
    premioArs,
    marketingArs,
    infraUsd,
    infraArs,
    totalEgresos,
    resultado,
    copaBreakeven,
    faltanEntradas,
    pendingNote: cfg.pendingNote,
  };
}

export async function computeFinance() {
  return shape();
}

// ──────────────────────────────────────────────────────────────
// Slack
// ──────────────────────────────────────────────────────────────
export async function buildFinanceDigest(): Promise<{ text: string; blocks: Block[] }> {
  const s = await computeFinance();
  const enRojo = s.resultado < 0;

  const blocks: Block[] = [
    md(`:money_with_wings: *Resumen financiero — Los 11 de Sampa*`),
    divider(),
    md(
      `*:inbox_tray: Ingresos* _(sin internos ni reembolsos)_\n` +
        `• Brutos: *${ars(s.brutoTotal)}*  _(pines ${ars(s.brutoPines)} · copa ${ars(s.brutoCopa)})_\n` +
        `• Neto tras Mercado Pago (−${s.feeEffPct.toFixed(2)}%): *${ars(s.netTotal)}*`,
    ),
    md(
      `*:outbox_tray: Egresos*\n` +
        `• Marketing: ${ars(s.marketingArs)}\n` +
        `• Infra (${usd(s.infraUsd)} @ MEP venta ${nf(s.mep)}): ${ars(s.infraArs)}\n` +
        `• Premio garantizado copa(s): ${ars(s.premioArs)}\n` +
        `• *Total: ${ars(s.totalEgresos)}*` +
        (s.pendingNote ? `\n• :hourglass_flowing_sand: _Pendiente de sumar: ${s.pendingNote}_` : ""),
    ),
    md(
      `*${enRojo ? ":red_circle:" : ":large_green_circle:"} Resultado global: ${enRojo ? "" : "+"}${ars(s.resultado)}* ` +
        `${enRojo ? "_(déficit — todavía no breakeven)_" : "_(superávit)_"}`,
    ),
    md(
      `*:trophy: Copa*\n` +
        `• Entradas vendidas: *${s.copaEntries}${s.capacity ? ` / ${s.capacity}` : ""}*\n` +
        `• Breakeven de la copa (cubrir el premio): *${s.copaBreakeven}* entradas` +
        (s.faltanEntradas > 0 ? `  →  faltan *${s.faltanEntradas}*` : `  →  :white_check_mark: cubierto`),
    ),
    context(
      `Supuestos: MP 3,49% + IVA (30 días) · MEP venta ${nf(s.mep)} (costos al 15/06) · ` +
        `costos infra/marketing y reembolsos cargados en \`FINANCE_CONFIG\`. Números read-only sobre la DB.`,
    ),
  ];

  return { text: "Resumen financiero — Los 11 de Sampa", blocks };
}
