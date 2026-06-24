import "server-only";
import { after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products, users, rounds, entries, entryRounds } from "@/lib/db/schema";
import { formatPoints } from "@/lib/utils";

/**
 * Notificaciones internas a Slack (bot token + chat.postMessage con Block Kit).
 *
 * Diseño:
 * - Cada `notify*` programa el envío con `after()` (Next 16): corre DESPUÉS de
 *   responderle al usuario, así una notificación nunca agrega latencia ni rompe
 *   una compra/guardado si Slack está caído.
 * - No-op silencioso si falta `SLACK_BOT_TOKEN` o no hay canal configurado.
 * - Sólo emite en producción; en local/preview hay que opt-in con SLACK_NOTIFY_DEV=1.
 *
 * Setup (una vez): crear una Slack App, darle el scope `chat:write`, instalarla,
 * invitar el bot a los canales, y cargar SLACK_BOT_TOKEN + los SLACK_CHANNEL_* .
 */

const TOKEN = process.env.SLACK_BOT_TOKEN;

// VERCEL_ENV: "production" | "preview" | "development" (undefined en local).
const VERCEL_ENV = process.env.VERCEL_ENV;
const ENABLED =
  !!TOKEN && (VERCEL_ENV === "production" || process.env.SLACK_NOTIFY_DEV === "1");

// Prefijo que distingue pruebas (preview/local) de producción real.
const ENV_TAG = VERCEL_ENV === "production" ? "" : `\`[${VERCEL_ENV ?? "local"}]\` `;

type ChannelKey = "pagos" | "users" | "errores" | "scoring" | "stats";

/** Resuelve el canal de un tipo de evento; cae a SLACK_CHANNEL_DEFAULT. */
function channelFor(key: ChannelKey): string | null {
  const map: Record<ChannelKey, string | undefined> = {
    pagos: process.env.SLACK_CHANNEL_PAGOS,
    users: process.env.SLACK_CHANNEL_USERS,
    errores: process.env.SLACK_CHANNEL_ERRORES,
    scoring: process.env.SLACK_CHANNEL_SCORING,
    stats: process.env.SLACK_CHANNEL_STATS,
  };
  return map[key] ?? process.env.SLACK_CHANNEL_DEFAULT ?? null;
}

// Barra lateral del mensaje (Block Kit attachment) según severidad.
const COLOR = {
  green: "#16713F",
  blue: "#1B4FD8",
  gold: "#C8A24B",
  amber: "#D97706",
  red: "#DC2626",
} as const;

type Block = Record<string, unknown>;

/** Escapa los 3 caracteres que rompen el mrkdwn de Slack. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function section(text: string): Block {
  return { type: "section", text: { type: "mrkdwn", text } };
}
function context(text: string): Block {
  return { type: "context", elements: [{ type: "mrkdwn", text }] };
}
function money(amount: number, currency: string): string {
  return currency === "ARS" ? `$${Math.round(amount)} ARS` : `US$${amount.toFixed(2)}`;
}

/** POST a chat.postMessage. Nunca lanza: traga el error y lo loguea. */
async function post(
  channelKey: ChannelKey,
  opts: { text: string; blocks: Block[]; color: string },
): Promise<void> {
  const channel = channelFor(channelKey);
  if (!channel) return;
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        channel,
        text: opts.text, // fallback para notificaciones/lectores de pantalla
        attachments: [{ color: opts.color, blocks: opts.blocks }],
      }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) console.error("[slack] postMessage error:", json.error);
  } catch (e) {
    console.error("[slack] post failed:", (e as Error).message);
  }
}

/**
 * Programa el envío para después de la respuesta. Si no hay request scope
 * (p. ej. un script), cae a fire-and-forget directo.
 */
function fire(fn: () => Promise<void>): void {
  if (!ENABLED) return;
  try {
    after(fn);
  } catch {
    void fn().catch(() => {});
  }
}

// ──────────────────────────────────────────────────────────────
// Usuarios
// ──────────────────────────────────────────────────────────────

/** Alta en nuestra DB (primer login de Clerk). Todavía sin nickname. */
export function notifyNewUser(input: { userId: number }): void {
  fire(async () => {
    await post("users", {
      text: "Nuevo usuario registrado",
      color: COLOR.blue,
      blocks: [
        section(`${ENV_TAG}:wave: *Nuevo usuario* se registró`),
        context(`Usuario #${input.userId} · todavía sin nickname`),
      ],
    });
  });
}

