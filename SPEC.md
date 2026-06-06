# DT Mundial — Especificación de Arquitectura y Producto

> **Doc maestro del proyecto.** Fantasy football del Mundial FIFA 2026, estilo *Gran DT* pero moderno, pensado para Argentina.
> Estado: borrador vivo · Última actualización: 2026-06-06
>
> Este documento es la fuente de verdad para diseño + desarrollo. El compañero lo usa para generar el diseño (Google Stitch, ver §14) y como referencia de implementación.

---

## Índice
1. [Resumen del proyecto](#1-resumen-del-proyecto)
2. [Contexto del Mundial 2026](#2-contexto-del-mundial-2026)
3. [Stack técnico](#3-stack-técnico)
4. [Mecánicas del juego](#4-mecánicas-del-juego)
5. [Fechas (rondas)](#5-fechas-rondas)
6. [Sistema de puntos](#6-sistema-de-puntos)
7. [El técnico](#7-el-técnico)
8. [Fuente de datos (API-Football)](#8-fuente-de-datos-api-football)
9. [Seed de datos](#9-seed-de-datos)
10. [Modelo de datos (schema)](#10-modelo-de-datos-schema)
11. [Backend / API](#11-backend--api)
12. [Pipeline de scoring + panel admin](#12-pipeline-de-scoring--panel-admin)
13. [Frontend (pantallas y componentes)](#13-frontend-pantallas-y-componentes)
14. [Diseño visual + prompt de Google Stitch](#14-diseño-visual--prompt-de-google-stitch)
15. [Modo premium](#15-modo-premium)
16. [Estructura de carpetas](#16-estructura-de-carpetas)
17. [Variables de entorno](#17-variables-de-entorno)
18. [Roadmap / alcance del MVP](#18-roadmap--alcance-del-mvp)
19. [Decisiones abiertas](#19-decisiones-abiertas)

---

## 1. Resumen del proyecto

App web de **fantasy football para el Mundial 2026**. El usuario arma un equipo con jugadores reales del torneo dentro de un presupuesto y una formación táctica, elige un **capitán** y un **técnico**, y suma puntos según el **rendimiento real** de los jugadores en cada fecha. Compite en un **ranking global** y en **ligas privadas con amigos**.

- **Inspiración:** Gran DT (Clarín), adaptado a un torneo corto con eliminación.
- **Público:** Argentina (UI en español).
- **Objetivo:** lanzar **lo antes posible** para promocionar antes/durante el Mundial.
- **Nombre de trabajo:** "DT Mundial" (definir nombre final; evitar la marca "Gran DT").

---

## 2. Contexto del Mundial 2026

Primer Mundial con **48 selecciones**. Sedes: USA, Canadá y México. **11 jun – 19 jul 2026.**

| Fase | Fechas | Partidos |
|---|---|---|
| Grupos (12 grupos de 4, juegan 3 c/u) | 11–27 jun | 72 |
| 16avos (2 mejores de cada grupo + 8 mejores terceros) | 28 jun–3 jul | 16 |
| Octavos | 4–7 jul | 8 |
| Cuartos | 9–11 jul | 4 |
| Semis / 3er puesto / **Final (19 jul)** | 14–19 jul | 4 |
| **Total** | | **104** |

Esto define **8 "fechas"** de juego (ver §5). Implicancia clave: las selecciones **se eliminan**, así que los jugadores de equipos eliminados dejan de sumar → el juego **necesita transferencias por fecha** (no un equipo congelado).

---

## 3. Stack técnico

Monolito full-stack en Vercel, elegido por **rendimiento + velocidad de desarrollo**.

| Capa | Tecnología |
|---|---|
| Framework | **Next.js (App Router)** |
| Hosting | **Vercel** (+ Vercel Cron para el scoring) |
| Base de datos | **PostgreSQL (Neon, vía Vercel Marketplace)** |
| ORM | **Drizzle** |
| Auth | **Clerk** (Google + email; sin JWT casero) |
| UI | **Tailwind CSS + shadcn/ui** |
| Datos deportivos | **API-Football (api-sports.io)** |
| Pagos (premium) | **Mercado Pago** (a definir) |

> Nota: descartamos el split Express/React/Prisma/JWT por velocidad. Un solo proyecto Next.js = menos fricción, sin CORS, auth gestionada.

---

## 4. Mecánicas del juego

- **Presupuesto:** fijo (~250 a calibrar post-seed). Precios **comprimidos** (techo ~55-60), no el valor de mercado crudo.
- **Plantel:** **15 jugadores = 11 titulares + 4 suplentes.**
- **Formaciones válidas** (siempre 11 titulares):

```js
const FORMATIONS = {
  "4-4-2":   { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-3-3":   { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "4-2-3-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "3-5-2":   { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "5-3-2":   { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  "4-5-1":   { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "3-4-3":   { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  "5-4-1":   { GK: 1, DEF: 5, MID: 4, FWD: 1 },
  "4-1-4-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
};
```

- **Capitán:** 1 titular. Su **rating base se duplica** (ver §6).
- **Técnico:** 1 por equipo, atado a una selección (ver §7).
- **Tope por selección:** **máx 3 jugadores** de la misma selección (el técnico no cuenta para este tope).
- **Transferencias por fecha:** el usuario rearma su equipo entre fechas (modelo Gran DT clásico). Límite suave en grupos (ej. 4 transferencias/fecha) y **transferencias libres al pasar a cada ronda de eliminación** (por los eliminados forzosos). *(Valor exacto del límite: a calibrar.)*
- **Comodín / auto-sustitución:** si un titular no juega la fecha, lo reemplaza automáticamente su suplente de la misma posición (como el Gran DT). *(v1.1 si no entra en el MVP.)*
- **Eliminación:** cuando una selección queda afuera, sus jugadores suman 0 y se muestran atenuados con aviso "Eliminado".
- **Ligas:** una **global** (todos) + **ligas privadas** con código de 6 caracteres. El creador gestiona (renombrar, expulsar).

---

## 5. Fechas (rondas)

8 fechas. Cada una cierra (deadline = lock del equipo) **antes del primer partido de esa ronda**.

| # | Fecha | Ronda |
|---|---|---|
| F1 | Grupos – Jornada 1 | grupos |
| F2 | Grupos – Jornada 2 | grupos |
| F3 | Grupos – Jornada 3 | grupos |
| F4 | 16avos | eliminación |
| F5 | Octavos | eliminación |
| F6 | Cuartos | eliminación |
| F7 | Semifinales | eliminación |
| F8 | 3er puesto + Final | eliminación |

Estados de una fecha: `abierta` → `cerrada` (pasó el deadline) → `publicada` (el admin subió los puntos).

---

## 6. Sistema de puntos

**Base (todos los puestos):** la **calificación de API-Football (0–10)** del jugador en el partido. Requiere **≥20 min** jugados; si jugó menos o no jugó → **0 de base**.

**Capitán:** **×2 SOLO sobre la calificación base** (los bonos NO se duplican).
> Ej.: defensor capitán con rating 7 que mete un gol → `(7×2) + 9 = 23`.

| Concepto | Arquero | Defensor | Volante | Delantero |
|---|:---:|:---:|:---:|:---:|
| **Gol** | +12 | +9 | +6 | +4 |
| Gol de penal *(reemplaza al de arriba)* | +3 | +3 | +3 | +3 |
| **Asistencia** | +2 | +2 | +2 | +2 |
| Valla invicta *(jugó ≥20', su equipo no recibió goles)* | +3 | +2 | — | — |
| Penal atajado | +4 | — | — | — |
| Gol recibido *(por cada uno)* | **−1** | — | — | — |
| Figura del partido | +4 | +4 | +4 | +4 |
| Tarjeta amarilla | −2 | −2 | −2 | −2 |
| Tarjeta roja *(directa **o** doble amarilla)* | −4 | −4 | −4 | −4 |
| Gol en contra (autogol) | −2 | −2 | −2 | −2 |
| Penal errado | −4 | −4 | −4 | −4 |
| **Técnico** *(ver §7)* | +2 / −2 / 0 | | | |

**Reglas finas:**
- **Valla invicta:** a partir de **≥20 min** (no 60).
- **Gol recibido:** resta **solo al arquero**; el defensor no pierde puntos por goles recibidos.
- **Doble amarilla = −4 fijo** (no se suman las dos amarillas; si hubo roja, vale −4 y nada más).
- **Figura del partido:** el jugador con el **rating más alto del partido** (+4). Si hay **empate** en el rating más alto, lo **define el admin** al confirmar la fecha.
- **No existen** (sacados del Gran DT clásico): bono por gol de visitante, gol de oro, y puntos fijos por "jugar / jugar 90'" (la calificación ya lo refleja).
- **Publicación:** los puntos se calculan y suben **una sola vez desde el panel admin, al terminar toda la fecha** (no por partido).

---

## 7. El técnico

Cada equipo elige **1 técnico** (atado a una selección). En cada fecha:

- Su selección **gana** → **+2**
- **pierde** → **−2**
- **empata** → **0**

**Defaults propuestos (a confirmar, ver §19):**
1. El técnico **cuesta presupuesto** (precio por tramos; favoritos más caros).
2. **No cuenta** para el tope de 3 jugadores por selección.
3. **Se puede cambiar** entre fechas (parte de la alineación por fecha; clave si su selección queda eliminada).

Datos del técnico (nombre, foto) se seedean desde API-Football (`coachs?team={id}`).

---

## 8. Fuente de datos (API-Football)

**API-Football (api-sports.io)** — oficial, legal y estable. Identificadores del torneo: **`league=1`** + **`season=2026`**.

| Necesidad | Endpoint |
|---|---|
| 48 selecciones | `teams?league=1&season=2026` |
| Plantel de cada selección | `players/squads?team={id}` |
| Lista de jugadores (con foto) | `players?league=1&season=2026&page={n}` |
| Técnicos | `coachs?team={id}` |
| Fixture (104 partidos) | `fixtures?league=1&season=2026` |
| Rondas | `fixtures/rounds?league=1&season=2026` |
| Stats + rating por jugador/partido | `fixtures/players?fixture={id}` |
| Cobertura de datos | `leagues?id=1&season=2026` |

**No usamos tiempo real:** se consulta **después de los partidos**, al cerrar la fecha. Con eso, el **free tier (100 req/día)** alcanza; el plan pago ($19–50/mes) es seguro barato.

> ⚠️ **Validar el día 1** con la API key real que el Mundial tenga cobertura de **`statistics_players`** (ahí vive el rating), vía `leagues?id=1&season=2026`. Si faltara, el plan B es cargar la nota a mano desde el panel admin; el resto del juego no se toca.

---

## 9. Seed de datos

Todo desde API-Football (sin scraping de Wikipedia/Transfermarkt).

1. **Países (48):** `teams` → + grupo y confederación (datos fijos en el script).
2. **Jugadores (~1248):** `players/squads` por selección → nombre, posición (GK/DEF/MID/FWD), `api_football_id`, **foto**, club, número.
3. **Técnicos (48):** `coachs` por selección.
4. **Fixture (104):** `fixtures` → fecha, hora UTC, sede, `api_football_fixture_id`. Los partidos de eliminatorias arrancan **sin equipos asignados** (home/away null) y se completan cuando se definen.
5. **Precios:** son **decisión nuestra de producto** (no scraping). Se asignan por **tramos** vía panel admin (cracks ~55-60, titulares ~25-40, resto baseline ~5-10) y se **calibra el presupuesto** después del seed para que un equipo equilibrado use ~85% y se pueda meter 1-2 figuras.
6. **Liga global** por defecto: `{ name: "Mundial 2026 Global", is_public: true }`.

---

## 10. Modelo de datos (schema)

PostgreSQL + Drizzle. Tablas principales (campos clave):

**Datos del torneo (seed):**

```
countries        id · name · code(ISO) · flag_url · group · confederation · eliminated_round(null) · api_football_id
coaches          id · country_id(FK) · name · photo_url · price · api_football_id
players          id · country_id(FK) · name · position(GK/DEF/MID/FWD) · price · photo_url · club ·
                 jersey_number · status · api_football_id
rounds           id · name · type(group/knockout) · order · deadline · status(open/locked/published) · start_date
matches          id · round_id(FK) · home_country_id(FK,null) · away_country_id(FK,null) · kickoff · venue ·
                 home_score · away_score · status · motm_player_id(FK,null) · api_football_fixture_id
player_match_stats  id · player_id(FK) · match_id(FK) · minutes · goals · penalty_goals · assists · yellow ·
                 red · own_goals · penalties_saved · penalties_missed · goals_conceded · clean_sheet(bool) ·
                 rating(decimal) · fantasy_points(calc) · is_motm(bool)
player_round_points id · player_id(FK) · round_id(FK) · points   // agregado por fecha (desnormalizado)
```

**Datos del juego (usuarios):**

```
users            id · clerk_id(unique) · username · is_admin(bool) · is_premium(bool) · created_at
entries          id · user_id(FK) · name · total_points · created_at        // equipo del usuario (1 por usuario)
entry_rounds     id · entry_id(FK) · round_id(FK) · formation · captain_player_id(FK) · coach_id(FK) ·
                 budget_used · points                                       // la alineación de esa fecha
entry_round_players id · entry_round_id(FK) · player_id(FK) · is_starter(bool) · slot(ej "DEF_1")
point_transactions  id · entry_id(FK) · round_id(FK) · player_id(FK) · points · breakdown(JSONB)
leagues          id · name · code(6 chars, unique) · owner_id(FK) · is_public(bool) · created_at
league_members   id · league_id(FK) · user_id(FK) · joined_at · current_rank
```

> El **modelo de transferencias** vive en `entry_rounds` + `entry_round_players`: cada fecha tiene su propia alineación, capitán y técnico → habilita cambios entre fechas, eliminados y puntos por jornada.

---

## 11. Backend / API

Route handlers / server actions de Next.js. **Auth gestionada por Clerk** (sin endpoints de register/login propios).

**Jugadores** `/api/players`
- `GET /` — listado paginado + filtros: selección, posición, rango de precio, orden (precio / puntos / rating).
- `GET /:id` — detalle con stats acumuladas del torneo.

**Equipo (entries)** `/api/teams`
- `GET /my` — equipo del usuario + alineación de la fecha vigente.
- `POST /` — crear equipo.
- `PUT /round/:roundId` — guardar/editar la alineación de una fecha (valida presupuesto, formación, máx 3 por selección, capitán, técnico, deadline).
- `GET /my/points` — breakdown de puntos por fecha.

**Ligas** `/api/leagues`
- `POST /` — crear liga privada (genera code de 6 chars).
- `POST /join` — unirse con código.
- `GET /:code` — ranking de la liga.
- `GET /global` — ranking global paginado.

**Admin** `/api/admin` *(solo `is_admin`)*
- `POST /rounds/:id/sync` — trae stats de API-Football para todos los partidos de la fecha.
- `POST /rounds/:id/motm` — setear figura cuando hay empate de rating.
- `POST /rounds/:id/publish` — calcula y aplica los puntos a todos los equipos (una sola vez).

**Cron (Vercel Cron):** dispara el `sync` unas horas después de los partidos; el admin revisa y publica.

---

## 12. Pipeline de scoring + panel admin

1. Terminan los partidos de la fecha → **Cron** (o el admin) ejecuta `sync` → se llenan `player_match_stats` desde API-Football.
2. Se calcula `fantasy_points` por jugador con `calcularPuntos(stats)` (§6).
3. Se determina la **figura** de cada partido (mayor rating). Empates → el admin elige.
4. El admin **revisa y corrige** cualquier dato en el panel (data-dense, editable).
5. El admin toca **"Publicar fecha"** → se agregan los puntos a `player_round_points`, se suman a cada `entry_round` (titulares + capitán ×2 sobre rating + técnico + auto-subs), se actualizan `entries.total_points`, rankings y `league_members.current_rank`.
6. La fecha pasa a `published`. Se hace **una sola vez por fecha**.

---

## 13. Frontend (pantallas y componentes)

**Navegación:** bottom-nav en mobile (Inicio · Jugadores · Mi equipo · Ligas · Ranking); en desktop pasa a nav lateral/superior. **100% responsive** (320px → 1920px+, sin scroll horizontal).

**Rutas:**

| Ruta | Pantalla |
|---|---|
| `/` | Landing con cuenta regresiva al torneo |
| `/jugadores` | Explorador de jugadores (filtros, orden, precio) |
| `/equipo` | **Armar equipo** (cancha interactiva) — la más importante |
| `/mi-equipo` | Mi equipo + puntos por fecha |
| `/ligas` | Mis ligas + crear/unirse |
| `/ligas/:code` | Ranking de una liga |
| `/ranking` | Ranking global |
| `/admin` | Panel de carga/validación/publicación de fechas |

**Componentes clave:**
- **`FieldBuilder`** — la cancha SVG interactiva: elegir formación, slots auto-posicionados, modal de selección por posición, presupuesto en vivo, capitán, banca de suplentes, slot de técnico, validaciones en tiempo real.
- **`PlayerCard`** — foto, bandera, nombre, club, chip de posición, precio, puntos.
- **`LeagueRanking`** — leaderboard con puesto, avatar, usuario, equipo, puntos.
- **`PointsBreakdown`** — acordeón de puntos por fecha, expandible al detalle por jugador.

---

## 14. Diseño visual + prompt de Google Stitch

**Sistema de estilo:**
- Tema oscuro **"estadio de noche"**: fondo verde muy oscuro casi negro (`#0A1410`), destellos de luz.
- Acentos en **verde césped** (`#13A34A`), texto **blanco**, **dorado** (`#F5C518`) para CTAs / capitán / resaltados.
- Tipografía **bold y deportiva** (Archivo / Inter bold), números grandes tipo camiseta.
- Tarjetas redondeadas con glow verde tenue. Banderas + fotos circulares. Chips de posición con color (GK amarillo, DEF azul, MID verde, FWD rojo).
- Mobile-first, microinteracciones, animaciones de entrada. Español (Argentina).

**Prompt completo para [Google Stitch](https://stitch.withgoogle.com):**

```
Diseñá una app web 100% RESPONSIVE de fantasy football para el Mundial 2026, llamada "DT Mundial", inspirada en el Gran DT argentino pero moderna. El usuario arma un equipo con jugadores reales del Mundial dentro de un presupuesto, suma puntos según el rendimiento real de los jugadores y compite en ligas con amigos.

RESPONSIVE (OBLIGATORIO — 100%):
- Todas las pantallas deben adaptarse perfectamente a celular, tablet y desktop (de 320px a 1920px+), SIN scroll horizontal nunca.
- Layouts fluidos: grids que reacomodan columnas según el ancho (ej. 1 columna en mobile, 2-3 en tablet, 4+ en desktop).
- Navegación: bottom navigation bar en mobile; en desktop se transforma en navegación lateral o superior.
- La cancha de "Armar equipo" escala y se reacomoda en cualquier tamaño (en desktop: cancha a la izquierda y panel de jugadores/banca a la derecha; en mobile: todo apilado en vertical).
- Tipografía y espaciados fluidos; áreas táctiles cómodas (mínimo 44px) en mobile.

ESTILO VISUAL (aplicar a TODAS las pantallas):
- Tema oscuro "estadio de noche": fondo verde muy oscuro casi negro (#0A1410), con destellos de luz de estadio.
- Acentos en verde césped (#13A34A), texto principal blanco, y dorado (#F5C518) para CTAs, el capitán y los resaltados.
- Tipografía bold y deportiva (estilo Archivo / Inter bold), con números grandes tipo camiseta.
- Tarjetas con esquinas redondeadas, bordes sutiles y glow verde tenue.
- Banderas de selecciones, fotos circulares de jugadores, chips de posición con color (GK amarillo, DEF azul, MID verde, FWD rojo).
- Microinteracciones y animaciones de entrada. Idioma: español (Argentina).

PANTALLAS:

1) LANDING / INICIO: Hero con el logo "DT Mundial", subtítulo "Armá tu equipo. Ganale a tus amigos.", una cuenta regresiva grande al inicio del torneo (11/06/2026) y un botón dorado "Crear mi equipo". Debajo, 3 features con íconos: "Armá tu plantel", "Sumá puntos por fecha", "Competí en ligas con amigos". Fondo de cancha de noche con luces. Header con logo y botones "Ingresar" y "Registrarse".

2) EXPLORADOR DE JUGADORES: Grid de tarjetas de jugador. Cada tarjeta: foto del jugador, bandera de su selección, nombre, club, chip de posición, precio en millones (ej. "45 M") y puntos fantasy acumulados. Arriba: buscador por nombre y barra de filtros (selección con banderas, posición en chips, rango de precio con slider, orden por precio/puntos/rating). Botón "+" en cada tarjeta para agregar al equipo.

3) ARMAR EQUIPO (la pantalla MÁS IMPORTANTE): Una cancha de fútbol vertical vista de arriba (estadio de noche) con los 11 titulares ubicados en slots según la formación elegida. Arriba: selector de formación (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, etc.) y un marcador de presupuesto restante ("152 / 250 M") que se pone rojo al pasarse. Cada slot vacío muestra su posición; al tocarlo se abre un modal con buscador de jugadores de esa posición (foto, club, bandera, precio, puntos) para elegir. Un titular se puede marcar como CAPITÁN con un brazalete dorado. Debajo de la cancha: una banca de 4 suplentes y un slot especial de TÉCNICO (foto del DT + bandera de su selección). Mensajes de validación visibles: "máx 3 jugadores por selección", presupuesto y posiciones completas. Botón dorado "Guardar equipo" con el deadline de la fecha.

4) MI EQUIPO: Arriba, el nombre del equipo, los puntos totales y el puesto en el ranking global. La cancha con los 11 titulares (capitán con brazalete dorado) y el técnico. Debajo, un acordeón "Puntos por fecha" (Fecha 1, Fecha 2…); cada fila muestra los puntos de esa fecha y se expande para ver el detalle por jugador (rating base + bonos: gol, asistencia, valla invicta, tarjetas, figura) más el aporte del técnico. Los jugadores de selecciones eliminadas se ven atenuados con una etiqueta "Eliminado".

5) LIGAS: Tarjetas de mis ligas (privadas y la global) con nombre, cantidad de miembros y mi posición. Botones "Crear liga" y "Unirse con código".

6) RANKING DE LIGA: Tabla de posiciones tipo leaderboard con puesto, avatar, nombre de usuario, nombre del equipo y puntos totales. Mi fila resaltada en dorado. El creador de la liga ve un botón para gestionarla.

7) PANEL DE ADMINISTRADOR (sobrio, data-dense, modo oscuro): Pantalla "Cargar fecha" con la lista de partidos de la fecha y sus estadísticas (goles, asistencias, tarjetas, rating por jugador) en tablas editables; opción de corregir valores a mano; un selector de "Figura del partido" para cuando hay empate de rating; y un botón grande "Publicar fecha".
```

> Tip: si Stitch genera de a una pantalla por vez, pegar primero los bloques RESPONSIVE + ESTILO VISUAL y luego cada PANTALLA por separado. La #3 (Armar equipo) es la clave.

---

## 15. Modo premium

Tier de pago (cobro vía **Mercado Pago**). Beneficio a definir (§19). Opciones:
- **Transferencias ilimitadas / extra** por fecha (el clásico del Gran DT).
- **Comodines/chips:** Triple Capitán, Bench Boost (puntúan los suplentes una fecha), Comodín (rearmado total gratis).
- **Múltiples equipos** (no es pay-to-win).
- **Liga premium + sin publicidad + stats avanzadas** (ranking premium separado).

> ⚠️ Atención legal: si hay **premios en plata**, en Argentina puede rozar lo regulado (azar/apuestas) — asesorarse.

---

## 16. Estructura de carpetas (Next.js monolito)

```
/
├── app/                      # rutas (App Router)
│   ├── (marketing)/page.tsx  # landing
│   ├── jugadores/
│   ├── equipo/               # armar equipo (FieldBuilder)
│   ├── mi-equipo/
│   ├── ligas/[code]/
│   ├── ranking/
│   ├── admin/
│   └── api/                  # route handlers (players, teams, leagues, admin)
├── components/               # FieldBuilder, PlayerCard, LeagueRanking, PointsBreakdown, ui/ (shadcn)
├── lib/
│   ├── db/                   # Drizzle: schema.ts, client, migraciones
│   ├── scoring/              # calcularPuntos() + reglas (§6)
│   ├── api-football/         # cliente + tipos
│   └── auth/                 # helpers Clerk
├── scripts/
│   └── seed.ts               # seed desde API-Football (§9)
├── public/
└── drizzle.config.ts
```

---

## 17. Variables de entorno

```
# Base de datos (Neon)
DATABASE_URL=postgresql://...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Datos deportivos
API_FOOTBALL_KEY=...                       # api-football.com (free tier)
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026

# Torneo
TOURNAMENT_START=2026-06-11T19:00:00Z      # primer partido (UTC)

# Pagos (premium, a futuro)
MERCADOPAGO_ACCESS_TOKEN=...
```

---

## 18. Roadmap / alcance del MVP

**MVP (para salir rápido):**
1. Scaffolding: Next.js + Drizzle + Neon + Clerk + Tailwind/shadcn.
2. Schema + migración.
3. Seed desde API-Football.
4. Armado de equipo (FieldBuilder) + presupuesto + formaciones + capitán + técnico.
5. Fechas + transferencias + cierre por deadline.
6. Panel admin: sync + validación + publicar fecha.
7. Scoring + puntos por fecha.
8. Ranking global + ligas privadas.

**Después (v1.1+):** comodín/auto-sub, chips premium, precios dinámicos, estadísticas avanzadas, app móvil.

---

## 19. Decisiones abiertas

- [ ] **Nombre final** de la app (evitar marca "Gran DT").
- [ ] **Técnico:** ¿cuesta presupuesto? ¿precio? (defaults propuestos en §7).
- [ ] **Presupuesto exacto** + escala de precios (calibrar post-seed).
- [ ] **Límite de transferencias** por fecha en grupos.
- [ ] **Beneficio premium** de v1 (§15) + integración Mercado Pago.
- [ ] **Cobertura de rating** de API-Football para el Mundial (validar día 1).
- [ ] **Auto-sustitución (comodín):** ¿entra en MVP o v1.1?
- [ ] Aspectos **legales** (premios/azar, naming).
```
