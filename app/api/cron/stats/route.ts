import { buildStatsDigest } from "@/lib/reports/stats-digest";
import { notifyStatsDigest, notifyError } from "@/lib/notify/slack";

/*
 * Cron diario de stats (Vercel Cron, 8am ARG = 11:00 UTC). Arma el digest de
 * `lib/reports/stats-digest.ts` (equipos, engagement, funnel, monetización,
 * ligas, salud) y lo postea al canal #stats. Solo lectura — no modifica nada.
 *
 * Seguridad: igual que /api/cron/sync — Vercel agrega
 * `Authorization: Bearer <CRON_SECRET>`. Sin secreto configurado → 401.
 * El schedule vive en vercel.json.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const { text, blocks } = await buildStatsDigest();
    notifyStatsDigest({ text, blocks });
    return Response.json({ ok: true });
  } catch (e) {
    notifyError({ source: "cron/stats", message: (e as Error).message });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}
