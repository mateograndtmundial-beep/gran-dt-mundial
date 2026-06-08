# Producción — runbook y cuidados (LEER antes de tocar nada que impacte lo live)

> **La app está EN PRODUCCIÓN, funcionando, con usuarios reales.** Este doc es la fuente única
> de los "cuidados" para no romperla ni poner en riesgo los datos/equipos de la gente ya
> registrada. `docs/PROJECT-CONTEXT.md` y `docs/TODO.md` enlazan acá en vez de repetir.

---

## 1. Estado productivo (qué hay live, hoy)

- 🌐 **Live**: https://www.los11desampa.com (apex `los11desampa.com` redirige 308 → `www`), con dominio propio + SSL.
- 📦 **Deploy**: auto-deploy en **Vercel** desde la rama `main` del repo (cualquier push a `main` despliega a producción, sin paso intermedio).
- 🗄️ **Base**: Neon Postgres **única** — la misma que usás en local (ver §2). Tiene seed real del Mundial 2026 (48 selecciones, 1248 jugadores, 48 técnicos, fixture de grupos) **y datos reales de usuarios**: cuentas (`users`), equipos guardados (`entries`/`entryRounds`/`entryRoundPlayers`), ligas privadas (`leagues`/`leagueMembers`), compras y saldo de pines (`orders`/`pinTransactions`).
- 🔑 **Auth**: Clerk en modo **producción** (`pk_live`/`sk_live` en Vercel, Google OAuth propio). Local usa keys de **dev** (`pk_test`) — no se mezclan.
- 💳 **Pagos**: **Mercado Pago en producción** (Argentina, verificado: crea preferencia). dLocal Go (resto de LatAm) está feature-flaggeado y todavía sin cuenta/credenciales — el front muestra "próximamente" hasta que `isProviderConfigured("dlocal")` se habilite solo.
- ⏰ **Cron**: `vercel.json` corre `/api/cron/sync` con `0 6 * * *` (1x/día) — sincroniza stats desde API-Football.
- 🏆 **El torneo arranca el 11/06/2026** → hasta entonces el scoring (sync/publicar fechas) no se ejercita con datos reales; a partir de esa fecha cada fecha publicada es **definitiva** (ver §4).

---

## 2. Regla de oro: la DB local ES la de producción

`DATABASE_URL` es **la misma** en tu `.env` local que en Vercel. No hay entorno de staging.
Esto significa que **cualquier comando que corras en tu máquina pega contra los datos reales**
de la gente que ya juega. Antes de correr algo que escribe en la DB, preguntate: "¿esto le
puede mover el equipo, los puntos o los pines a alguien que ya está jugando?".

### Comandos y su riesgo real

| Comando | Qué hace | Riesgo en prod |
|---|---|---|
| `npm run db:push` | Sincroniza el schema directo (sin migración versionada) | ⚠️ **NUNCA lo corras acá.** Puede dropear columnas/datos sin aviso ni rollback. Usá siempre `db:generate` (genera SQL versionado en `drizzle/`) → revisá el SQL → `db:migrate`. |
| `npm run db:migrate` | Aplica las migraciones de `drizzle/*.sql` a Neon | Es el camino correcto, pero **leé el SQL generado** antes si toca tablas con datos de usuarios (`entries`, `entryRounds`, `pinTransactions`, etc.) — un `ALTER`/`DROP` mal pensado puede perder datos reales. |
| `npm run seed` | Re-siembra el torneo (selecciones/jugadores/técnicos/fixture) desde API-Football | Es **idempotente**, pero re-escribe filas de `players`/`countries`/`matches`. Respeta `priceManual=true`, pero ojo si ya hay `playerMatchStats`/`playerRoundPoints` cargados — no debería pisarlos, pero validá después de correrlo. |
| `npm run seed:products` | Sobrescribe los packs de `products` (la tienda de pines) | Cambia lo que la gente ve y puede comprar en `/pines` ahora mismo. |
| `npm run prices:apply` | Reescribe `players.price` con la curva de pricing | Cambia presupuestos: puede dejar inválido un equipo ya guardado (validación server-side lo va a frenar en el próximo guardado, pero el usuario se encuentra con la sorpresa). **Corré siempre con `--dry` primero** y revisá el diff. |
| `npm run make-admin [username]` | Marca usuario(s) como admin | Otorga acceso a `/admin` (sync/publicar fechas, editar precios) — no es reversible "solo" (hay que volver a correrlo o tocar la DB a mano). |

> Si necesitás probar algo destructivo (seeds raros, migraciones grandes, cambios de pricing
> masivos), la opción correcta a futuro es una **branch de Neon** o una DB de prueba aparte —
> hoy no existe, así que extremá el cuidado o pedí ayuda antes de correr algo nuevo.

---

## 3. Deploy: push a `main` = producción, sin red de seguridad

- `git pull --rebase origin main` siempre antes de empezar (el compañero pushea seguido — las carreras de push son normales, se resuelven con fetch+rebase+push de nuevo).
- **Corré `npm run build` localmente antes de pushear.** Es la única validación previa al deploy real. Excepción explícita: cambios *solo* de markdown/docs no necesitan build.
- Si el build falla, no pushees "para ver qué pasa en Vercel" — arreglalo local primero.
- Commits: terminá el mensaje con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Commiteá/pusheá solo cuando el usuario lo pida explícitamente.

---

## 4. Scoring: `publishRound` es prácticamente irreversible

