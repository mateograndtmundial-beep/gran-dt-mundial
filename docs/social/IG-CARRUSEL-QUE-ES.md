# Carrusel ANCLADO #1 — "¿Qué es Los 11 de Sampa?" (explicativo)

> **Doc de iteración.** Define **qué dice y cómo se ve cada slide** del carrusel anclado que
> explica el juego. Primero cerramos esto en texto; recién después se generan las placas.
>
> **Decisiones que mandan acá** (pedido del dueño):
> - ❌ **Sin screenshots de la app.** Todo es placa diseñada (texto + elementos de marca).
> - ❌ **Sin "Paso 1/2/3".** Se organiza por **concepto**, no por pasos.
> - ✅ Debe responder **QUÉ ES el juego** y explicar **~80% del funcionamiento** (no un teaser).
> - ✅ Estética = `docs/ui/UI-DIRECTION.md` + misma familia visual que `out/scoreboards`,
>   `out/stories`, `out/social-reminder`.

---

## Lenguaje visual (igual a scoreboards / stories / reminders)
Todas las placas comparten el mismo "chrome" de marca, para que se lea como la misma cuenta:

- **Lienzo:** 1080×1350 (4:5, carrusel IG/FB). Fondo `#F0F2F0` con **textura de ruido** (opacity ~0.05).
- **Header** (arriba, en todas): logo badge circular (borde azul) + wordmark **"LOS 11 DE SAMPA"**
  (el **11** en azul) + **pill** arriba a la derecha (page counter `01/07` o etiqueta corta).
- **Ghost numeral:** un **"11"** gigante al ~4% de opacidad, abajo a la derecha del fondo.
- **Títulos:** **Archivo Black** (`TitleHeavy`), MAYÚSCULAS, apretados (`tracking` ~0), **un solo
  acento de color** por título (una palabra en **azul** `#1B4FD8`, o **dorado** `#C8A24B` cuando es
  capitán/figura/premio). Nunca comprimir con scaleX.
- **Cuerpo / labels:** Poppins. Eyebrows en `#9CA3AF`, uppercase, `letter-spacing` alto.
- **Cards:** blancas, **borde negro 2px + sombra dura** (sin blur), esquinas 12–14px. (Igual que las
  filas del top-3 de `out/stories` y los bloques de marcador de `out/scoreboards`.)
- **Pills:** oscuras (`#101726`) o azules con texto blanco para destacar un dato (como el `FECHA 2`
  azul del reminder). **Numerales** de datos en Archivo Black.
- **Chips de posición (Panini):** `POR` ámbar (`#D97706`/`#FEF3C7`) · `DEF` azul (`#1E40AF`/`#DBEAFE`)
  · `MED` verde (`#059669`/`#D1FAE5`) · `DEL` rojo (`#DC2626`/`#FEE2E2`). Siempre fondo + texto.
- **Footer** (en todas): pill **`LOS11DESAMPA.COM`** (abajo izq) + **"EL JUEGO DE LOS DT"** (abajo der).
- **Iconografía de eventos** (para la slide de puntaje): reutilizar los glyphs ya procesados de
  `assets/stories/icons/*` (pelota de gol, botín de asistencia, etc.) + SVG inline (★ figura dorada,
  escudo+candado verde para valla, tarjetas). Mismas reglas que `VISUAL-SYSTEM.md`.

> **Acento de color por slide** (para que el carrusel "respire" y no sea monótono): azul para las
> placas de concepto general; **dorado** en la del capitán y en "figura del partido"; verde solo si
> aparece la cancha. Un acento por placa.

---

## Estructura del carrusel — 7 slides

| # | Slide | Idea central | Acento |
|---|---|---|---|
| 1 | Portada | "¿Qué es Los 11 de Sampa?" | azul |
| 2 | La idea | Sos el DT: tu equipo de figuras reales suma por lo que hacen en la cancha | azul |
| 3 | Armá tu plantel | 15 + DT, presupuesto 700M, precios, formación | azul |
| 4 | Cómo sumás puntos | Goles por puesto, asistencia, valla, figura, lo que resta, el DT | azul + dorado |
| 5 | Capitán y banco | El capitán duplica; el banco entra solo si un titular no juega | dorado |
| 6 | Todo el Mundial | 8 fechas; sumate cuando quieras y competí desde la fecha que elijas | azul |
| 7 | Competí + se viene | Ranking + ligas con amigos, gratis; y se vienen premios desde 16vos | azul |

> Cubre ~85% del juego: qué es, plantel/presupuesto, scoring completo, capitán/auto-sustitución,
> calendario/cuándo sumarte, y dónde competís. La Liga Premium **no** se explica (es la pieza gratis)
> pero la slide 7 **teasea** que "se vienen premios desde 16vos".

---

