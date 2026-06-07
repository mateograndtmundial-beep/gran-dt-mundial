"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePostHog } from "posthog-js/react";

/**
 * Ata cada session replay / evento al usuario logueado: `identify` usando el
 * userId de Clerk como distinct_id estable, así el replay queda buscable por
 * usuario. Al cerrar sesión hace `reset` para no mezclar la próxima sesión
 * anónima con la anterior.
 */
export function PostHogIdentify() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const posthog = usePostHog();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId) {
      posthog.identify(userId);
      wasSignedIn.current = true;
    } else if (!isSignedIn && wasSignedIn.current) {
      // Sólo reseteamos en un logout real, no en cada carga anónima.
      posthog.reset();
      wasSignedIn.current = false;
    }
  }, [isLoaded, isSignedIn, userId, posthog]);

  return null;
}
