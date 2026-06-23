# Contexto del proyecto — Los 11 de Sampa (handoff para agentes)

> Doc de onboarding para que un agente (o persona) nuevo tenga **todo el contexto** sin re-descubrirlo. Si vas a tocar código, **leé primero la sección "Cómo trabajar en este repo"**.
> Otros docs útiles: [`SPEC.md`](../SPEC.md) (diseño original del juego + puntaje), [`docs/PINES-API.md`](./PINES-API.md) (contrato del backend de pines para el front), [`docs/ui/UI-DIRECTION.md`](./ui/UI-DIRECTION.md) (dirección de diseño), [`docs/README.md`](./README.md) (índice de toda la documentación).
>
> 🟢 **La app está EN PRODUCCIÓN, con usuarios reales jugando.** Antes de tocar algo que pueda
> impactar lo live (DB compartida, deploy, scoring, pagos), **leé [`docs/PRODUCCION.md`](./PRODUCCION.md)** —
> ahí está centralizado todo lo que hay que cuidar para no romper nada ni arriesgar los datos
> de la gente ya registrada.

---

## Qué es
**Los 11 de Sampa** — fantasy football del **Mundial FIFA 2026**, para Argentina/LatAm. El usuario arma un equipo (15 jugadores + técnico) dentro de un presupuesto, suma puntos por el rendimiento real de los jugadores en cada fecha del Mundial, y compite en ranking global + ligas privadas. Monetización: **pines** (créditos para cambios extra) y la **Liga Premium** (liga paga con premio en dinero — ver [`docs/MONETIZACION.md`](./MONETIZACION.md)).

**Estado: EN PRODUCCIÓN y funcionando.**
- 🌐 Live: **https://www.los11desampa.com** (apex `los11desampa.com` redirige 308 → www)
- 📦 Repo: **github.com/mateograndtmundial-beep/gran-dt-mundial** (rama `main`, auto-deploy en Vercel)
- 🗄️ Base: Neon Postgres, **seedeada con el Mundial 2026 real** (48 selecciones, 1248 jugadores, 48 técnicos, fixture de grupos).
- El Mundial arranca **11/06/2026** → el scoring (sync/publicar fechas) recién se ejercita cuando se juegan partidos.

Se desarrolla **entre dos**: el dueño (Mateo) + un compañero que trabaja sobre todo la UI. Ambos pushean seguido a `main`.

---

## ⚠️ Cómo trabajar en este repo (LEER PRIMERO)

1. **Es Next.js 16 (App Router, Turbopack), React 19.** Hay breaking changes vs versiones viejas. Para APIs de Next, leé `node_modules/next/dist/docs/` antes de escribir (lo dice `AGENTS.md`). Detalles que ya mordieron: `params`/`searchParams` y `headers()`/`cookies()` son **async** (await).
2. **Repo compartido, el compañero pushea seguido.** SIEMPRE `git pull --rebase origin main` antes de empezar. Si tenés commits locales, rebaseálos. Las carreras de push son normales → fetch+rebase+push de nuevo.
3. **Push a `main` = auto-deploy a PRODUCCIÓN (Vercel).** Antes de pushear, **corré `npm run build` localmente** para no romper el sitio live. (Excepción: cambios solo de markdown/docs.) Checklist completo de pre-push y qué hacer si algo se rompe → [`docs/PRODUCCION.md`](./PRODUCCION.md).
4. **Commits**: terminá el mensaje con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Commiteá/pusheá solo cuando el usuario lo pida.
5. **Secrets**: `.env` está gitignored y tiene las keys reales (Neon, Clerk, API-Football, Mercado Pago). `.env.example` es el template. **Nunca** commitees `.env`. En Vercel las env de producción se cargan en el dashboard.
6. **Neon es HTTP (sin transacciones clásicas).** Para atomicidad usá **`db.batch([...])`** (corre todo en 1 transacción del server). `saveLineup` ya lo hace.
7. **Validá la plata/puntos siempre server-side**, nunca confíes en el cliente (presupuesto, máx por país, pines, pagos se recalculan en el server / se confirman contra el proveedor).
8. **DB local = la misma Neon de producción** (comparten `DATABASE_URL`). No hay staging — cualquier seed/script/migración pega contra datos reales de usuarios. **Antes de correr `db:push`, seeds o scripts contra la DB, leé [`docs/PRODUCCION.md`](./PRODUCCION.md) §2** (lista de comandos peligrosos y su efecto real).
9. **UI = 100% responsive, SIEMPRE (OBLIGATORIO).** Todo lo que toques de UI tiene que verse bien en **mobile Y desktop** (≈320px → 1920px+), **sin scroll horizontal**. La mayoría de los usuarios juega desde el **celular** → **probá el render en mobile antes de dar por terminado un cambio de UI** (no lo asumas). Patrones: tablas anchas → scroll interno en un contenedor o layout que reacomoda columnas; modales/diálogos → considerá **bottom-sheet / ancho completo** en mobile; áreas táctiles cómodas. Ver `docs/ui/UI-DIRECTION.md`.

