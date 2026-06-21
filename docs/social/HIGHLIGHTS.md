# Destacadas (Instagram Highlights)

> Los paquetes de **stories 9:16** que se anclan arriba del perfil para responder lo que se
> pregunta quien *stalkea* la cuenta antes de jugar. Evergreen (no se vencen). Diseño de la
> misma familia que el resto: ver [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md) y
> [`PLACAS-GUIDELINES.md`](./PLACAS-GUIDELINES.md). Generador: `scripts/generate-highlights.ts`.

## Qué hay

| Destacada | Pack | Frames | Acento | Cubre |
|---|---|---|---|---|
| **EMPEZÁ ACÁ** | `empeza` | 4 | azul | Qué es + **cancha con figuritas reales** + cómo se juega en 3 pasos. |
| **PUNTAJES** | `puntaje` | 6 | azul/dorado | Base = **nota 1–10**, lo que suma (goles en 1 sección + DT +2), lo que resta (GK −1 por gol recibido + DT −2), **capitán ×2 al final**. |
| **LIGA PREMIUM** | `copa` | 5 | dorado | Portada de impacto con **$400.000**, qué es, **reparto al top 10**, cómo entrar, CTA con stats. |
| **JUGÁ CON AMIGOS** | `gratis` | 4 | verde | **Anti-prode** (portada), gratis, **liga privada con tabla de ranking**, pines. |
| **RESULTADOS** (F1…Final) | — | covers | azul/dorado | Las destacadas de resultados por fecha (ya existían): solo **tapas**. |

Los **números del juego** (puntaje, presupuesto, cambios) se importan de `lib/game/config.ts`
(`SCORING`, `BUDGET`, `SQUAD`, `FREE_CHANGES_PER_ROUND`) → nunca se desincronizan con el juego.

## Tapas circulares (covers)

- **FAQ**: `out/highlights/covers/cover-{empeza,puntaje,copa,gratis}.png` (1080×1080).
- **Resultados**: `out/highlights/round-covers/cover-{fecha-1..3, ko-4..8}.png` — F1/F2/F3,
  16vos, 8vos, 4tos, Semis, Final. Nombres tomados de `ROUNDS` (config).
- Se exportan **1080×1080**; Instagram las recorta a círculo → el contenido va centrado.

## Comandos

```bash
npm run highlights -- --all                       # 4 packs + todas las tapas
npm run highlights -- --pack puntaje              # un pack
npm run highlights -- --pack copa --enrolled 72   # la Copa mostrando el cupo real
npm run highlights -- --covers                    # solo tapas FAQ
npm run highlights -- --round-covers              # solo tapas de resultados (F1…Final)
```
Salida en `out/highlights/<pack>/` y `out/highlights/{covers,round-covers}/` (todo gitignored).

## Reglas propias del formato Story (≠ feed)

- **9:16 = 1080×1920**. Instagram **tapa ~250px arriba** (foto/nombre) y **~250px abajo**
  (barra de respuesta). El chrome ya deja el header con `padding-top:150px` y el footer por
  encima de la zona muerta → **no pongas nada crítico en esos bordes**.
- **Cupo de la Copa = REAL**: pasalo por `--enrolled <N>` (de `getCopasStatus`), nunca inflar.
  Sin `--enrolled` la story **no muestra cupo** (a propósito: es una destacada anclada, un
  número fijo envejecería). El premio es fijo y **garantizado**.
- Al publicar: subí los frames de un pack en orden (`_01 → _0N`), poné la **tapa** de ese
  pack como cover de la destacada, y en el último frame recordá el **link sticker** al juego.
- Orden sugerido en el perfil: `EMPEZÁ ACÁ · PUNTAJES · LIGA PREMIUM · JUGÁ CON AMIGOS · RESULTADOS`.
