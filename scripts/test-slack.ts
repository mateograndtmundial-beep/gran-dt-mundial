import "dotenv/config";

/**
 * Diagnóstico del ruteo de Slack. Postea un mensaje de prueba a CADA canal
 * configurado (SLACK_CHANNEL_*) y reporta cuál anda y cuál no, con el motivo.
 *
 *   npm run test:slack
 *
 * Requiere SLACK_BOT_TOKEN + al menos un SLACK_CHANNEL_* en tu .env local.
 * (Si la env sólo está en Vercel, traela con `vercel env pull` o copiala al .env.)
 */

const TOKEN = process.env.SLACK_BOT_TOKEN;

const TARGETS = [
  { env: "SLACK_CHANNEL_DEFAULT", label: "DEFAULT (catch-all)" },
  { env: "SLACK_CHANNEL_PAGOS", label: "pagos" },
  { env: "SLACK_CHANNEL_USERS", label: "users" },
  { env: "SLACK_CHANNEL_ERRORES", label: "errores" },
  { env: "SLACK_CHANNEL_SCORING", label: "scoring" },
] as const;

async function postTest(channel: string, label: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      text: `:test_tube: Prueba de *Los 11 de Sampa* → canal *${label}*. Si ves esto, el ruteo anda 👍`,
    }),
  });
  return (await res.json()) as { ok: boolean; error?: string };
}

/** Pista accionable según el error que devuelve Slack. */
function hint(error?: string): string {
  switch (error) {
    case "not_in_channel":
      return '   → El bot no está en el canal: escribí "/invite @Los 11 de Sampa" ahí.';
    case "channel_not_found":
      return '   → Revisá el ID/nombre. Lo más robusto es el ID del canal ("C0…").';
    case "invalid_auth":
    case "not_authed":
    case "token_revoked":
      return "   → SLACK_BOT_TOKEN inválido/revocado. Reinstalá la app y copiá el xoxb- de nuevo.";
    case "missing_scope":
      return "   → A la app le falta el scope chat:write. Agregalo y reinstalá.";
    default:
      return "";
  }
}

async function main() {
  if (!TOKEN) {
    console.error("❌ Falta SLACK_BOT_TOKEN en .env");
    process.exit(1);
  }

  const configured = TARGETS.map((t) => ({
    env: t.env as string,
    label: t.label as string,
    value: process.env[t.env],
  })).filter((t): t is { env: string; label: string; value: string } => Boolean(t.value));

  if (configured.length === 0) {
    console.error(
      "❌ No hay ningún SLACK_CHANNEL_* configurado.\n" +
        "   Seteá al menos SLACK_CHANNEL_DEFAULT (ID del canal o #nombre).",
    );
    process.exit(1);
  }

  console.log(`Probando ${configured.length} canal(es)…\n`);
  let failures = 0;
  for (const t of configured) {
    const r = await postTest(t.value, t.label);
    if (r.ok) {
      console.log(`✅ ${t.env} (${t.value}) → enviado`);
    } else {
      failures++;
      console.log(`❌ ${t.env} (${t.value}) → ${r.error}`);
      const h = hint(r.error);
      if (h) console.log(h);
    }
  }

  const unset = TARGETS.filter((t) => t.env !== "SLACK_CHANNEL_DEFAULT" && !process.env[t.env]);
  if (unset.length) {
    console.log(`\nℹ️  Sin setear → caen al DEFAULT: ${unset.map((u) => u.label).join(", ")}`);
  }
  console.log(failures ? `\n☝️  ${failures} canal(es) fallaron.` : "\n🎉 Todo OK, los canales reciben.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
