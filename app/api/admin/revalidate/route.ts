import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

/*
 * Revalidación on-demand de las lecturas cacheadas, disparada a mano.
 *
 * Para qué: publishRound ya bustea estos tags al publicar una fecha, pero si se
 * CORRIGEN stats DESPUÉS de publicar (edición manual / re-sync de un partido ya
 * publicado), los puntajes guardados se recalculan en la DB pero las lecturas
 * cacheadas (stats de /jugadores, ranking) siguen sirviendo el valor viejo hasta
 * que venza su TTL (player-stats: 1h). Este endpoint fuerza el refresh al toque.
 *
 * SEGURIDAD / por qué no rompe nada: solo invalida caches — NO lee ni escribe
 * datos del juego. En el peor caso provoca un recálculo de las lecturas (lo mismo
 * que hace publishRound). Es idempotente: llamarlo de más no tiene efecto adverso.
 *
 * Auth (dos formas, alcanza con una):
 *  - Sesión de admin (Clerk): abrir la URL en el navegador logueado como admin.
 *  - `Authorization: Bearer <CRON_SECRET>`: para curl/scripts (misma env que el cron).
 */

export const dynamic = "force-dynamic";

// Tags afectados por una corrección de puntajes post-publicación.
const TAGS = ["player-stats", "leaderboard", "global-rank", "player-ownership", "players"] as const;
const PATHS = ["/jugadores", "/equipo", "/ranking", "/mi-equipo"] as const;

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const user = await getCurrentUser();
  return !!user?.isAdmin;
}

async function run(req: Request): Promise<Response> {
  if (!(await authorized(req))) return new Response("Unauthorized", { status: 401 });
  for (const tag of TAGS) revalidateTag(tag, "max");
  for (const path of PATHS) revalidatePath(path);
  return Response.json({ ok: true, revalidated: { tags: TAGS, paths: PATHS }, at: new Date().toISOString() });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
