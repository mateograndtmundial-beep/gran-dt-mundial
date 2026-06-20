# Guía para crear placas de redes (carruseles explicativos / promo)

> **Cuándo leer esto:** vas a **generar una placa nueva** para el feed (un carrusel explicativo, una
> promo, un anclado) que **no** sea un scoreboard automático. Resume lo aprendido construyendo el
> carrusel "¿Qué es Los 11 de Sampa?" (ver `scripts/generate-que-es.ts` + `out/que-es/`).
>
> Estética = [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md). Formatos/tamaños = [`FORMATS.md`](./FORMATS.md).
> Texto/caption = [`COPY-VOICE.md`](./COPY-VOICE.md). **Esta guía es el "cómo construir la placa bien".**

---

## 0. Cómo se generan (pipeline)
- **No se diseñan en Figma ni a mano:** se arman en **HTML/CSS** y se rasterizan con
  `renderPng(html, {width,height})` de `lib/stories/render.ts` (Playwright/Chromium 2× + downscale
  LANCZOS). Mismo motor que los scoreboards.
- Patrón: un **script `scripts/generate-*.ts`** que arma el HTML de cada slide (funciones que
  devuelven el HTML), comparte un "chrome" común, y escribe los PNG a `out/<nombre>/` (gitignored).
  Referencia copiable: **`scripts/generate-que-es.ts`**.
