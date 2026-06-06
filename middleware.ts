import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Si no hay keys de Clerk configuradas, el middleware deja pasar todo
// (así la app corre igual mientras se termina la config de auth).
const enabled = !!process.env.CLERK_SECRET_KEY;

export default enabled ? clerkMiddleware() : (_req: NextRequest) => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
