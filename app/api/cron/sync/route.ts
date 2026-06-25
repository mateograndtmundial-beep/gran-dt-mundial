import { syncDueMatches } from "@/lib/api-football/sync";
import { notifyError, notifyRoundSynced } from "@/lib/notify/slack";
import { postPendingRecaps } from "@/lib/stories/recap";
import { postPendingScoreboards } from "@/lib/stories/scoreboard";
import { closeBrowser } from "@/lib/stories/render";

/*
 * Cron de sincronización (Vercel Cron). Corre cada hora en franja mundialista
 * (ver schedule en vercel.json). Es INCREMENTAL: solo sincroniza los partidos que
 * ya terminaron hace ~30' y todavía no tienen stats en nuestra DB (syncDueMatches)
 * → barato en llamadas a API-Football y con un delay natural de ~30' tras el final.
 * Tras sincronizar, postea a #SOCIAL las stories y carruseles pendientes (idempotente).
 * NO publica fechas: la publicación sigue siendo manual desde /admin.
 *
 * Seguridad: Vercel agrega `Authorization: Bearer <CRON_SECRET>` a los cron jobs
 * cuando la env CRON_SECRET está seteada. Sin secreto configurado → 401.
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
    const sync = await syncDueMatches();
    // Avisa a #scoring por cada fecha que recibió stats nuevas (para revisar/publicar).
    for (const r of sync.byRound) {
      notifyRoundSynced({ roundId: r.roundId, matches: r.matches, source: "cron" });
    }
    // Tras sincronizar, genera y postea a #SOCIAL las stories de los partidos
    // terminados con stats que aún no se postearon. Best-effort: un fallo de render
    // no debe tumbar el sync (que es lo crítico).
    let recaps = { posted: 0, skipped: 0 };
    try {
      recaps = await postPendingRecaps();
    } catch (e) {
      notifyError({ source: "cron/recaps", message: (e as Error).message });
    }
    // Idem para el carrusel de puntajes por grupo/fecha. Best-effort también.
    let scoreboards = { posted: 0, skipped: 0 };
    try {
      scoreboards = await postPendingScoreboards();
    } catch (e) {
      notifyError({ source: "cron/scoreboards", message: (e as Error).message });
    }
    return Response.json({ ok: true, sync, recaps, scoreboards });
  } catch (e) {
    notifyError({ source: "cron/sync", message: (e as Error).message });
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  } finally {
    // Cerramos el navegador compartido del render para no dejar el proceso colgado.
    await closeBrowser();
  }
}

export async function GET(req: Request) {
  return run(req);
}
