# Formatos y generación — Contenido de redes

> Qué tamaño tiene cada placa, de qué template sale y con qué comando se genera. Estilo visual:
> ver [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md). Copy/estrategia: ver [`COPY-VOICE.md`](./COPY-VOICE.md).

## Formatos por plataforma

| Pieza | Tamaño | Relación | Plataforma |
|---|---|---|---|
| **Carrusel de puntajes** | 1080×1350 | 4:5 | Instagram / Facebook (post) |
| **Story "figura del partido"** | 1080×1920 | 9:16 | Instagram/FB Stories, Reels cover |

Render: Playwright/Chromium a `deviceScaleFactor=2` y downscale LANCZOS con `sharp`
(`lib/stories/render.ts`). Salida PNG.

### Carrusel (IG/FB)
- **Una publicación por unidad**: en fase de grupos = 1 carrusel por `(fecha, grupo)`; en
  eliminatorias = 1 carrusel por partido.
- **Orden de slides**: portada (`_01`) → una tabla por equipo (`_02…`) → leyenda (último).
- Máximo **10 imágenes/post** (un grupo = 6 slides, holgado).

### Story (IG/FB Stories)
- Placa vertical 9:16 de la **figura del partido** (mejor puntaje del partido).
- Una por partido terminado.

### X / Twitter
- **Máx 4 imágenes por tweet** → el carrusel va como **hilo de 3 tweets**: `T1` portada · `T2` las 4
  tablas · `T3` leyenda + link.
- El feed **recorta el 4:5** a ~16:9 (se ve el centro; el título arriba sobrevive).
- **Timing real-time**: postear apenas termina la última fecha del grupo (el alcance en X es la
  primera hora). El link va en bio o en el `T3`, no en la cabeza.
- Detalle completo en [`COPY-VOICE.md`](./COPY-VOICE.md).

## Templates → archivo → comando

| Pieza | Template | Builder de datos | Comando |
|---|---|---|---|
| Carrusel: portada | `assets/stories/scoreboard-cover.html` | `lib/stories/scoreboard-data.ts` | `npm run scoreboards` |
| Carrusel: tabla equipo | `assets/stories/scoreboard-team.html` | `lib/stories/scoreboard-data.ts` | `npm run scoreboards` |
| Carrusel: leyenda | `assets/stories/scoreboard-legend.html` | `lib/stories/scoreboard-data.ts` | `npm run scoreboards` |
| Story figura | `assets/stories/template.html` | `lib/stories/recap-data.ts` | `npm run stories` |

Assets compartidos: `assets/stories/flags.json` (banderas base64), `assets/stories/icons/*` (PNG de
eventos), `assets/stories/fonts/` (Archivo Black embebida), `public/images/logo/logo-badge-192.png`.

### Comandos

```bash
npm run scoreboards -- --demo          # carrusel de prueba (sin DB) → out/scoreboards
npm run scoreboards -- --round 1       # todas las unidades de la fecha 1 → out/scoreboards
npm run scoreboards -- --round 1 --slack   # postea esas unidades a #SOCIAL (idempotente)
npm run scoreboards -- --pending       # = lo que corre el cron

npm run stories -- --demo              # story figura de prueba → out/stories
npm run stories -- --round 1           # stories de los partidos terminados de la fecha 1
npm run stories -- --match 123 --slack # postea la story de un partido a #SOCIAL
```

> Las imágenes salen a `out/` (gitignored). No se commitean; se regeneran con el comando.

## Auto-posteo a Slack (#SOCIAL)

- **Cron** de Vercel (`/api/cron/sync`) sincroniza y luego postea lo pendiente (stories + carruseles).
- **Botones en `/admin`** para disparar a mano (idempotente).
- Idempotencia del carrusel: tabla `scoreboard_posts` (no re-postea una unidad ya publicada).
- **Config necesaria en prod** (Vercel): `SLACK_CHANNEL_SOCIAL` (ID del canal), `SLACK_BOT_TOKEN` con
  scope **`files:write`** (+ bot invitado al canal), `CRON_SECRET`. Ver `.env.example`.

> Slack es el **buzón de salida**: las imágenes llegan ahí y desde ahí se suben a IG/FB/X con la
> caption correspondiente (el posteo a las redes es manual).
