# DT Mundial — Dirección de UI (v3)

> **Estado:** borrador · Última actualización: 2026-06-06  
> **Relación con SPEC:** complementa y **reemplaza** el §14 (tema oscuro).

---

## Índice
1. [Visión, tono y diferenciación](#1-visión-tono-y-diferenciación)
2. [Anti-AI-slop — principios aplicados](#2-anti-ai-slop--principios-aplicados)
3. [Sistema de color y atmósfera](#3-sistema-de-color-y-atmósfera)
4. [Tipografía a escala de estadio](#4-tipografía-a-escala-de-estadio)
5. [Primitivas de UI](#5-primitivas-de-ui)
6. [Componentes de dominio](#6-componentes-de-dominio)
7. [Pantalla por pantalla — composición espacial](#7-pantalla-por-pantalla--composición-espacial)
8. [Movimiento, a11y e iconos](#8-movimiento-a11y-e-iconos)
9. [Stack + reconciliación con SPEC](#9-stack--reconciliación-con-spec)

---

## 1. Visión, tono y diferenciación

**"Gran DT pero hecho con intención de diseño."**

El Gran DT real usa Bebas Neue y Manrope — lo que confirma que el camino correcto es ese sistema, no el crema editorial. Lo que separa este app del original es que cada decisión visual se toma con propósito: la tipografía va a la escala que merece, la cancha tiene atmósfera real, los datos tienen jerarquía clara.

### Propósito e identidad

- **Para qué sirve:** armar un equipo de fútbol del Mundial, competir con amigos, ganar puntos durante 8 semanas de torneo.
- **Quién lo usa:** argentinos que conocen Gran DT. Reconocimiento muscular del sistema, pero merecen algo mejor ejecutado.
- **Tono:** deportivo y contemporáneo. No una revista, no un videojuego, no una app genérica — algo que se siente hecho a medida para este torneo.

### Lo que debe ser INOLVIDABLE por pantalla

Cada pantalla necesita un momento que el usuario recuerde. Antes de implementar cualquier componente, identificar dónde está ese momento:

| Pantalla | Momento inolvidable |
|---|---|
| **Landing** | Numerales Archivo en escala de marcador de estadio. El contador no es un widget — es una valla publicitaria. |
| **Jugadores** | Las PlayerCards se comportan como figuritas que uno levanta del álbum (hover con tilt + elevación). |
| **Armar equipo** | La cancha SVG tiene atmósfera real: luces de estadio radiales, no un rectángulo verde. |
| **Mi equipo** | El número de ranking del usuario aparece como marca de agua gigante detrás de sus puntos. |
| **Ranking** | El podio top-3 se siente como un momento de ceremonia, no tres filas destacadas. |

---

## 2. Anti-AI-slop — principios aplicados

> Estas reglas son la diferencia entre "se ve bien" y "es memorable".

### Tipografía — no achicar lo que debería ser grande

El AI-slop usa `text-4xl` donde la intención pide `text-8xl`. Bebas Neue existe para ocupar espacio. Puntos totales en `/mi-equipo`, el countdown en la landing, el número de camiseta en el modal de jugador — todo eso va al tamaño que correspondería en un marcador físico, no al que "parece razonable" en una interfaz web.

Regla: si hay un número que importa, hacerlo 2× más grande de lo que se siente cómodo. Luego evaluar si funciona. Casi siempre funciona.

### Tarjetas — no flat grid uniforme

El patrón AI-slop por defecto: `grid grid-cols-3 gap-4`. Todas las tarjetas iguales. DT Mundial no es una lista de productos de e-commerce.

- En `/jugadores`, el jugador más caro o con más puntos de la fecha puede tener una tarjeta "featured" que rompe el grid (full-width o 2-col).
- En el ranking, las filas 1-3 tienen tratamiento diferente al resto — no solo color de fondo.
- En el FieldBuilder, los suplentes son más pequeños visualmente que los titulares. La jerarquía debe leerse sin leer texto.

### Hover — sorprender, no confirmar

El hover que solo cambia `background-color` no hace nada por la experiencia. Para DT Mundial:

- **PlayerCard:** `hover:rotate-[1deg] hover:-translate-y-2 hover:card-shadow-lg` — como levantar una figurita del álbum.
- **Slot vacío del FieldBuilder:** el slot pulsa suavemente invitando al clic, no queda inerte.
- **Botón CTA:** la sombra dura ya es sorpresiva al press; en hover el botón sube un pixel.
- **Fila de ranking:** hover revela un sutil chevron derecho (→) indicando que es expandible/clickeable.

### Fondo — textura, no color sólido

`background-color: #F0F2F0` flat es AI-slop. La misma paleta con micro-textura es diseño intencional.

```css
/* Noise texture CSS — pegar en globals.css */
body {
  background-color: var(--color-canvas);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}
```

Opacity 0.03 = indetectable conscientemente, pero el fondo siente "papel" en vez de "pantalla".

### Composición espacial — asimetría e intención

No todo centrado. No todo en columnas iguales. El ojo necesita tensión y resolución.

- **Landing:** H1 alineado a la izquierda empujando visualmente hacia el CTA. El countdown en el lado derecho crea diagonal de lectura izquierda-abajo → derecha-arriba.
- **FieldBuilder desktop:** la cancha a la izquierda no es 50/50 — es 55/45 intencionalmente (la cancha domina).
- **Mi equipo:** el número de ranking como watermark (`text-[20vw] opacity-[0.04] font-display absolute`) crea profundidad sin competir con el contenido.
- **Ranking top-3:** el primero es más grande. No enormemente, pero percibiblemente.

### Detalles decorativos — contextuales, no ornamentales

Agregar detalle visual solo cuando habla del dominio:

- **Franja de posición:** el borde izquierdo de la PlayerCard es 4px del color de la posición — es el borde de color del álbum Panini, directo.
- **Línea del campo:** las divisiones de la cancha SVG con opacidad 25% blanca sobre verde.
- **Eyebrow con punto medio:** `MUNDIAL 2026 · GRUPOS F1` — el `·` es un separador editorial, no un dash genérico.
- **Numerales con padding cero:** los numerales Archivo van `leading-none tracking-tighter` — apretados como en los marcadores.

### Lo que nunca va en este proyecto

- `font-family: Inter` o cualquier system font para texto de interfaz
- Cards con `border-radius: 16px+` (demasiado suave para un contexto deportivo)
- Gradientes decorativos purple/violet sobre fondo claro
- Sombras difusas en tarjetas de jugadores (la franja de posición + card-shadow suave es suficiente)
- Animaciones que no tienen relación con el dominio — si no puedo justificar "esto se siente como el fútbol", no va
- Íconos emoji como UI chrome (bandera de selección es la única excepción)
- Componentes shadcn sin re-skinear — usar los tokens, no los defaults

---

## 3. Sistema de color y atmósfera

### Paleta (tokens completos en `tokens.css`)

**Base neutra — estadio apagado**
| Token | Hex | Uso |
|---|---|---|
| `canvas` | `#F0F2F0` | Fondo de página + micro-textura noise |
| `surface` | `#FFFFFF` | Tarjetas, modales |
| `surface-2` | `#E8EBE8` | Inputs, fondos alternativos |
| `border` | `#D4D9D4` | Bordes normales |
| `border-strong` | `#B8C0B8` | Bordes activos |
| `ink` | `#111827` | Texto principal |
| `ink-2` | `#4B5563` | Texto secundario |
| `ink-3` | `#6B7280` | Eyebrows, labels |
| `ink-faint` | `#9CA3AF` | Placeholders |

**Azul deportivo — acento primario**
| Token | Hex |
|---|---|
| `blue` | `#1B4FD8` |
| `blue-hover` | `#1640B8` |
| `blue-press` | `#1235A0` |
| `blue-light` | `#EFF4FF` |
| `blue-border` | `#BFCFFF` |

**Dorado — capitán, top-3, premium**
| Token | Hex |
|---|---|
| `gold` | `#C8A24B` |
| `gold-ink` | `#7A5C10` |
| `gold-bg` | `#FBF5E6` |
| `gold-border` | `#E8D4A0` |

**Verde cancha — territorio exclusivo del pitch**
| Token | Hex |
|---|---|
| `pitch` | `#16713F` |
| `pitch-dark` | `#0F5A30` |
| `pitch-line` | `rgba(255,255,255,0.25)` |

El verde **solo vive en el FieldBuilder** y en el indicador de "ganó". No como acento general — preserva su impacto. Cuando aparece la cancha, debe sorprender dentro de la paleta neutra.

**Chips de posición (Panini)**
| Pos | Texto | Bg |
|---|---|---|
| GK | `#D97706` | `#FEF3C7` |
| DEF | `#1E40AF` | `#DBEAFE` |
| MID | `#059669` | `#D1FAE5` |
| FWD | `#DC2626` | `#FEE2E2` |

Regla: siempre color de fondo + texto en color + label. Nunca solo color.

### Atmósfera del pitch

La cancha SVG no es un rectángulo verde plano. Tiene:
1. **Franjas de pasto** — alternancia `pitch` / `pitch-dark` en franjas horizontales de ~10% altura cada una.
2. **Gradiente radial de luces de estadio** — overlay sutil: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.06) 0%, transparent 70%)`. Simula los focos del estadio desde arriba.
3. **Líneas del campo** — stroke `pitch-line` en SVG para medio campo, área grande, arco central.
4. **Marco exterior** — el pitch SVG vive dentro de un contenedor blanco con `card-shadow-lg`, creando el contraste entre el territorio verde y el app claro.

---

## 4. Tipografía a escala de estadio

### Fuentes (`layout.tsx`)

```tsx
import { Bebas_Neue, Manrope, Archivo } from 'next/font/google'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
})
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['900'],
  variable: '--font-archivo',
})
```

Bebas Neue = Gran DT real. Manrope = Gran DT real. Archivo 900 = el toque que los diferencia — los numerales editoriales que hacen que los precios y puntos se sientan como números de camiseta.

### Escala

| Rol | Clase | Notas |
|---|---|---|
| **Hero / contador** | `font-display text-[clamp(3.5rem,8vw,7rem)] leading-none tracking-tight` | Bebas Neue al tamaño de una valla |
| **H1 de pantalla** | `font-display text-[clamp(2rem,5vw,3.5rem)] leading-none` | No reducir a `text-3xl` fijo |
| H2 de sección | `font-display text-2xl` | |
| H3 / subsección | `font-semibold text-lg` | Manrope 600 |
| Body | `text-sm leading-[1.55]` | Manrope 400 |
| **Eyebrow** | `eyebrow` utility | 11px · bold · uppercase · tracking-[0.08em] · ink-3 |
| CTA button | `font-display text-base` | Bebas Neue — más pequeño que el hero, mismo espíritu |
| **Numeral de dato** | `jersey-numeral text-[clamp(2rem,4vw,4rem)] leading-none` | Archivo 900 — precios, puntos, ranking |
| **Numeral hero** | `jersey-numeral text-[clamp(3rem,7vw,6rem)] leading-none` | Countdown, puntos totales en mi equipo |
| Watermark | `font-display text-[20vw] leading-none opacity-[0.04]` | Solo para el rank watermark en mi equipo |

### Reglas de peso y contraste

Mínimo 3 pesos visibles en cualquier pantalla: 400 (body), 600-700 (semi), 900 (numerales) + display (Bebas Neue).

`line-height: 1` o `leading-none` para numerales y display — el interlineado generoso es para el body, no para los títulos que deben apilarse.

`letter-spacing: -0.02em` (`tracking-tight`) en Archivo numerales grandes — los números apretados son más scoreboard, menos tipografía web.

---

## 5. Primitivas de UI

### Button

**Primary** — el único componente con sombra dura:
```
bg-blue text-white font-display text-base px-6 py-3
rounded-[6px] btn-shadow                               ← 3px 3px 0 blue-ink
hover:bg-blue-hover hover:-translate-y-[1px]
active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
transition-all duration-100
```
La sombra colapsa al press — única instancia de sombra hard en el app. Su rareza la hace impactante.

**Secondary:**
```
bg-surface text-ink font-semibold text-sm px-5 py-3
rounded-[6px] border border-border card-shadow
hover:border-border-strong hover:card-shadow-md hover:-translate-y-[1px]
transition-all duration-150
```

**Ghost:** `text-blue font-semibold text-sm hover:bg-blue-light px-3 py-2 rounded-[6px] transition-colors`

### Card

```
bg-surface rounded-[8px] border border-border card-shadow
```
Hover para tarjetas clickeables: `hover:card-shadow-md hover:-translate-y-[2px] transition-all duration-150`

**No usar** `rounded-2xl` ni `rounded-3xl`. El radio 8px es deliberado — deportivo, no suave.

### Eyebrow / Label
```tsx
<span className="eyebrow">{text}</span>
// Separador: · (punto medio U+00B7), no guion
// Ej: "MUNDIAL 2026 · GRUPOS F1"
```

### PositionChip
```tsx
<span className={cn(
  "inline-flex items-center px-2 py-0.5 rounded-[4px]",
  "text-[10px] font-bold tracking-wide uppercase",
  variants[pos]
)}>
  {pos}
</span>
// variants: { GK: "bg-pos-gk-bg text-pos-gk", DEF: "bg-pos-def-bg text-pos-def", ... }
```

### SectionHeader
```tsx
<header className="flex items-center justify-between pb-3 mb-4 border-b-2 border-border">
  <div className="flex items-baseline gap-2">
    <span className="eyebrow">{title}</span>
    {count && <span className="text-[11px] text-ink-faint">({count})</span>}
  </div>
  {action}
</header>
```
`border-b-2` no `border-b-1` — la regla de sección debe leerse.

### StatNumeral
```tsx
<div className="flex flex-col gap-0.5">
  <span className="jersey-numeral text-[clamp(2rem,4vw,4rem)] leading-none tracking-tight text-ink">
    {value}
  </span>
  <span className="eyebrow">{label}</span>
</div>
```

### EmptyState
```tsx
<div className="flex flex-col items-center gap-3 py-20 text-center">
  <Icon icon={...} className="w-10 h-10 text-ink-faint" strokeWidth={1} aria-hidden />
  <p className="font-semibold text-ink-3 text-sm">{title}</p>
  <p className="text-xs text-ink-faint max-w-[280px]">{description}</p>
</div>
```
strokeWidth 1 en el ícono del EmptyState — más liviano porque es decorativo.

### Skeleton
```
bg-surface-2 rounded-[8px] animate-pulse-skeleton
```

---

## 6. Componentes de dominio

### PlayerCard — la figurita

El borde izquierdo de 4px es la columna de color del álbum Panini. No un detalle decorativo — es la identidad del componente.

```
┌────────────────────────────────────┐
║ [borde izq 4px color posición]     ║
│ [foto circular 52px]  🏴  [DEF]    │
│ NOMBRE JUGADOR                     │  Manrope 700
│ Club · Selección                   │  ink-3 text-xs
│                                    │
│  45 M            124 pts           │  jersey-numeral
│                             [+]    │  botón azul
└────────────────────────────────────┘
bg-surface / border / card-shadow / rounded-[8px]
border-l-4 border-l-pos-{pos}
```

**Hover:** `hover:rotate-[1deg] hover:-translate-y-2 hover:card-shadow-lg transition-all duration-150`  
La rotación leve imita levantar una figurita del álbum. Es el momento más memorable del explorador.

**"ELIMINADO":**
- Tarjeta: `opacity-50 grayscale pointer-events-none`
- Sello: `bg-danger text-white font-display text-[10px] px-2 py-0.5 rotate-[-6deg] shadow-[2px_2px_0_#991B1B]` — posición absoluta sobre la foto

**"Capitán":**
- `border-2 border-gold`
- Badge "C": `bg-gold text-gold-ink font-display text-[11px] rounded-full w-5 h-5 flex items-center justify-center`

**Animación al agregar al equipo:** `animate-sticker-slap` en el slot del FieldBuilder, no en la card. La figurita "aterriza" en el slot.

---

### FieldBuilder

**Cancha SVG — atmósfera real:**

```svg
<!-- Estructura del SVG del pitch -->
<svg viewBox="0 0 300 430" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo base -->
  <rect width="300" height="430" fill="#16713F"/>
  <!-- Franjas de pasto (alternadas) -->
  <rect y="0"   width="300" height="43" fill="#0F5A30" opacity="0.5"/>
  <rect y="86"  width="300" height="43" fill="#0F5A30" opacity="0.5"/>
  <!-- ... cada 86px -->
  <!-- Gradiente de luces de estadio -->
  <defs>
    <radialGradient id="stadium-lights" cx="50%" cy="40%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.07"/>
      <stop offset="70%"  stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="300" height="430" fill="url(#stadium-lights)"/>
  <!-- Líneas del campo -->
  <!-- Borde, medio campo, área grande, punto penal, arco central -->
  <!-- stroke: rgba(255,255,255,0.25), stroke-width: 1.5 -->
</svg>
```

**Layout desktop (55/45):**
```
┌──────────────────────────┬─────────────────────────┐
│  cancha (55%)             │  panel (45%)            │
│  FormationSelector        │  BudgetMeter            │
│  ─────────────────        │  Buscador + filtros     │
│  [SVG pitch con           │  PlayerCards (scroll)   │
│   slots 11 titulares]     │                         │
│  Banca (4 suplentes)      │  CoachCard              │
└──────────────────────────┴─────────────────────────┘
```

**Layout mobile:** FormationSelector → BudgetMeter → pitch (full width, aspect-ratio 3/4) → banca (row) → CoachCard → botón sticky.

**FormationSelector:**
Segmented pills: `[4-4-2] [4-3-3] [3-5-2] [4-2-3-1] ...`
- Activo: `bg-blue text-white font-display px-3 py-1.5 rounded-[4px]`
- Scroll horizontal en mobile si no entran

**BudgetMeter:**
```
PRESUPUESTO                          ← eyebrow
152 / 250 M                          ← jersey-numeral text-[clamp(1.5rem,3vw,2.5rem)] leading-none
[██████████████████████░░░░]         ← barra h-2 rounded-full bg-success → bg-danger
```

**Slot vacío:** `border-2 border-dashed border-white/30 rounded-full` + label de posición en `font-display text-[10px] text-white/60`

**Slot lleno:** foto circular 44px + nombre `text-[10px] font-semibold text-white drop-shadow` + PositionChip mini

**CoachCard:**
```
TÉCNICO                             ← eyebrow
[foto 44px] Nombre DT · 🏴
             +2 / −2 / 0 pts/fecha  ← text-success / text-danger / text-ink-3
```

**Callout de validación:**
```
bg-warning-bg border-l-4 border-warning rounded-r-[6px] px-4 py-3
font-semibold text-sm text-warning
```
No toasts. Los errores viven en el panel, no flotan.

**Botón "GUARDAR EQUIPO" (sticky mobile):**
Primary azul + deadline como eyebrow debajo: `CIERRA EL 11 JUN 09:00`

---

### PointsBreakdown

```
▼  FECHA 1 · GRUPOS                    84 pts   ← jersey-numeral
   ──────────────────────────────────────────
   [foto] De Paul       MID             12.4
          Rating 8.2 ×2(C) · +4 asist · +4 figura
   [foto] Martínez E.   GK               7.1
          Rating 7.1 · +3 valla invicta
   ──────────────────────────────────────────
   [DT]  Scaloni  🇦🇷   +2 (ganó vs México)
```

Bonos: chips `text-[10px] font-semibold bg-success-bg text-success rounded-[3px] px-1.5 py-0.5`  
Penales/tarjetas: `bg-danger-bg text-danger`  
Eliminado: `opacity-40` + sello mini

---

### LeagueRanking

El podio no son filas — son bloques de tamaño variable:

```
┌──────────────────────────────────────────────────────┐
│  🥇  1  brunotamaro      1,247  ← StatNumeral grande  │  bg-gold-bg · border-y-2 border-gold
│  🥈  2  otro_user        1,203  ← más pequeño que 1ro │  bg-surface
│  🥉  3  fulano           1,188  ← más pequeño que 2do │  bg-surface
├──────────────────────────────────────────────────────┤
│  …                                                    │
│  42  mi_equipo             820  ← fila resaltada azul │  bg-blue-light · border-y border-blue-border
└──────────────────────────────────────────────────────┘
```

Puesto del top-3: `jersey-numeral text-2xl text-gold-ink`  
Puntos del top-3: `jersey-numeral text-2xl`  
Hover en cualquier fila: `hover:bg-surface-2` + aparece `→` al final

---

### Countdown

```
MUNDIAL 2026 · EMPIEZA EN          ← eyebrow
──────────────────────────────────────────────
  05       :     14    :    08    :    32
  DÍAS           HS       MINUTOS      SEG
```

Numerales: `jersey-numeral text-[clamp(3rem,7vw,6rem)] leading-none tracking-tight`  
Labels: `eyebrow mt-2`  
Separadores `:` en `text-ink-3 jersey-numeral text-2xl self-start mt-2`  
Tick: `animate-countdown-tick` en el dígito que cambia

---

## 7. Pantalla por pantalla — composición espacial

### `/` — Landing

**El momento:** el contador se siente como un marcador de estadio, no un widget web.

**Composición (no centrado):**
```
[header: logo izq ─────────────────── Ingresar | Crear cuenta]

col-left (55%)                    col-right (45%)
EYEBROW: MUNDIAL 2026 · ...       [Countdown 4 bloques]
H1 hero Bebas Neue gigante
[CTA "CREAR MI EQUIPO →"]
```

El H1 y el CTA empujan visualmente a la izquierda. El countdown en la derecha crea diagonal de lectura. En mobile se apila: eyebrow → H1 → countdown → CTA.

Decoración de fondo: silueta de cancha SVG muy tenue (`opacity-[0.06]`) en verde, posicionada a la derecha ligeramente recortada — no centrada, no perfecta. Tensión visual.

---

### `/jugadores` — Explorador

**El momento:** levantar la figurita (hover tilt).

Filtros sticky con `bg-canvas/80 backdrop-blur-sm border-b border-border` — no una barra blanca sólida genérica.

Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`  
Las cards llevan `animate-fade-in stagger-{i%6}` al cargar.

**Featured card** (primer resultado o el de mayor puntuación de la fecha): `col-span-2` con foto más grande (72px) y numeral de puntos más prominente. Rompe el grid sin desestabilizarlo.

---

### `/equipo` — Armar equipo

**El momento:** la cancha SVG con atmósfera real es el centro visual de toda la app. Todo lo demás es secundario a ese rectángulo verde.

Banner eyebrow sticky: `bg-blue-light border-b border-blue-border text-blue-ink px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em]`  
Texto: `CERRÁ TU EQUIPO · 3d 14h 08m`

La cancha domina el viewport — en desktop ocupa 55% de ancho y ~85% del alto de la pantalla. No es un recuadro pequeño dentro de una página.

---

### `/mi-equipo`

**El momento:** el watermark del ranking.

```tsx
// En el hero section de mi-equipo, position: relative
<section className="relative overflow-hidden px-6 py-12">
  {/* Watermark — número de puesto como texto enorme, invisible al primer vistazo */}
  <span className="absolute right-4 top-0 font-display text-[20vw] leading-none text-ink opacity-[0.04] select-none pointer-events-none" aria-hidden>
    {ranking}
  </span>
  {/* Contenido real */}
  <StatNumeral value={totalPts} label="PUNTOS TOTALES" />
  <span className="eyebrow mt-2">#{ranking} EN EL RANKING GLOBAL</span>
</section>
```

La cancha debajo es read-only. `cursor-default` en todos los slots. Botón "EDITAR EQUIPO" (secondary) en el header de la sección, no en el centro.

---

### `/ligas` y `/ligas/[code]`

`/ligas`: La Liga Global siempre primera, con `bg-blue-light` y borde izquierdo `border-l-4 border-l-blue` — diferenciada estructuralmente de las ligas privadas, no solo por color de fondo.

`/ligas/[code]`: El header de la liga muestra el **código** en `font-display text-3xl text-ink-3` — grande y copiable. No escondido en texto pequeño.

---

### `/ranking`

Mismo componente LeagueRanking. El top-3 ocupa más espacio vertical que las filas normales — no enormemente, pero el puesto #1 tiene `py-5` donde el resto tiene `py-3`.

---

### `/admin`

Dentro del sistema claro. Sobrio pero no genérico.

- Tabla: `text-sm font-manrope` — Manrope para tablas es más legible que Bebas Neue
- Celdas editables: focus con `bg-blue-light ring-1 ring-blue` — el mismo azul del sistema, no el input azul por defecto del browser
- "FIGURA DEL PARTIDO": el candidato al +4 se resalta con `bg-gold-bg text-gold-ink font-semibold`
- Botón "PUBLICAR FECHA": primary azul con `py-4 text-lg` — más grande que un botón normal, el peso de la acción debe sentirse

---

## 8. Movimiento, a11y e iconos

### Animaciones

| Utilidad | Dónde | Notas |
|---|---|---|
| `animate-fade-in` + `stagger-{n}` | Listas de cards al cargar | Stagger max 6 items, luego sin delay |
| `animate-slide-up` | Modales, paneles laterales | |
| `animate-sticker-slap` | Slot del FieldBuilder al recibir jugador | Solo este momento en todo el app |
| `animate-countdown-tick` | Dígito del countdown al cambiar | |
| `animate-pulse-skeleton` | Skeletons | |
| `hover:rotate-[1deg] hover:-translate-y-2` | PlayerCard | No usar en otros componentes — pierde impacto |
| `active:translate-x-[3px] active:translate-y-[3px] active:shadow-none` | Botón primary | El "press" del sello |

**Regla de economía de movimiento:** cuantas menos animaciones existan, más impacta cada una. `sticker-slap` y el hover-tilt de la card son especiales porque son únicos. Si se agregan a más componentes, dejan de serlo.

Todos los keyframes tienen `@media (prefers-reduced-motion: reduce)`.

### Iconos — Lucide React

```tsx
// strokeWidth 1.5 en todo el app
// Decorativo: aria-hidden="true"
// Interactivo solo: aria-label="..."
```

Banderas de selecciones: único emoji permitido en la UI. `flag-icons` si se necesita rendering consistente cross-platform.

### Accesibilidad

- `ink #111827` / `canvas #F0F2F0`: **14.5:1** ✓  
- `blue #1B4FD8` / blanco: **6.5:1** ✓  
- `ink-3 #6B7280` / canvas: **4.6:1** ✓ (solo para eyebrows ≥11px bold)  
- PositionChips: color de texto + texto visible, nunca solo fondo  
- Focus ring: `outline: 2px solid var(--color-blue)` — nunca eliminado sin reemplazo  
- Modales: `role="dialog" aria-modal="true" aria-labelledby` + foco atrapado (Radix)  
- Sello ELIMINADO: `<span aria-label="Jugador eliminado del torneo">ELIMINADO</span>`  
- Watermark watermark de ranking: `aria-hidden="true"` — es decorativo  
- hover tilt de PlayerCard: sin `prefers-reduced-motion` guard necesario (transform es sutil, no vestibular)

---

## 9. Stack + reconciliación con SPEC

### shadcn + re-skin

El SPEC §3 pide shadcn/ui. Recomendación: **mantenerlo** (Radix para foco/a11y/animaciones de Dialog, Dropdown) pero **re-skinear sus CSS variables** a la paleta azul deportivo — ya hecho en `tokens.css` (bloque `:root`). El resultado visual es el sistema descrito aquí; la plomería de accesibilidad la pone Radix.

### Primitivas nuevas (crear en `components/editorial/`)

shadcn no trae: `Eyebrow` · `PositionChip` · `StatNumeral` · `SectionHeader` · `BudgetMeter` · `PlayerCard` · `FieldSlot` · `CoachCard` · `CaptainBadge`

### Actualización urgente del SPEC §14

El §14 propone tema oscuro `#0A1410`. Reemplazar con este sistema. Usar `stitch-prompt.md` para regenerar las pantallas en Stitch antes del merge.

### Estructura de carpetas

```
components/
  ui/          ← shadcn re-skineado (Button, Dialog, Input, etc.)
  editorial/   ← Eyebrow, PositionChip, StatNumeral, SectionHeader, BudgetMeter
  domain/      ← PlayerCard, FieldBuilder, FieldSlot, CoachCard, CaptainBadge,
                  PointsBreakdown, LeagueRanking, Countdown, Nav
app/
  globals.css  ← importa tokens.css + noise texture + :root shadcn overrides
```
