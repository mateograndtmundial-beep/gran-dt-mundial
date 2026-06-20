"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { getMyUsername } from "@/lib/actions";

/**
 * Muestra el nombre de DT (username) del usuario en el header, al lado del avatar de
 * Clerk. El username es nativo nuestro (se elige en el onboarding y vive en la DB), no
 * lo maneja Clerk — así la gente puede ver cuál es el suyo. Linkea a su equipo. Se oculta
 * en pantallas chicas para no saturar la barra.
 */
export function UsernameBadge() {
  const { isLoaded, isSignedIn } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) getMyUsername().then(setUsername).catch(() => {});
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn || !username) return null;

  return (
    <Link
      href="/mi-equipo"
      title="Tu nombre de DT"
      className="hidden max-w-[10rem] items-center truncate rounded-[6px] px-2 py-1 text-sm font-semibold text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors sm:inline-flex"
    >
      @{username}
    </Link>
  );
}
