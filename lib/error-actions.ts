"use server";

import { notifyError } from "@/lib/notify/slack";

/**
 * Reporta a Slack un error capturado por el error boundary del cliente
 * (app/error.tsx). Es un server action porque el boundary corre en el browser.
 */
export async function reportClientError(input: {
  message: string;
  digest?: string;
  url?: string;
}): Promise<void> {
  notifyError({
    source: "client",
    message: (input.message || "").slice(0, 500) || "(sin mensaje)",
    digest: input.digest,
    url: input.url,
  });
}
