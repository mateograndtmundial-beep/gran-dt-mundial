import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// En producción la auth NO es opcional: si falta la key, fallamos el arranque en
// vez de dejar pasar todo silenciosamente (que desprotegería toda la app).
if (process.env.NODE_ENV === "production" && !process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY es obligatoria en producción");
}

// En dev, si no hay keys de Clerk, el middleware deja pasar todo (así la app corre
// igual mientras se termina la config de auth).
const enabled = !!process.env.CLERK_SECRET_KEY;

// Propagamos el pathname en un header del request para que el layout (server
// component) pueda saber en qué ruta está y decidir si gatear el onboarding.
function withPathname(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export default enabled
  ? clerkMiddleware((_auth, req) => withPathname(req))
  : (req: NextRequest) => withPathname(req);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
