// Sube un PNG a Slack con files.uploadV2 (3 pasos). Requiere scope files:write en
// la Slack App y SLACK_CHANNEL_SOCIAL = ID del canal (#SOCIAL). El cron de Vercel
// solo corre en producción, así que no hay riesgo de postear desde preview.

export async function uploadStoryToSlack(buf: Buffer, filename: string, comment: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_SOCIAL;
  if (!token) throw new Error("Falta SLACK_BOT_TOKEN");
  if (!channel) throw new Error("Falta SLACK_CHANNEL_SOCIAL (ID del canal, ej C0123ABC)");

  // 1) Pedir URL de subida.
  const r1 = await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ filename, length: String(buf.length) }),
  }).then((r) => r.json());
  if (!r1.ok) throw new Error(`getUploadURLExternal: ${r1.error}`);

  // 2) Subir los bytes del archivo.
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "image/png" }), filename);
  const up = await fetch(r1.upload_url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`upload: HTTP ${up.status}`);

  // 3) Completar y postear en el canal.
  const r3 = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      files: [{ id: r1.file_id, title: filename }],
      channel_id: channel,
      initial_comment: comment,
    }),
  }).then((r) => r.json());
  if (!r3.ok) throw new Error(`completeUploadExternal: ${r3.error}`);
}

/**
 * Sube varios PNGs como UN solo mensaje (carrusel) a #SOCIAL: se pide una
 * upload_url por archivo (paso 1+2 de files.uploadV2 para cada uno) y se
 * completan TODOS juntos en un único `completeUploadExternal` (Slack los
 * agrupa en un carrusel, en el orden dado). Mismo env que `uploadStoryToSlack`.
 */
export async function uploadCarouselToSlack(
  items: { buf: Buffer; filename: string }[],
  comment: string,
): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_SOCIAL;
  if (!token) throw new Error("Falta SLACK_BOT_TOKEN");
  if (!channel) throw new Error("Falta SLACK_CHANNEL_SOCIAL (ID del canal, ej C0123ABC)");
  if (!items.length) return;

  const fileIds: string[] = [];
  for (const { buf, filename } of items) {
    // 1) Pedir URL de subida.
    const r1 = await fetch("https://slack.com/api/files.getUploadURLExternal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ filename, length: String(buf.length) }),
    }).then((r) => r.json());
    if (!r1.ok) throw new Error(`getUploadURLExternal (${filename}): ${r1.error}`);

    // 2) Subir los bytes del archivo.
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buf)], { type: "image/png" }), filename);
    const up = await fetch(r1.upload_url, { method: "POST", body: form });
    if (!up.ok) throw new Error(`upload (${filename}): HTTP ${up.status}`);

    fileIds.push(r1.file_id);
  }

  // 3) Completar TODOS juntos → un solo mensaje con el carrusel, en orden.
  const r3 = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      files: fileIds.map((id, i) => ({ id, title: items[i]!.filename })),
      channel_id: channel,
      initial_comment: comment,
    }),
  }).then((r) => r.json());
  if (!r3.ok) throw new Error(`completeUploadExternal (carousel): ${r3.error}`);
}