## Slide 1 — Portada
**Objetivo:** frenar el scroll y plantar la pregunta que el carrusel responde.

**Layout:**
- Header de marca.
- **Eyebrow:** `EL FANTASY DEL MUNDIAL 2026`.
- **Título gigante** (Archivo Black, 3 líneas): **¿QUÉ ES<br>LOS 11<br>DE SAMPA?** — con **"11"** en azul.
- **Bajada** (Poppins, peso 600): *"Sos el DT. Armás tu equipo del Mundial y competís con tus amigos
  durante todo el torneo."*
- **Barra inferior "DESLIZÁ »»"** (idéntica a la portada de los scoreboards): *"Te lo explicamos
  en 1 minuto »»"*.
- Footer de marca.

**Por qué:** título-pregunta = promesa clara de que en el carrusel está la respuesta. Sin "paso".

---

## Slide 2 — La idea en 10 segundos
**Objetivo:** que en una placa se entienda el corazón del juego.

**Layout:**
- Eyebrow: `LA IDEA`.
- Título: **SOS EL <span azul>DT</span>.**
- Cuerpo en **3 líneas-bloque** (cada una en su mini-card blanca con borde+sombra, apiladas — como
  las filas del top-3):
  1. 🧩 **Armás un equipo** con cracks **reales** del Mundial (15 jugadores + un técnico).
  2. ⚽ **Ellos juegan** sus partidos de verdad → vos **sumás puntos** por lo que hacen en la cancha.
  3. 🏆 **Gana** el que mejor arma y dirige. Todo el Mundial, fecha a fecha.
- Cierre (eyebrow centrado): *"No es adivinar resultados. Es saber de fútbol."*

**Por qué:** responde "qué es" sin jerga; el contraste final ("no es adivinar… es saber de fútbol")
engancha con el público del prode sin nombrarlo.

---

## Slide 3 — Armá tu plantel
**Objetivo:** explicar la construcción del equipo y la restricción de presupuesto (lo que lo hace
estratégico).

**Layout:**
- Eyebrow: `ARMÁ TU PLANTEL`.
- Título: **15 FIGURAS + <span azul>1 DT</span>.**
- **Bloque "card" central** con los datos como mini-fichas (numerales Archivo Black):
  - **11** titulares · **4** suplentes · **1** técnico.
  - **Presupuesto: 700M.** Cada jugador cuesta según su nivel (de **5M** a **150M**): no entran todas
    las figuras juntas — ahí está el desafío.
- **Tira de chips de posición** (Panini, los 4 colores): `POR · DEF · MED · DEL`.
- Pie: *"Elegís tu formación: 4-4-2, 4-3-3, 4-2-4, 3-4-3 o 3-3-4."* (las 5 como pills pequeñas).

**Por qué:** el presupuesto + "no entran todas las figuras" comunica que hay **estrategia**, no es
elegir a los 15 mejores y listo.

---

## Slide 4 — Cómo se suman los puntos (la placa más densa)
**Objetivo:** el corazón del scoring. Es la que más "explica el juego".

**Layout (tabla tipo `out/scoreboards`, con íconos de evento):**
- Eyebrow: `CÓMO SUMÁS PUNTOS`.
- Título: **LO QUE PASA EN LA <span azul>CANCHA</span>.**
- **Tabla "SUMAN"** (cards/filas con ícono + concepto + valor; el gol **desglosado por puesto**, que
  es el dato estrella):
  - ⚽ **Gol** — según el puesto: **POR 12 · DEF 9 · MED 6 · DEL 4** (al arquero/defensor le vale más).
  - 🅿️ **Gol de penal** +3 · 👟 **Asistencia** +2.
  - 🛡️ **Valla invicta** — POR +3 · DEF +2.
  - 🧤 **Penal atajado** +4 · ★ **Figura del partido** +4 *(en dorado)*.
- **Tira "RESTAN"** (chips rojos, compacta): 🟨 Amarilla −2 · 🟥 Roja −4 · ⬇️ Gol en contra −2 ·
  ❌ Penal errado −4.
- **Pie — El técnico:** *"Tu DT también puntúa: su selección **gana +2**, **pierde −2**."*
- Nota chica: *"La base de cada jugador es su rating del partido (si jugó +20 min)."*

**Por qué:** es la placa que justifica el "explicá el 80%". Que el gol valga distinto por puesto es
el dato más jugoso y diferencial → va **desglosado y destacado**.

> **Jerarquía (clave para que respire, 1 sola placa):** SUMAN grande con íconos arriba; RESTAN como
> tira chica de chips rojos; técnico al pie. Es la de mayor riesgo de saturación.

---

## Slide 5 — El capitán y el banco
**Objetivo:** las dos reglas que más cambian el resultado y que la gente no intuye. Va **después** del
scoring (primero se entiende qué es un "punto", recién ahí tiene sentido "duplicar").

