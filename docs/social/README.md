# `/docs/social` — Dirección estética de redes (fuente de la verdad)

> **Referencia única** para generar contenido de redes de Los 11 de Sampa (carrusel de puntajes,
> story "figura del partido", y lo que venga). Antes de crear una placa o un caption nuevo, mirá acá.
> Es la dirección de **redes**; la de la **app** vive en [`../ui/UI-DIRECTION.md`](../ui/UI-DIRECTION.md)
> (comparten paleta y marca).

## Archivos

| Doc | Para qué | Leelo si... |
|---|---|---|
| [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md) | **Núcleo estético**: paleta, tipografía (Archivo Black), iconografía de eventos, lenguaje de componentes (sombra dura, pills, header), reglas de layout, do/don't. | Vas a diseñar o tocar una placa. **Empezá acá.** |
| [`FORMATS.md`](./FORMATS.md) | Tamaños por plataforma (carrusel 1080×1350, story 1080×1920, X), qué template usa cada pieza y con qué comando se genera, y el auto-posteo a Slack. | Vas a generar imágenes o adaptar a otro formato/red. |
| [`COPY-VOICE.md`](./COPY-VOICE.md) | Voz de marca, estructura de caption, hashtags, CTAs y estrategia por red (IG/FB/X/Stories). | Vas a escribir el texto de una publicación. |

## Cómo usarlo

1. **Estilo** → `VISUAL-SYSTEM.md` (no inventes colores/fuentes/íconos fuera de ahí).
2. **Generar las placas** → `FORMATS.md` (template + comando, ej. `npm run scoreboards -- --round N`).
3. **Escribir el texto** → `COPY-VOICE.md` (estructura + hashtags + red).

## Grounding (de dónde sale todo)

Estos docs **resumen y referencian** lo implementado — la verdad de implementación vive en el código:
- Templates: `assets/stories/scoreboard-{cover,team,legend}.html`, `template.html`, `fonts/`, `icons/`.
- Código: `lib/stories/scoreboard-data.ts`, `scoreboard.ts`, `recap-data.ts`, `render.ts`.
- Tokens compartidos con la app: `app/globals.css` (`:root`), `../ui/tokens.css`.
- Ejemplo aplicado real (Fecha 1): `out/scoreboards/captions-fecha1.md`.

> Si cambiás un valor estético en el código (color, ícono, tamaño), **actualizá `VISUAL-SYSTEM.md`**
> para que siga siendo la fuente de la verdad.