### Comandos
```
npm run dev            # dev local (localhost:3000)
npm run build          # build de prod (correr antes de pushear)
npm run db:generate    # generar migración Drizzle desde el schema
npm run db:migrate     # aplicar migraciones a Neon
npm run db:studio      # Drizzle Studio
npm run seed           # seed del torneo desde API-Football (league=1, season=2026)
npm run seed:products  # seed de los packs de pines
npm run seed:golden-ticket  # seed de la Liga Premium (copa activa + reserva) — ver docs/MONETIZACION.md
npm run prices:fetch   # baja market values de Transfermarkt → data/market-values.json
npm run prices:apply   # cruza y escribe precios de jugadores (--dry para simular)
npm run make-admin [username]  # marca usuario(s) como admin
```

---

## Stack
- **Next.js 16** (App Router) + **React 19** en **Vercel** (auto-deploy desde GitHub).
- **Drizzle ORM** + **Neon Postgres** (driver `@neondatabase/serverless`, HTTP).
- **Clerk** (auth) — **en producción** (pk_live/sk_live en Vercel; Google OAuth propio). En local se usan las keys de **dev** (pk_test).
- **Tailwind v4** + **shadcn/ui** + `lucide-react`. Design system editorial propio (ver §Diseño).
- **Mercado Pago** (Checkout Pro) para Argentina — **en producción**. **dLocal Go** para el resto de LatAm — **front + adapter listos y feature-flaggeados** (`isProviderConfigured`); falta crear la cuenta en dLocal desde cero y cargar `DLOCAL_GO_API_KEY/SECRET` (hasta entonces, `/pines` muestra "próximamente" fuera de Argentina).
- **API-Football** (api-sports.io, plan PRO pago) para datos del Mundial.

---

## Rutas (`app/`)
| Ruta | Qué hace |
|---|---|
| `/` | Home: hero, countdown al Mundial, features, CTA. |
| `/equipo` | **Armador** (`FieldBuilder`): formación, 11 titulares + 4 suplentes + técnico + capitán, drag&drop, presupuesto en vivo, validaciones. Guarda con `saveLineup`. |
| `/mi-equipo` | Alineación guardada + puntos por fecha + puesto en ranking. |
| `/jugadores` | Explorador con filtros/búsqueda. |
| `/ranking` | Ranking global. |
| `/ligas` (+ `/ligas/[code]`) | Ligas privadas: crear/unirse + ranking. También muestra la Liga Premium (inscripta o card de promo). |
| `/copa` | Landing de campaña de la **Liga Premium** (inscripción paga). No va en la nav; se llega por redes/banner. |
| `/pines` | Tienda de pines + saldo + retorno de pago (`?status=`). |
| `/como-funciona` | Reglas, puntaje, formaciones. |
| `/bases`, `/privacidad`, `/soporte`, `/arrepentimiento` | Legales: Bases y Condiciones de la Liga Premium, privacidad, soporte, botón de arrepentimiento. |
| `/admin` (+ `/admin/precios`) | Solo `isAdmin`: sincronizar/publicar fechas; editar precios; abrir/cerrar copas y activar su cobro. |
| `/sign-in`, `/sign-up`, `/bienvenida` | Clerk + gate de nickname. |
| `/api/payments/webhook/[provider]` | Webhook MP/dLocal → acredita pines o inscribe en la copa (idempotente). |