/** Eligió nickname en /bienvenida → usuario activado. */
export function notifyOnboardingComplete(input: { userId: number; username: string }): void {
  fire(async () => {
    await post("users", {
      text: `@${input.username} completó el onboarding`,
      color: COLOR.blue,
      blocks: [
        section(`${ENV_TAG}:white_check_mark: *@${esc(input.username)}* eligió su nombre y entró a jugar`),
        context(`Usuario #${input.userId}`),
      ],
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Pagos / pines
// ──────────────────────────────────────────────────────────────

/** Checkout iniciado (orden creada, todavía sin pagar). Sirve para el funnel. */
export function notifyCheckoutStarted(input: {
  orderId: number;
  userId: number;
  username: string | null;
  productName: string;
  pins: number;
  amount: number;
  currency: string;
  provider: string;
}): void {
  fire(async () => {
    const who = input.username ? `@${esc(input.username)}` : `Usuario #${input.userId}`;
    await post("pagos", {
      text: `Checkout iniciado: ${input.productName}`,
      color: COLOR.blue,
      blocks: [
        section(
          `${ENV_TAG}:shopping_trolley: *Checkout iniciado* — ${who}\n*${esc(input.productName)}* · ${input.pins} pines · ${money(input.amount, input.currency)}`,
        ),
        context(`Orden #${input.orderId} · ${input.provider}`),
      ],
    });
  });
}

/** Pago acreditado (webhook idempotente). El evento de plata real. */
export function notifyPaymentPaid(input: { orderId: number }): void {
  fire(async () => {
    const row = (
      await db
        .select({
          pins: orders.pins,
          amount: orders.amount,
          currency: orders.currency,
          provider: orders.provider,
          userId: users.id,
          username: users.username,
          productName: products.name,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .leftJoin(products, eq(orders.productId, products.id))
        .where(eq(orders.id, input.orderId))
        .limit(1)
    )[0];
    if (!row) return;
    const who = row.username ? `@${esc(row.username)}` : `Usuario #${row.userId ?? "?"}`;
    await post("pagos", {
      text: `Pago acreditado: orden #${input.orderId}`,
      color: COLOR.green,
      blocks: [
        section(
          `${ENV_TAG}:moneybag: *Pago acreditado* — ${who} compró *${esc(row.productName ?? "pack")}*\n+${row.pins} pines · ${money(row.amount, row.currency)}`,
        ),
        context(`Orden #${input.orderId} · ${row.provider}`),
      ],
    });
  });
}

/** Pago rechazado o expirado. */
export function notifyPaymentFailed(input: { orderId: number; status: string }): void {
  fire(async () => {
    const row = (
      await db
        .select({
          amount: orders.amount,
          currency: orders.currency,
          provider: orders.provider,
          userId: users.id,
          username: users.username,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.id, input.orderId))
        .limit(1)
    )[0];
    const who = row?.username ? `@${esc(row.username)}` : `Usuario #${row?.userId ?? "?"}`;
    const detail = row ? ` · ${money(row.amount, row.currency)} · ${row.provider}` : "";
    await post("pagos", {
      text: `Pago ${input.status}: orden #${input.orderId}`,
      color: COLOR.amber,
      blocks: [
        section(`${ENV_TAG}:x: *Pago ${esc(input.status)}* — ${who}`),
        context(`Orden #${input.orderId}${detail}`),
      ],
    });
  });
}

/**
 * Inscripción a la Liga Premium acreditada → cae en #pagos con el **cupo en vivo**
 * (X / capacity). Es el seguimiento de cuántos lugares de los 100 se van ocupando.
 * Reemplaza a `notifyPaymentPaid` para las entradas de copa (un solo mensaje por
 * inscripción, con la plata y el cupo juntos). Cuando llega al tope, marca CUPO LLENO.
 */
export function notifyCopaEnrollment(input: {
  orderId: number;
  copaName: string;
  enrolled: number;
  capacity: number;
}): void {
  fire(async () => {
    const row = (
      await db
        .select({
          amount: orders.amount,
          currency: orders.currency,
          userId: users.id,
          username: users.username,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.id, input.orderId))
        .limit(1)
    )[0];
    const who = row?.username ? `@${esc(row.username)}` : `Usuario #${row?.userId ?? "?"}`;
    const amount = row ? ` · ${money(row.amount, row.currency)}` : "";
    const left = Math.max(0, input.capacity - input.enrolled);
    const full = input.enrolled >= input.capacity;
    const headline = full
      ? `:checkered_flag: *¡CUPO LLENO!* ${esc(input.copaName)} — *${input.enrolled}/${input.capacity}*\n${who} tomó el último lugar${amount}. La inscripción queda *cerrada*.`
      : `:soccer: *Nueva inscripción a la Liga Premium* — ${who}${amount}\n*${esc(input.copaName)}:* \`${input.enrolled} / ${input.capacity}\` · quedan *${left}* lugares`;
    await post("pagos", {
      text: full
        ? `Cupo lleno: ${input.copaName} ${input.enrolled}/${input.capacity}`
        : `Inscripción Liga Premium ${input.enrolled}/${input.capacity}`,
      color: full ? COLOR.gold : COLOR.green,
      blocks: [section(headline), context(`Orden #${input.orderId}`)],
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Scoring / admin
// ──────────────────────────────────────────────────────────────

/** Sync de una fecha terminado: lista para revisar/publicar (NO publica sola). */
export function notifyRoundSynced(input: {
  roundId: number;
  matches: number;
  source: "cron" | "admin";
}): void {
  fire(async () => {
    const round = (
      await db.select({ name: rounds.name }).from(rounds).where(eq(rounds.id, input.roundId)).limit(1)
    )[0];
    const name = round?.name ?? `Fecha #${input.roundId}`;
    const src = input.source === "cron" ? "automático (cron)" : "manual";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const link = appUrl ? `\n<${appUrl}/admin|Revisar y publicar →>` : "";
    await post("scoring", {
      text: `Sync listo: ${name}`,
      color: COLOR.blue,
      blocks: [
        section(
          `${ENV_TAG}:arrows_counterclockwise: *Sync ${src} listo:* ${esc(name)}\n${input.matches} partidos sincronizados · revisá las stats y publicá la fecha${link}`,
        ),
      ],
    });
  });
}

/** Fecha publicada: puntos aplicados a todos los equipos. */
export function notifyRoundPublished(input: {
  roundId: number;
  entries: number;
  players: number;
}): void {
  fire(async () => {
    const round = (
      await db.select({ name: rounds.name }).from(rounds).where(eq(rounds.id, input.roundId)).limit(1)
    )[0];
    const top = (
      await db
        .select({ name: entries.name, username: users.username, points: entryRounds.points })
        .from(entryRounds)
        .innerJoin(entries, eq(entryRounds.entryId, entries.id))
        .leftJoin(users, eq(entries.userId, users.id))
        .where(eq(entryRounds.roundId, input.roundId))
        .orderBy(desc(entryRounds.points))
        .limit(1)
    )[0];
    const name = round?.name ?? `Fecha #${input.roundId}`;
    const topLine = top
      ? `\n:trophy: Mejor de la fecha: *${esc(top.username ?? top.name)}* (${formatPoints(top.points)} pts)`
      : "";
    await post("scoring", {
      text: `Fecha publicada: ${name}`,
      color: COLOR.gold,
      blocks: [
        section(
          `${ENV_TAG}:bar_chart: *Fecha publicada:* ${esc(name)}\n${input.entries} equipos puntuados · ${input.players} jugadores con puntos${topLine}`,
        ),
      ],
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Stats (digest diario)
// ──────────────────────────────────────────────────────────────

/** Digest diario de stats armado por `lib/reports/stats-digest.ts` (cron 8am ARG). */
export function notifyStatsDigest(input: { text: string; blocks: Block[] }): void {
  fire(async () => {
    await post("stats", { text: input.text, color: COLOR.blue, blocks: input.blocks });
  });
}

/** Resumen financiero (breakeven) — mensaje APARTE del digest, mismo canal #stats. */
export function notifyFinanceDigest(input: { text: string; blocks: Block[] }): void {
  fire(async () => {
    await post("stats", { text: input.text, color: COLOR.gold, blocks: input.blocks });
  });
}

// ──────────────────────────────────────────────────────────────
// Errores / salud
// ──────────────────────────────────────────────────────────────

/** Error en cualquier flujo (cliente, webhook, sync, etc.). */
export function notifyError(input: {
  source: string;
  message: string;
  digest?: string;
  url?: string;
}): void {
  fire(async () => {
    const ctx = [
      input.url ? `Ruta: ${esc(input.url)}` : null,
      input.digest ? `digest: ${esc(input.digest)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    await post("errores", {
      text: `Error en ${input.source}`,
      color: COLOR.red,
      blocks: [
        section(`${ENV_TAG}:boom: *Error* en \`${esc(input.source)}\``),
        section("```" + esc(input.message || "(sin mensaje)").slice(0, 900) + "```"),
        ...(ctx ? [context(ctx)] : []),
      ],
    });
  });
}
