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
- **Sin emojis como UI chrome:** usá **íconos SVG** (globo, usuarios, trofeo, flechas). Los emojis
  sueltos abaratan; la única excepción son las **banderas** (que ya son imágenes reales).
- **Cancha / formación:** dibujada (gradiente verde a franjas + líneas SVG), figuritas = bandera
  real (de `flags.json`) con borde del color de su posición + pill de nombre + precio; capitán con
  badge **C** dorado. Si la mostrás, que **entre completa** (no cortada por el footer) y que los
  jugadores sean **grandes y apretados** (chicos y espaciados se ven flojos). Equipo de ejemplo
  canónico: **"Jogo Bonito"** (3-4-3) — está cableado en `scripts/generate-que-es.ts`.

---

## 4. Checklist antes de dar una placa por buena
- [ ] ¿Se ve a **1080×1350** sin texto cortado, sin elementos pisando el footer, sin scroll/overflow?
- [ ] ¿El **acento de color** tiene el mismo ancho/peso que el texto negro? (bug del `*`)
- [ ] ¿La **fuente del cuerpo es Poppins** (no la sans del sistema)?
- [ ] ¿**Llena** la placa sin quedar saturada? ¿Hay jerarquía (un dato manda)?
- [ ] ¿Los **datos son los reales** del código y los **hechos son correctos**?
- [ ] ¿Header, page pill, ghost "11" y footer **presentes y consistentes** con las demás?
- [ ] ¿Cero screenshots de la app? ¿Cero emojis como chrome?
- [ ] **Revisá la imagen renderizada** (abrir el PNG), no la des por buena sin mirarla.

---

> **Ejemplo de referencia end-to-end:** carrusel "¿Qué es Los 11 de Sampa?" → generador
> `scripts/generate-que-es.ts` (contenido de cada slide cableado ahí mismo), salida en `out/que-es/`.