- `publishRound(roundId)` (`lib/scoring/publicar-fecha.ts`) corre **una sola vez por fecha**
  (`if (round.status === "published") return`): agrega `playerMatchStats.fantasyPoints` →
  `playerRoundPoints`, aplica auto-sustitución + bonus de capitán + técnico, **actualiza
  `entries.totalPoints` de TODOS los usuarios**, marca eliminados (`countries.eliminatedRound`)
  y pasa la fecha a `published`.
- No hay un botón de "despublicar" — revertirlo a mano significa tocar puntos, ranking y
  estado de eliminación de selecciones, en una tabla con datos de cientos/miles de usuarios.
- **Antes de publicar**: corré `syncRound` (sincroniza stats desde API-Football), y que el
  admin **revise el resultado en el panel** — recién ahí publicar. Doble check si hay
  empates de figura del partido (lo define el admin a mano) o si la fecha es de **playoffs**
  (los penales no están modelados — `publishRound` solo compara goles, gotcha conocido).
- Cadencia del cron de sync (`vercel.json`, hoy `0 6 * * *`) puede no alcanzar durante el
  torneo — ver `docs/TODO.md`.

---

## 5. Datos de usuarios: lo que NUNCA se edita a mano

Estas tablas son el "estado del juego" de gente real — no se tocan con UPDATE/DELETE manuales,
ni se pisan con seeds:

- `users` — cuentas (incluye `isAdmin`, `isPremium`, `username` único).
- `entries` / `entryRounds` / `entryRoundPlayers` — equipos guardados, alineaciones por fecha, roster.
- `leagues` / `leagueMembers` — ligas privadas y sus miembros.
- `pinTransactions` — **ledger de pines**. El saldo de cada usuario es `SUM(delta)`, no un
  campo. Insertar/borrar filas a mano descuadra el saldo real contra lo que el usuario ve y
  contra lo que pagó. Cualquier ajuste pasa por `addPins(reason: ...)` (`lib/pins.ts`), nunca
  por SQL directo.
- `orders` — historial de compras; `status` lo mueve el webhook de forma idempotente.

Si una migración (`db:generate`/`db:migrate`) toca el schema de cualquiera de estas tablas,
**leé el SQL generado** antes de aplicarlo: un `ALTER COLUMN`/`DROP` mal pensado se lleva
puestos equipos y saldos reales.

---

## 6. Pagos en producción

- **No mezclar credenciales test/prod de Mercado Pago** — da el error *"una de las partes es
  de prueba"*. Local usa MP sandbox; Vercel usa MP producción.
- `auto_return` de MP solo funciona con URLs `https` (en localhost se omite, ya manejado).
- **Riesgos de seguridad abiertos** (documentados en detalle en `docs/TODO.md` § Pagos —
  son **hardening crítico antes de procesar volumen real**, no "nice to have"):
  - `lib/payments/dlocal.ts`: si la reconfirmación contra la API de dLocal no responde
    `res.ok`, el código cae al `status` que viene en el *body del webhook* → un atacante
    podría forjar un webhook `PAID` y acreditarse pines sin pagar. Hay que ir a **fail-closed**
    (nunca derivar `paid` del body, solo de la reconfirmación contra el proveedor).
  - `lib/payments/mercadopago.ts`: `if (!secret) return true` dentro de `verifyWebhookSignature`
    deja pasar webhooks **sin validar la firma** si falta `MP_WEBHOOK_SECRET` en el entorno.
    Hay que **exigir el secreto en producción** (fail-closed) — hoy ese atajo solo es válido
    en dev/pre-lanzamiento.
- dLocal todavía no tiene cuenta creada (`DLOCAL_GO_API_KEY/SECRET` faltan) — el front ya está
  listo y se enciende solo cuando las credenciales aparezcan en el entorno.

---

## 7. Secrets

- `.env` está **gitignored** y tiene las keys reales (Neon, Clerk, API-Football, Mercado
  Pago). `.env.example` es el template — **nunca commitear `.env`**.
- En Vercel, las env de producción se cargan desde el dashboard (no desde el repo).

---

## 8. Checklist pre-push (antes de mandar algo a `main`)

- [ ] `git pull --rebase origin main` — sin conflictos.
- [ ] ¿Es solo docs/markdown? → podés saltear el build. Si no:
- [ ] `npm run build` corrió OK local.
- [ ] ¿Tocás el schema (`lib/db/schema.ts`)? → generaste la migración (`db:generate`),
      **leíste el SQL**, y sabés que vas a aplicarla con `db:migrate` (nunca `db:push`).
- [ ] ¿Tocás scoring/pagos/pines? → revisaste dos veces la lógica server-side — son las
      partes donde un bug afecta plata y puntos reales de gente.
- [ ] El mensaje de commit sigue el formato y termina con el `Co-Authored-By` correspondiente.

---

## 9. Si algo se rompe (mini incident response)

1. **No entres en pánico ni corras scripts "para arreglarlo" contra la DB.** Eso es lo que
   más rápido convierte un incidente chico en uno grande.
2. Revertí el commit problemático en `main` (un revert normal, sin `--force`) — Vercel
   redeploya solo con el estado anterior.
3. Revisá los logs de Vercel (Functions/Build) y el estado en Neon antes de tocar nada.
4. Si el problema es de datos (puntos mal publicados, pines descuadrados, etc.), **no
   improvises un UPDATE manual** — pensá el fix como una migración/script revisado y
   reversible, igual que cualquier otro cambio a producción.

---

## Ver también
- `docs/PROJECT-CONTEXT.md` — contexto completo del proyecto, modelo de datos, lógica de negocio.
- `docs/TODO.md` — pendientes técnicos, incluyendo el detalle de los riesgos de pagos de §6.
- `docs/PINES-API.md` — contrato del backend de pines para el front.
