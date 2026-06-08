import { getRoundsToSync } from "@/lib/queries";
import { syncRound } from "@/lib/api-football/sync";
import { notifyRoundSynced, notifyError } from "@/lib/notify/slack";

/*
 * Cron de sincronización (Vercel Cron). Sincroniza las stats de las fechas en
 * juego desde API-Football. NO publica: la publicación sigue siendo manual desde
 * /admin (decisión de producto). Avisa a Slack cuando una fecha terminó de
 * sincronizar y está lista para revisar/publicar.
 *
 * Seguridad: Vercel agrega `Authorization: Bearer <CRON_SECRET>` a los cron jobs
 * cuando la env CRON_SECRET está seteada. Sin secreto configurado → 401.
 * El schedule vive en vercel.json.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const roundIds = await getRoundsToSync();
    const synced: { roundId: number; matches: number }[] = [];
    for (const id of roundIds) {
      const r = await syncRound(id);
      synced.push({ roundId: id, matches: r.matches });
      notifyRoundSynced({ roundId: id, matches: r.matches, source: "cron" });
    }
    return Response.json({ ok: true, rounds: roundIds.length, synced });
  } catch (e) {
    notifyError({ source: "cron/sync", message: (e as Error).message });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}
