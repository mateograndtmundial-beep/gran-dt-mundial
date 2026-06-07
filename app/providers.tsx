"use client";

import type { ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * Provee al árbol de React el cliente de PostHog ya inicializado en
 * `instrumentation-client.ts`. Habilita los hooks (`usePostHog`) y la
 * identificación de usuarios (ver `PostHogIdentify`). No reinicializa: usa el
 * singleton.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