- **Familia "Liga Premium"** (lanzamiento de la Copa): **un generador por publicación**,
  `scripts/generate-copa-N.ts` → `out/copa-N/` (`npx tsx scripts/generate-copa-N.ts`). Reusan el
  **toolkit de `generate-que-es.ts`** (helpers `flag` / `figure` / `pitch` / `benchItem`, banderas de
  `flags.json`) y comparten el **chrome premium** (footer `LOS11DESAMPA.COM/COPA` + tag "Liga
  Premium", acento dorado). Catálogo de figuras ya construidas en §3.5.
- **Lienzo feed:** 1080×1350 (4:5). Story: 1080×1920 (9:16). Ver `FORMATS.md`.
- **Assets reutilizables** (no recrear): logo `public/images/logo/logo-badge-192.png`; fuente de
  títulos `assets/stories/fonts/archivo-black-latin.woff2`; **banderas** `assets/stories/flags.json`
  (`{ CODE: { name, group, b64 } }`, `b64` es un data-URI listo para `<img src>`); íconos de evento
  `assets/stories/icons/*`.

---

## 1. Gotchas técnicos que SÍ o SÍ hay que respetar
Estos costaron iteraciones. No tropezar de nuevo:

1. **Cargar Poppins por Google Fonts.** El cuerpo va en **Poppins** (igual que los reminders). Si no
   incluís el `<link>`, cae a una sans del sistema y **se nota** que "no es la misma fuente":
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
   ```
   El render espera `networkidle`, así que la fuente alcanza a descargar.

2. **El acento de color en títulos perdía el peso (bug del `*`).** Con
   `*{font-family:'Poppins'}` (selector universal), un `<span>` de acento **dentro** de un título
   Archivo Black hereda Poppins (más finita) → el "11" azul se veía más angosto que las letras
   negras. **Fix:** forzar la fuente de títulos en todos sus descendientes:
   ```css
   .title, .title *, .num, .num * { font-family:'TitleHeavy',sans-serif !important; }
   ```
   Los `<span class="b">` (azul) / `<span class="g">` (dorado) deben quedar **del mismo ancho/peso**
   que el texto negro.

3. **Títulos = Archivo Black embebida** (`@font-face 'TitleHeavy'` desde el woff2 en base64).
   Cuerpo/labels = Poppins. Numerales de dato (precios, puntos) = Archivo Black (`.num`).

4. **Screenshots de elemento (Playwright MCP) salen a 1×** (≈324–400px de ancho) → quedan
   **borrosos** al escalar a 1080. Por eso **no usamos capturas de la app** en las placas (ver §2).

5. **Íconos = Lucide, NUNCA dibujados a mano.** Los SVG hechos "a ojo" se notan generados por IA
   (proporciones y curvas raras). Usá los **paths oficiales de Lucide** (ya es dependencia del
   proyecto: `lucide-react`). Patrón estándar en los generadores `copa-N`:
   ```ts
   function lucide(paths: string, s: number, c: string, sw = 2): string {
     return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}"
       stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
   }
   const ICON = { trophy: (s=46,c="#7A5C10") => lucide('<path d="…"/>…', s, c), … };
   ```
   Los `d=` salen **del paquete instalado** (exactos, no inventados):
   `grep -oE 'd: "[^"]+"' node_modules/lucide-react/dist/esm/icons/<nombre>.mjs`
   (sumá `cx/cy/r` si el ícono trae `circle`). Mantené el `viewBox 0 0 24 24` y el stroke redondeado.

---

## 2. Principios de contenido (qué poner)
Aprendido a los golpes en este carrusel:

- **Respondé "¿QUÉ ES?" y explicá el ~80% del juego**, no un teaser vago. Una placa puede (y debe)
  tener densidad de información si está bien jerarquizada.
- **Organizá por CONCEPTO, no por "Paso 1/2/3"** (los pasos envejecen y se equivocan fácil).
- **Nada de screenshots de la app.** Se ven mal en el feed (baja resolución, recortes, chrome de
  navegador). **Recreá** lo que quieras mostrar como placa diseñada (ej. una cancha dibujada con
  figuritas, no un print de `/equipo`).
- **Menos texto, más figura.** Si un dato se puede mostrar con un esquema/figura/ejemplo, hacelo.
  Ejemplos que funcionaron: la **cancha con la formación real**, el **capitán 8 → ×2 → 16**, el
  **banco: titular tachado → entra suplente** (con flecha **gruesa**, las finitas se pierden).
- **Llená el espacio sin saturar.** Una placa con un bloque chico arriba y el resto en blanco se ve
  amateur ("no puede ser que subas eso a un feed"). Distribuí: agrandá títulos, sumá una figura,
  estirá cards. Pero tampoco amontones — jerarquía clara (un dato manda, el resto acompaña).
- **Datos exactos del código.** Sacá los valores reales de `lib/game/config.ts` (BUDGET=700,
  scoring, formaciones, fechas) — no inventes ni dejes números viejos.
- **Hechos correctos.** No afirmar cosas falsas por un buen gancho (ej.: "el prode se te termina en
  fase de grupos" es **falso**). El contraste válido con el prode es **suerte vs. skill**.

---

## 3. Sistema visual aplicado (cómo se ve)
Todo lo de `VISUAL-SYSTEM.md`, más lo que estandarizamos acá:

- **Chrome común en todas las placas:** header (logo badge borde azul + "LOS **11** DE SAMPA") ·
  **page pill** `01/07` arriba derecha · **ghost "11"** gigante al ~4% al fondo · footer con pill
  `LOS11DESAMPA.COM` (izq) + "EL JUEGO DE LOS DT" (der) · fondo `#F0F2F0` con textura de ruido ~0.05.
- **Un solo acento de color por placa** (en `VISUAL-SYSTEM.md`): **azul** para concepto general;
  **dorado** para capitán / figura / premios; **verde** solo si aparece la cancha.
- **Cards** = blanco, **borde negro 2px + sombra dura** (sin blur), radio 12–14px. Es el sello de la
  familia (igual que el top-3 de las stories y los bloques de marcador de los scoreboards).
- **Chips de posición Panini:** POR ámbar · DEF azul · MED verde · DEL rojo (fondo + texto + label).
- **Para destacar un dato sobrio:** card **negra** (`#101726`) con **detalle dorado** y número en
  blanco (así quedó el "700M"). Mejor que un número de color suelto.
- **Sin emojis como UI chrome:** usá **íconos de Lucide** (trofeo, escudo, ticket, usuarios, reloj,
  pin, check, x — ver §1.5 para el patrón y de dónde sacar los paths). Los emojis sueltos abaratan y
  se ven inconsistentes; la única excepción son las **banderas** (que ya son imágenes reales).
