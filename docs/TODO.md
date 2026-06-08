# TODOs pendientes (post Fase 2)

> Items del plan `valiant-fluttering-garden.md` (Fase 2 y "Pagos: fuera de alcance") que
> quedaron sin implementar en esta ronda. Implementados ya: observabilidad, índices de FKs
> calientes, paginación de `getLeagueRanking`, affordance de drag&drop táctil en titulares,
> accesibilidad (contraste WCAG AA + focus-trap/Esc en el armador), doble acreditación de pines,
> **`scripts/fix-groups.ts` borrado**, **edge-case `getEditableRound` con `deadline=null`** y
> **dLocal fail-open** (los tres resueltos en esta ronda — ver detalle abajo de cada uno).
>
> "Orden de suplentes en Mi Equipo" — **no hace falta**: la auto-sustitución ya es estrictamente
> por posición (`computeEffectiveStarters` en `lib/scoring/puntos-equipo.ts`, slots `SUB_GK` /
> `SUB_DEF` / `SUB_MID` / `SUB_FWD`); si ni el titular ni su suplente de la misma posición
> jugaron, el equipo suma un jugador menos (no se cruza a otra posición). Confirmado con los
> tests existentes en `puntos-equipo.test.ts`.

## Pendientes

- **Fotos de jugador a hosting propio / `next/image`** (continuación de 0.7): hoy `photoUrl`
  viene de `media.api-sports.io` (CDN del proveedor PRO ya usado para todos los datos del
  Mundial — riesgo bajo, son SVG). Si se quiere sacar la dependencia del todo, bajar las fotos
  a `/public/` y migrar a `next/image`.

- **Cadencia del cron de sync** (`vercel.json`): hoy `0 6 * * *` (1x/día). Durante el torneo
  (arranca 11/06/2026), subir a varias veces por día (p.ej. `0 */6 * * *`) para que las stats
  estén frescas cuando el admin sincroniza/publica.

- **`MAX_PER_COUNTRY` en 16avos** (`lib/actions.ts`): hoy el tope de 3 jugadores por país se
  libera desde 16avos (32 selecciones vivas). Revisar si es la intención del diseño o conviene
  mantenerlo hasta cuartos.

## Pagos (fuera de alcance — requiere PR aparte, es crítico antes de procesar volumen real)

> ⚠️ Este ítem es **hardening de seguridad sobre pagos ya en producción** (Mercado Pago
> activo, plata real entrando) — no es una mejora opcional. Resumen del riesgo y por qué
> importa → `docs/PRODUCCION.md` §6 ("Pagos en producción").

- **MP webhook sin secreto** (`lib/payments/mercadopago.ts`): `if (!secret) return true` deja
  pasar webhooks sin validar si falta `MP_WEBHOOK_SECRET`. Exigirlo en producción (fail-closed).
