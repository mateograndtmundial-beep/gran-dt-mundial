import { getCurrentUser } from "@/lib/auth";
import { isDoubleChangeNoticeActive, userHasEntry } from "@/lib/queries";
import { DoubleChangeNotice } from "@/components/double-change-notice";

/**
 * Gate server-side del aviso "ahora 2 cambios gratis por fecha". Corta barato si
 * no aplica: sin sesión, sin equipo armado, o el beneficio todavía no está vigente
 * (aún no arrancaron los playoffs / octavos). Solo cuando aplica monta el cliente,
 * que se encarga de mostrarlo una sola vez (localStorage). Se usa en la home y en
 * /mi-equipo; la key compartida hace que descartarlo en un lado lo oculte en ambos.
 */
export async function DoubleChangeBanner() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    return null; // sin Clerk/DB → no molestamos
  }
  if (!user) return null;

  try {
    const [active, hasEntry] = await Promise.all([
      isDoubleChangeNoticeActive(),
      userHasEntry(user.id),
    ]);
    if (!active || !hasEntry) return null;
  } catch {
    return null;
  }

  return <DoubleChangeNotice />;
}