**Layout (acento DORADO):**
- Eyebrow: `DOS CLAVES`.
- **Card 1 — Capitán** (borde **dorado**, badge **"C"** dorado como en la cancha):
  **El capitán <span dorado>duplica</span> su puntaje base.** Elegí bien al que va con la cinta.
- **Card 2 — El banco:** **Si un titular no juega, entra tu suplente** de esa posición
  automáticamente. Tu fecha nunca se "pierde" por un jugador que quedó afuera.

**Por qué:** el dorado del capitán es un código que ya usamos (top-3, capitán) → coherencia. La
auto-sustitución es un diferencial tranquilizador.

---

## Slide 6 — Todo el Mundial (y todavía estás a tiempo)
**Objetivo:** calendario + el mensaje de que **te podés sumar cuando quieras**, aunque el Mundial ya
haya arrancado.

**Layout:**
- Eyebrow: `8 FECHAS`.
- Título: **DEL <span azul>GRUPO</span> A LA FINAL.**
- **Mini-timeline** (pills en fila): Grupos J1 · J2 · J3 → 16vos → 8vos → 4tos → Semis → Final.
- **Card destacada — "Sumate cuando quieras":**
  - **Aunque el Mundial ya empezó, todavía estás a tiempo.**
  - Te sumás cuando quieras y **competís desde la fecha que vos elijas**.
  - Después, **1 cambio gratis por fecha** y tu equipo se cierra al arrancar el primer partido de
    cada fecha.

**Por qué:** baja la objeción "¿no es tarde?" de quien lo descubre con el torneo en marcha — es clave
para captar en plena fiebre del Mundial. Ubica al usuario en el tiempo y deja claro que puede entrar ya.

---

## Slide 7 — Competí + se viene (CTA)
**Objetivo:** cerrar con dónde se compite, empujar al registro (gratis) y **teasear** que se vienen
premios desde 16vos (sin explicar la Liga Premium).

**Layout:**
- Eyebrow: `Y AHORA, A COMPETIR`.
- Título: **RANKING <span azul>GLOBAL</span> + LIGAS CON AMIGOS.**
- **Dos cards:** 🌐 **Ranking global** (todos los DT del país) · 👥 **Tu liga privada** (creás una y
  sumás a los pibes con un código).
- **Banda teaser** (pill dorada, estilo "premium" sin decir Liga Premium):
  **🏆 Y desde 16vos… se vienen sorpresas con premios. Atento.**
- **Pill/CTA grande azul** (como el `FECHA 2` del reminder): **los11desampa.com**.
- Refuerzo: *"Es **gratis**. Armás tu equipo en 5 minutos."*

**Por qué:** cierra el loop (qué es → cómo → dónde compito → entrá) y planta la intriga de los premios
para preparar el lanzamiento de la Liga Premium, sin spoilear ni mezclar el mensaje gratis.

---

## Caption (borrador)
> 🏆 ¿Qué es Los 11 de Sampa? El **fantasy del Mundial 2026**, te lo explicamos 👇
>
> Sos el **DT**: armás un equipo de 15 figuras reales + técnico con un presupuesto, elegís capitán
> y formación, y **sumás puntos por lo que tus jugadores hacen de verdad en la cancha** —goles
> (valen más si los mete un defensor 👀), asistencias, vallas invictas, la figura del partido—.
>
> Dura **todo el Mundial**, fecha a fecha. Y aunque ya arrancó, **todavía estás a tiempo**: te sumás
> cuando quieras y competís desde la fecha que elijas, en el **ranking global** y en tu **liga privada
> con amigos**. Gratis.
>
> 👀 Y atento: **desde los 16vos se vienen sorpresas con premios.**
>
> Armá tu 11 en **los11desampa.com** (link en bio).
>
> ¿Con qué 9 arrancás tu equipo? 👇
>
> #Mundial2026 #WorldCup2026 #Los11DeSampa #FantasyFutbol #DT #FutbolArgentina

---

## Pendiente (después de cerrar este doc)
- [x] **Cantidad: 7 slides** (puntaje en una sola placa). — decidido 19/06.
- [x] **Ajustes de contenido** (sin máx-3-por-país; capitán/banco después de puntos; "sumate cuando
  quieras" en 6; teaser de premios desde 16vos en 7). — 19/06.
- [ ] **El dueño revisa/edita este .md** (contenido de cada slide) antes de generar nada.
- [ ] Generar las placas con una plantilla nueva en `assets/social/` (mismo render que scoreboards:
  `lib/stories/render.ts`), reutilizando logo, fuente Archivo Black e íconos de `assets/stories/`.
- [ ] Revisar a 1080×1350 que cada placa respire (la de puntaje es la de mayor riesgo de saturación).
