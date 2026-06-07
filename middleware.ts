import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Si no hay keys de Clerk configuradas, el middleware deja pasar todo
// (así la app corre igual mientras se termina la config de auth).
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