> Onboarding: `getCurrentUser()` crea el user con `username = null`; hay un gate (referenciado como `/bienvenida` en `auth.ts`, vía header `x-pathname` que setea el `middleware.ts`) que obliga a elegir un **nickname único**. Verificar en `app/layout.tsx` / `auth.ts` / `middleware.ts`.

---

## Modelo de datos (`lib/db/schema.ts`)
**Torneo (seed):**
- `countries` — selecciones (name, code, flagUrl, groupLetter, confederation, **eliminatedRound**, apiFootballId).
- `players` — (countryId, name, position GK/DEF/MID/FWD, **price** 5–150 con 1 decimal, **priceManual**, photoUrl, club, birthYear, jerseyNumber, status, apiFootballId).
- `coaches` — técnicos (1 por país).
- `rounds` — 8 fechas (type group|knockout, order, deadline, status open|locked|published).
- `matches` — (roundId, home/awayCountryId nullable, kickoff, venue, home/awayScore, status, **motmPlayerId**, apiFootballFixtureId).
- `playerMatchStats` — stats por jugador/partido + `fantasyPoints` (calculado sin capitán).
- `playerRoundPoints` — puntos agregados por jugador/fecha.

**Juego (usuarios):**
- `users` — (clerkId, username [único, puede ser null hasta el onboarding], isAdmin, isPremium).
- `entries` — equipo del user (1:1), name, totalPoints.
- `entryRounds` — alineación por fecha (entryId+roundId únicos): formation, captainPlayerId, coachId, budgetUsed, points, **pinsSpent**, **changesMade**.
- `entryRoundPlayers` — roster (isStarter, slot p.ej. `DEF_2` / `SUB_GK`).
- `leagues` (code 6 chars único, ownerId, isPublic, **scoringStartRoundId**) + `leagueMembers` (joinedAt, **currentRank**). Campos de Liga Premium: **kind** `private|golden_ticket`, **status** `draft|open|full|closed`, **capacity**, **entryFeeArs**, **prizeArs**.
- `pointTransactions` — ledger de puntos (auditoría).

**Monetización (pines + Liga Premium):**
- `products` — packs (sku, pins, priceArs, priceUsd, active, **unlimited**, **entryLeagueId**). `unlimited` = pack de cambios ilimitados (marca `users.isPremium`); `entryLeagueId` ≠ null = es la **entrada a una copa** (no acredita pines: inscribe en la liga).
- `orders` — (userId, productId, pins, amount, currency, provider mercadopago|dlocal, providerRef, status pending|paid|failed|expired|refunded, paidAt).
- `pinTransactions` — **ledger de pines** (delta +/−, reason purchase|transfer|refund|grant). **Saldo = SUM(delta).**

---

