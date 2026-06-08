# TODOs pendientes (post Fase 2)

> Items del plan `valiant-fluttering-garden.md` (Fase 2 y "Pagos: fuera de alcance") que
> quedaron sin implementar en esta ronda. Implementados ya: observabilidad, índices de FKs
> calientes, paginación de `getLeagueRanking`, affordance de drag&drop táctil en titulares,
> accesibilidad (contraste WCAG AA + focus-trap/Esc en el armador), doble acreditación de pines.
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

- **Edge-case `getEditableRound`** (`lib/queries.ts`): una ronda con todos los `kickoff` null
  queda editable indefinidamente. Tratar `deadline=null` como **NO editable**.

- **`MAX_PER_COUNTRY` en 16avos** (`lib/actions.ts`): hoy el tope de 3 jugadores por país se
  libera desde 16avos (32 selecciones vivas). Revisar si es la intención del diseño o conviene
  mantenerlo hasta cuartos.

## Pagos (fuera de alcance — requieren PR aparte, son críticos antes de procesar volumen real)

- **dLocal fail-open** (`lib/payments/dlocal.ts`): si la reconfirmación contra la API no
  responde `res.ok`, cae al `status` del body del webhook → puede acreditar un `PAID` forjado.
  Nunca derivar `paid` del body; fail-closed.

- **MP webhook sin secreto** (`lib/payments/mercadopago.ts`): `if (!secret) return true` deja
  pasar webhooks sin validar si falta `MP_WEBHOOK_SECRET`. Exigirlo en producción (fail-closed).
