# Sistema visual — Contenido de redes (Los 11 de Sampa)

> **Fuente de la verdad estética** para generar placas de redes (carrusel de puntajes, story
> "figura del partido", y lo que venga). Resume y referencia lo que ya está implementado en
> `assets/stories/*` y `lib/stories/*`. Para la UI de la **app** (no redes) ver
> [`../ui/UI-DIRECTION.md`](../ui/UI-DIRECTION.md) — comparten paleta y marca.

## Concepto

**Editorial Panini + Gran DT**, Mundial 2026, voz Argentina/LatAm. Estética de **figurita/álbum**:
fondo claro con textura sutil, cartas con **borde negro y sombra dura** (estilo sticker pegado),
numerales tipo camiseta, banderas reales. Limpio, con jerarquía fuerte y mucho contraste para que
se lea en el feed del celular.

## Paleta

Valores reales (de `app/globals.css :root` y `lib/stories/recap-data.ts`).

| Rol | Hex | Uso |
|---|---|---|
| Canvas / fondo | `#F0F2F0` | Fondo de todas las placas |
| Surface | `#FFFFFF` | Cartas, chips |
| Ink | `#111827` | Texto principal, bordes, sombras |
| Azul (primario/CTA) | `#1B4FD8` | Acentos, caja de grupo, pastilla de nota, link |
| Dorado | `#C8A24B` | Figura ★, top-3, capitán |
| Verde pitch | `#16713F` | Solo cancha / victoria |
| Oscuro (barras) | `#101726` | Barras inferiores, header de marcador |

**Estados (resultado del DT):** victoria `#16713F` · empate `#6B7280` · derrota `#D02B2B`.

**Colores por posición** (chips, barras de fila, badge de figura):

| Pos (DB) | Sigla UI | Color |
|---|---|---|
| GK | **ARQ** | `#E6B400` (ámbar) |
| DEF | **DEF** | `#1B4FD8` (azul) |
| MID | **MED** | `#1E9E4B` (verde) |
| FWD | **DEL** | `#D02B2B` (rojo) |

> Orden de aparición en tablas SIEMPRE: **ARQ → DEF → MED → DEL**.

## Tipografía

| Rol | Fuente | Reglas |
|---|---|---|
| **Títulos** | **Archivo Black** (family `'TitleHeavy'`, woff2 embebida en `assets/stories/fonts/`) | Mayúsculas, **ancha — NUNCA `scaleX` que la comprima**, `letter-spacing` ~`0.005em`. Es la fuente "numeral/camiseta" del proyecto. |
| Cuerpo / labels | Poppins (en placas) / Manrope (app) | Pesos 700–800 para datos, 600 para secundarios |
| Eyebrows | Poppins 800 | Mayúsculas, `letter-spacing` 0.14–0.2em, color `#9CA3AF` |

Reglas de título:
- Un solo acento de color (ej. el punto final en azul, o una palabra en azul) — el resto en ink.
- Títulos largos de eliminatorias se **achican** para no desbordar (ver `titleSize()` en
  `lib/stories/scoreboard-data.ts`): ~112px (≤7) / 82px (≤11) / 64px (más largos).
- El gancho/título principal va arriba (sobrevive al crop de X).

## Iconografía de eventos

Glyph por evento. **Regla de oro: fondo transparente, sin recuadro blanco, sin watermark.**
Los PNG se procesan en runtime con `sharp` (`processIcon` en `lib/stories/scoreboard.ts`): recorta
el padding, saca marcas de agua de stock al pie, y convierte el blanco en transparente.

| Evento | Glyph | Origen |
|---|---|---|
| Gol (jugada) | ⚽ pelota negra | PNG `icons/gol_pelota.png` (procesado) |
| Asistencia | botín | PNG `icons/asistencia_botin.png` |
| Gol de penal | arco + pelota | PNG `icons/gol_penal_arco.png` |
| Penal atajado | guante | PNG `icons/penal_atajado_guante.png` |
| Figura | ★ estrella **dorada** | SVG inline |
| Valla invicta | escudo + candado **verde** | SVG inline |
| T. amarilla / roja | rectángulo amarillo / rojo | SVG inline |
| Gol recibido (ARQ) | arco en **gris** | PNG arco + `filter:invert(0.55)` |
| Penal errado | pelota **gris** + diagonal roja | PNG pelota gris + SVG |
| Gol en contra | pelota + flecha roja abajo | PNG pelota + SVG |

Reglas:
- **Dedupe `×N`** cuando hay repetidos (ej. una pelota + `×2`).
- Tamaños: **30px** en filas de tabla, **38px** en la leyenda. Misma función para ambos
  (`iconGlyph(kind, icons, size)`) → leyenda y tablas siempre coinciden.
- **Pastilla de nota (1–10):** badge redondeado azul `#1B4FD8` con el número en blanco y sombra dura
  (NO un número suelto).

## Lenguaje de componentes

Lo que hace que todo "sea de la misma familia":

- **Sombra dura**: `box-shadow: Nx Nx 0 <ink/alpha>` (sin blur). Cartas 4–6px, chips 2–3px.
- **Borde**: `2px solid #111827` en cartas/chips destacados.
- **Esquinas**: redondeadas (6–18px según el elemento).
- **Textura**: overlay de ruido `feTurbulence` a `opacity 0.05` sobre el canvas.
- **Ghost numeral**: un "11" gigante al ~4% de opacidad de fondo.
- **Header** (todas las placas): logo badge circular 62px (borde azul) + wordmark
  **"LOS 11 DE SAMPA"** (el "11" en azul) + **page counter** pill (`01 / 06`).
- **Pills**: URL `LOS11DESAMPA.COM` (fondo ink, texto blanco) abajo a la izquierda.
- **Flag chips**: bandera real con borde fino y sombrita.
- **Barra "DESLIZÁ »»"**: en portadas de carrusel, invita a deslizar (es una publicación, no un botón
  → `»»`, nunca un `→` que parezca "siguiente/tap").

## Reglas de layout

- Orden de jugadores: **ARQ → DEF → MED → DEL**, y dentro de cada puesto por puntos desc.
- **Topes** (tabla por equipo): **11 titulares**, **5 suplentes** (6 si hubo alargue). Solo jugadores
  que entraron (minutos > 0). Ver `buildTeamData` en `lib/stories/scoreboard-data.ts`.
- Filas que jugaron <20': atenuadas, nota `-`, 0 pts.
- Leyenda: **grilla pareja** (sin cards huérfanas; nº par de items).
- Jerarquía del carrusel: **portada → una tabla por equipo → leyenda**.

## Do / Don't

**Do**
- Mantener el header, la URL pill y el page counter en todas las placas.
- Títulos en Archivo Black, anchos, en mayúsculas.
- Íconos transparentes, sin recuadro blanco; dedupe con `×N`.
- Un solo acento de color por título.

**Don't**
- No comprimir títulos con `scaleX`.
- No dejar números/datos "sueltos" sin su chip/pastilla.
- No usar el `→` de "siguiente" en una publicación (usar `»»` "deslizá").
- No inventar colores fuera de la paleta (especialmente para posiciones/estados).
- No pegar PNGs con fondo blanco o watermark — pasarlos por `processIcon`.
