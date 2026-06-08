import posthog from "posthog-js";

// Init de PostHog en el cliente. Por la convención `instrumentation-client` de
// Next, este archivo corre DESPUÉS de cargar el HTML pero ANTES de la hidratación
// de React → el session replay graba desde el primer frame. No-op si falta la key
// (así dev local queda limpio salvo que la pongas en .env).
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  try {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Bundle de defaults moderno: pageviews/pageleave de SPA, autocapture, etc.
      defaults: "2026-05-30",
      // Sólo crea perfil de persona para usuarios identificados (logueados).
      person_profiles: "identified_only",
      // Observabilidad: captura excepciones no manejadas (window.onerror,
      // unhandledrejection) automáticamente — sin esto los 500 del cliente
      // sólo se ven como mensajes sueltos en Slack.
      capture_exceptions: true,
    });
  } catch (e) {
    console.error("[posthog] init failed:", e);
  }
}
