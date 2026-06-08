import { clerkMiddleware } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// En producción la auth NO es opcional: si falta la key, fallamos el arranque en
// vez de dejar pasar todo silenciosamente (que desprotegería toda la app).
if (process.env.NODE_ENV === "production" && !process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY es obligatoria en producción");
}

// En dev, si no hay keys de Clerk, el middleware deja pasar todo (así la app corre
// igual mientras se termina la config de auth).
const enabled = !!process.env.CLERK_SECRET_KEY;

// Rutas que no se gatean: la propia bienvenida, el flujo de auth (evita loops)
// y el webhook de pagos (lo llama el proveedor, no un usuario logueado).
function isExemptFromOnboarding(pathname: string): boolean {
  return (
    pathname.startsWith("/bienvenida") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/")
  );
}

// Gate de onboarding: si el usuario está logueado pero todavía no eligió su
// nickname (username null), lo mandamos a /bienvenida.
//
// IMPORTANTE: este chequeo va en el middleware (no en el layout) porque corre
// en CADA navegación —incluidas las client-side vía <Link>—, mientras que el
// layout raíz puede reusarse entre navegaciones ("shared layouts" de Next),
// lo que permitía entrar una vez a una ruta exenta (p. ej. /bienvenida) y
// después navegar a cualquier lado sin volver a pasar por el gate.
async function enforceOnboarding(req: NextRequest, userId: string | null) {
  if (!userId) return null;
  const pathname = req.nextUrl.pathname;
  if (isExemptFromOnboarding(pathname)) return null;

  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  const user = rows[0];
  if (user && !user.username) {
    const url = req.nextUrl.clone();
    url.pathname = "/bienvenida";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return null;
}

export default enabled
  ? clerkMiddleware(async (auth, req) => {
      const { userId } = await auth();
      const redirectRes = await enforceOnboarding(req, userId);
      return redirectRes ?? NextResponse.next();
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