## Constantes del juego (`lib/game/config.ts`)
- `BUDGET = 700` · `SQUAD = {STARTERS:11, SUBS:4, TOTAL:15}` · `FREE_CHANGES_PER_ROUND = 1`.
- **Máx por país:** `MAX_PER_COUNTRY = 3` en fase de grupos; desde 16vos sube a `MAX_PER_COUNTRY_KNOCKOUT = 5` (no se libera — con pocas selecciones vivas, 5 alcanza para armar equipos completos). Regla GENERAL (todos los usuarios).
- **Cambios gratis:** 1 por fecha (`FREE_CHANGES_PER_ROUND`). Excepción: en 16vos, los inscriptos en la Liga Premium arrancan con 5 (`FREE_CHANGES_R16`, vía `getFreeChangesForRound(order, inCopa)`).
- `PRICING = { MIN:5, ANCHOR:85, MAX:150, MV_REF_PERCENTILE:98, GAMMA:0.85 }`.
- `FORMATIONS` — 4-4-2, 4-3-3, 4-2-4, 3-4-3, 3-3-4 (siempre 11 titulares; solo formaciones a 3 líneas con máx. 4 jugadores por línea, para que la cancha en mobile no corte figuritas).
- `ROUNDS` — 8 fechas (3 grupos + 16avos + octavos + cuartos + semis + final).
- **`SCORING`** (la tabla de puntaje — DECISIÓN CERRADA):
  - Base = **rating de API-Football** (requiere ≥20' de tiempo reglamentario, sin contar agregado: 90' o 120' con tiempo extra); si jugó menos, **no suma nada en absoluto** (ni base ni bonos) y puntúa el suplente de su posición que sí jugó (auto-sustitución, garantiza nunca > 11 por equipo); el **capitán duplica SOLO el rating base**, no los bonos.
  - Gol por puesto: **GK 12, DEF 9, MID 6, FWD 4** · gol de penal **+3** (reemplaza el de puesto).
  - Asistencia **+2** (todas las posiciones).
  - Valla invicta (jugó ≥20', **su equipo no recibió goles MIENTRAS estuvo en cancha** — se evalúa a nivel jugador, no equipo): **GK +3, DEF +2**.
  - Penal atajado (GK) **+4** · gol recibido **−1 SOLO al GK** (el defensor no pierde).
  - Figura del partido **+4** (mayor rating; empate lo define el admin).
  - Amarilla **−2** · roja (directa o doble amarilla) **−4 fijo** (no se suman las amarillas) · gol en contra **−2** · penal errado **−4**.
  - **Técnico**: su selección gana **+2** / pierde **−2** / empata **0**.

---

## Lógica de negocio clave

### Guardar alineación — `saveLineup` (`lib/actions.ts`)
Recalcula TODO desde la DB (no confía en el cliente): valida presupuesto, máx por país (3 en grupos / 5 desde 16vos), que los jugadores existan. Cuenta los **cambios vs la fecha anterior**: los primeros son gratis (**1 normal, 5 en 16vos para inscriptos en la Liga Premium**), los extra **descuentan pines** (`reason:"transfer"`), reconciliando re-ediciones (`pinsSpent`). Los usuarios `isPremium` (pack ilimitado) no pagan nunca. Si faltan pines devuelve `{ ok:false, error:"pins", needed, balance }`. Escribe todo en **`db.batch()`** (atómico). Otras actions: `createLeague`, `joinLeague`, `renameLeague`, `removeMember`.

### Scoring (`lib/scoring/`)
- `calcularPuntos(stats)` — puntos de un jugador en un partido según `SCORING` (sin capitán).
- `publishRound(roundId)` (`publicar-fecha.ts`, admin) — agrega `playerMatchStats.fantasyPoints` → `playerRoundPoints`; por equipo aplica **auto-sustitución (comodín)**: si un titular no jugó (≥20') lo reemplaza el suplente de su misma posición que sí jugó; suma titulares efectivos + **bonus de capitán** (rating base del capitán; se pierde —no pasa al sustituto— si el capitán no jugó ≥20') + **técnico** (±2/0). Actualiza `entries.totalPoints`, marca **eliminados** (`countries.eliminatedRound`) en playoffs, fecha → `published`. Corre **una sola vez por fecha**.
- `lib/api-football/sync.ts` — `syncRound(roundId)`: baja stats de cada partido desde API-Football, calcula `fantasyPoints`, detecta figura, actualiza marcador/estado. **No es tiempo real**: se corre después de los partidos; el admin sincroniza y luego publica.

### Pagos / pines (`lib/payment-actions.ts`, `lib/payments/`)
`createPinOrder(sku, country?)` → crea `order` pending, elige proveedor por país (**AR→Mercado Pago / resto→dLocal**, país autodetectado por header geo de Vercel), llama `provider.createCheckout()` → devuelve `{ url }` (el front redirige). El proveedor (MP/dLocal) postea al webhook `/api/payments/webhook/[provider]` → `parseWebhook` confirma contra la API del proveedor → `creditOrder` (idempotente) marca la orden `paid` y, según el producto: `addPins(reason:"purchase")`, o marca `isPremium` (pack ilimitado), o **inscribe en la copa** (`enrollInLeague`, si `entryLeagueId`). `createEntryOrder(sku)` es el equivalente para la **entrada a la Liga Premium** (solo ARS por MP). `notification_url`/`back_urls` se arman desde `NEXT_PUBLIC_APP_URL`. Adapters verificados contra docs (MP Checkout Pro; dLocal `POST /v1/payments`, auth `Bearer KEY:SECRET`, estados PENDING/PAID/REJECTED/CANCELLED/EXPIRED).

### Liga Premium / Copa (`lib/copa/`, `lib/payment-actions.ts`)
Liga paga (`kind:"golden_ticket"`) con entrada en ARS y premio fijo garantizado, que rankea desde 16vos (`scoringStartRoundId`). **UNA sola copa activa**: al llenarse el cupo, `markCopaFull` la pasa a `full` (cierra la inscripción) y la UI muestra "agotado → Instagram"; **no se abre otra automáticamente** (abrir una Liga II es manual desde `/admin` con `setCopaStatus`). Si alguien paga sin lugar o fuera de término, la orden se marca `refunded` + alerta Slack (reembolso manual). Detalle completo y decisiones en [`docs/MONETIZACION.md`](./MONETIZACION.md); plan de lanzamiento en redes en [`docs/social/LANZAMIENTO-COPA.md`](./social/LANZAMIENTO-COPA.md).

### Precios (`lib/pricing/`, scripts)
Precios reales derivados de **valores de mercado de Transfermarkt**. `prices:fetch` baja un CSV → `data/market-values.json`; `prices:apply` cruza con la DB (varios tiers de matching por nombre/club/año) y escribe `players.price` con la curva de `computePrice` (`pricing/map.ts`). Respeta `priceManual=true` (precios editados a mano en `/admin/precios` no se pisan).

---

## Mapa de archivos
**`lib/`**: `db/schema.ts` · `db/index.ts` (instancia drizzle) · `game/config.ts` · `actions.ts` (saveLineup, ligas) · `admin-actions.ts` (syncRound, publishRound, updatePlayerPrice) · `queries.ts` (todas las lecturas: getPlayersWithCountry, getCoaches, getEditableRound, getEditableLineup, getMyTeam, getGlobalLeaderboard, getUserGlobalRank, getLineupPlayers, getMyLeagues, getLeagueRanking, getActiveProducts) · `auth.ts` (getCurrentUser, suggestedUsername) · `pins.ts` (getPinBalance, addPins) · `pricing/{map,normalize}.ts` · `scoring/{calcular-puntos,publicar-fecha}.ts` · `api-football/{client,enrich,sync}.ts` · `payment-actions.ts` · `payments/{index,mercadopago,dlocal,credit,types}.ts` · `utils.ts` (cn, formatPoints, formatPrice).

**`components/`**: `field-builder.tsx` (el armador, lo más grande) · `pitch.tsx` (cancha SVG + figuritas Panini + drag) · `players-explorer.tsx` · `player-card.tsx` · `pin-store.tsx` · `pin-balance.tsx` · `league-actions.tsx` · `league-management.tsx` · `admin-controls.tsx` · `price-editor.tsx` · `site-nav.tsx` · `countdown.tsx` · `welcome-banner.tsx` · `editorial/index.tsx` (primitivas: Eyebrow, PositionChip, StatNumeral, SectionHeader, CaptainBadge, PrimaryButton) · `domain/{LeagueRanking,PointsBreakdown}.tsx` · `copa/*` (UI de la Liga Premium: `CopaPromoCard`, `CopaLeagueRow`, `CopaSoldOutCard`, `EnrollButton`, `CupoScarcity`, `CopaHomeBanner`, `CopaPrizeHeader`) + `admin-copa-controls.tsx` · `ui/*` (shadcn) + `ui.tsx` (Card, PageTitle, Badge, Skeleton, EmptyState).

**`scripts/`**: `seed.ts`, `fetch-market-values.ts`, `price-players.ts`, `seed-products.ts`, `seed-golden-ticket.ts` (crea la copa + reserva), `make-admin.ts`, `counts.ts`, `test-mp.ts`, `lib/csv.ts`. **Generadores de placas de redes** (`generate-que-es.ts`, `generate-copa-1..9.ts`, `generate-highlights.ts`) → PNGs a `out/` (gitignored); ver [`docs/social/PLACAS-GUIDELINES.md`](./social/PLACAS-GUIDELINES.md). Hay además scripts ad-hoc de debug/consulta (no productivos).

---

## Diseño (`app/globals.css` + `components/editorial`)
Editorial claro estilo Gran DT + Panini. Fuentes: **Bebas Neue** (display), **Manrope** (body), **Archivo Black** (numerales tipo camiseta). Paleta: canvas `#F0F2F0`, surface `#FFFFFF`, **azul** `#1B4FD8` (primario/CTA), **dorado** `#C8A24B` (capitán/top-3), **verde pitch** `#16713F` (solo la cancha). Chips de posición (GK ámbar, DEF azul, MID verde, FWD rojo). Utilities: `.eyebrow`, `.jersey-numeral`, `.card-shadow*`, `.btn-shadow` (sombra dura, solo en el CTA primario), animaciones (`animate-fade-in`, `animate-sticker-slap`, etc.). Detalle: `formatPrice` usa coma española (5,7).

---

## Variables de entorno (ver `.env.example`)
`DATABASE_URL` · `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` · `CLERK_SECRET_KEY` (+ las `NEXT_PUBLIC_CLERK_*_URL`) · `API_FOOTBALL_KEY` · `API_FOOTBALL_BASE_URL` · `API_FOOTBALL_LEAGUE_ID=1` · `API_FOOTBALL_SEASON=2026` · `NEXT_PUBLIC_TOURNAMENT_START` · `NEXT_PUBLIC_APP_URL` · `MP_ACCESS_TOKEN` · `NEXT_PUBLIC_MP_PUBLIC_KEY` · `DLOCAL_GO_BASE_URL` · `DLOCAL_GO_API_KEY` · `DLOCAL_GO_SECRET_KEY`.
> Local: Clerk **dev** + MP **sandbox**. Vercel (prod): Clerk **live** + MP **producción**. dLocal: sin cuenta/credenciales todavía (front feature-flaggeado a la espera de `DLOCAL_GO_API_KEY/SECRET`).

---

## Estado: hecho ✅ / pendiente 🔜
**Hecho:** app completa y live en prod · dominio + SSL · Clerk producción (+ Google) · backend de pines + UI (`/pines`) · Mercado Pago en producción (verificado: crea preferencia) · pricing real · scoring + auto-sub + admin · ligas · sistema de diseño editorial.

**En curso (rama `feat/copa-golden-ticket`):** **Liga Premium** — código + UI + Bases + migración y seed (copas 103/104) ya en prod, con el cobro **gateado** hasta el visto legal. Falta: visto del abogado, proceso fiscal, activar el producto de entrada (`active=true`), crear la preferencia en MP y probar un pago real. Ver [`docs/MONETIZACION.md`](./MONETIZACION.md).

**Pendiente / a futuro:**
- 🔜 **Probar un pago real de pines** end-to-end en prod (pagar → webhook acredita). Ojo: en localhost el webhook NO llega (MP no alcanza tu compu) y mezclar token sandbox con tarjeta real da *"una de las partes es de prueba"* → probar en prod o con usuario de prueba MP.
- 🔜 **dLocal**: hay que **crear la cuenta dLocal Go desde cero** (todavía no existe) y pasar su review; cuando esté, cargar `DLOCAL_GO_API_KEY/SECRET` (sandbox primero, base `api-sbx.dlocalgo.com`) y smoke-test. El front (`/pines`) ya está listo — `isProviderConfigured("dlocal")` lo enciende solo apenas las credenciales estén en el entorno (hasta entonces muestra "próximamente" para países fuera de AR).
- ⏳ **Scoring**: se valida cuando empiecen los partidos (11/06).
- 📉 **Optimizaciones para ~5.000 users** (deferidas): cachear lecturas (jugadores, ranking) + revalidar al publicar fecha, y un par de índices (entries.totalPoints, FKs calientes).
- ⏰ **Vercel Cron** para auto-sincronizar fechas tras los partidos (hoy es manual desde `/admin`).
- 🧾 Fiscal (monotributo/CUIT) para cobrar de verdad → con un contador.

---

## Gotchas
- Mezclar credenciales **test vs prod** de Mercado Pago da *"una de las partes es de prueba"*.
- `auto_return` de MP solo va con URLs **https** (en localhost se omite — ya manejado en el adapter).
- Penales en playoffs (ganador por definición) **no** están modelados en `publishRound` (solo compara goles).
- Los fixtures de **eliminatorias** (16avos+) recién están cuando API-Football los publica; re-correr `npm run seed` (es idempotente) para sumarlos.
- `data/players.csv` y `data/market-values.json` están gitignored (se regeneran con `prices:fetch`).

> Estos son gotchas de **código/comportamiento**. Para los cuidados **operativos** de no
> romper producción (comandos peligrosos contra la DB compartida, scoring irreversible,
> checklist de deploy, datos de usuarios que no se tocan) → [`docs/PRODUCCION.md`](./PRODUCCION.md).
</content>