- **Cancha / formación:** dibujada (gradiente verde a franjas + líneas SVG), figuritas = bandera
  real (de `flags.json`) con borde del color de su posición + pill de nombre + precio; capitán con
  badge **C** dorado. Si la mostrás, que **entre completa** (no cortada por el footer) y que los
  jugadores sean **grandes y apretados** (chicos y espaciados se ven flojos). Equipo de ejemplo
  canónico: **"Jogo Bonito"** (3-4-3) — está cableado en `scripts/generate-que-es.ts`. **Variá el 15
  entre placas** (no repitas el mismo XI tal cual en dos piezas): usá un equipo real capturado de la
  app y, si la cancha deja espacio, sumá el **banco** (4 suplentes + DT con `benchItem`).

---

## 3.5 Biblioteca de figuras (reusá lo que ya funcionó)
Cada slide debería tener **una figura protagonista**, no texto suelto. Las que ya están construidas y
quedaron bien (copiables de los generadores `copa-N` / `que-es`):

| Figura | Qué es | Dónde | Cuándo usarla |
|---|---|---|---|
| **Cancha + banco** | formación con figuritas reales + fila de suplentes | `que-es` s3, `copa-2` s2 | "armá tu equipo", mostrar el plantel |
| **Roadmap de nodos** | 3 pasos en cards conectadas con `»` | `copa-2` s1 | un proceso ("cómo entrás en 3 pasos") |
| **Ticket** | entrada dorada con muescas laterales + stub perforado | `copa-2` s3 | la inscripción / el precio de entrada |
| **Podio top-3** | escalones 1°/2°/3° con montos | `copa-3` s1 | premios, ranking, "no lo gana uno solo" |
| **Gráfico de barras** | barras horizontales proporcionales + monto/% | `copa-3` s2 | distribución del premio, datos comparables |
| **Contraste VS** | dos columnas (✗ rojo / ✓ verde) + badge "VS" | `copa-4` s2 | anti-objeción ("el prode vs. la Liga Premium") |
| **Bloque de premio** | card oscura `#101726` + borde dorado + numeral blanco gigante | `copa-1` s1, `copa-4` s3 | destacar `$400.000` como héroe |
| **Timeline / bracket** | rounds en pills con `›` (resaltar el de arranque) | `que-es` s6, `copa-4` s4 | "rankea desde 16vos hasta la final" |
| **Tira de stats** | 3 cards (dato grande + label) | `copa-1` s2, `copa-2` s3 | entrada/cupo/cierre de un vistazo |
| **Grilla de cupo** | 10×10 lugares (ocupados dorado / libres blanco) | `copa-5` s1 | escasez: cupo finito `X/100` en vivo |
| **Barra de presupuesto** | track con fill + "usaste/tope/te queda" | `copa-4` s2 | criterio de presupuesto (700M sin pasarse) |

**Jerarquía del héroe (un dato manda):** cuando hay un número estrella (ej. `$400.000`), que sea el
**más grande** de la placa; los datos de apoyo (16vos, 28/06, cupo) van **claramente más chicos** —
ni minúsculos ni compitiendo. Si un dato secundario quedó tan grande como el héroe, achicalo.

---

## 4. Checklist antes de dar una placa por buena
- [ ] ¿Se ve a **1080×1350** sin texto cortado, sin elementos pisando el footer, sin scroll/overflow?
- [ ] ¿El **acento de color** tiene el mismo ancho/peso que el texto negro? (bug del `*`)
- [ ] ¿La **fuente del cuerpo es Poppins** (no la sans del sistema)?
- [ ] ¿**Llena** la placa sin quedar saturada? ¿Hay jerarquía (un dato manda)?
- [ ] ¿Los **datos son los reales** del código y los **hechos son correctos**?
- [ ] ¿Header, page pill, ghost "11" y footer **presentes y consistentes** con las demás?
- [ ] ¿Cero screenshots de la app? ¿Cero emojis como chrome? ¿**Íconos de Lucide** (no dibujados a mano)?
- [ ] ¿Cada slide tiene **una figura** (no solo texto)? ¿El dato héroe es el más grande (§3.5)?
- [ ] **Revisá la imagen renderizada** (abrir el PNG), no la des por buena sin mirarla.

---

> **Ejemplo de referencia end-to-end:** carrusel "¿Qué es Los 11 de Sampa?" → generador
> `scripts/generate-que-es.ts` (contenido de cada slide cableado ahí mismo), salida en `out/que-es/`.
