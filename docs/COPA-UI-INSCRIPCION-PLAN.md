# Plan — UI de inscripción a la Liga Premium

> **Scaffold como plan (no construido todavía).** Diseño de la UI de inscripción para
> que el compañero la implemente. El backend y las lecturas ya existen y están probados.
>
> **Nombre:** la feature es **Liga Premium** de cara al usuario; **"GOLDEN TICKET"** queda
> solo como rótulo del cobro en Mercado Pago.
>
> Contexto/decisiones: [`MONETIZACION.md`](./MONETIZACION.md) · Checklist: [`COPA-CHECKLIST.md`](./COPA-CHECKLIST.md).
> Reglas de UI: **100% responsive, mobile-first** (ver [`ui/UI-DIRECTION.md`](./ui/UI-DIRECTION.md)).

---

## ⭐ Decisión de navegación (IMPORTANTE — leer primero)
**La Copa NO suma un ítem nuevo a la barra inferior de mobile.** La low-bar ya tiene 6 destinos
(Inicio · Jugadores · Equipo · Ligas · Ranking · Ayuda) — agregar "Copa" la satura y genera desgaste.
**La Copa vive DENTRO de `/ligas`** (es, conceptualmente, una liga premium). Reglas:

- **`/ligas` es la superficie principal in-app de la Copa.** Ahí se integra como una sección más:
  - **Inscripto (pagó):** su Copa aparece **en su lista de ligas**, con estilo premium (dorado), y
    linkea al ranking de la copa (`/ligas/[code]`). Es "una liga más" pero destacada.
  - **No inscripto:** aparece **una sola card de promoción/CTA** ("Sumate a la Liga Premium")
    que abre el flujo de inscripción → pasarela de **Mercado Pago**.
- **`/copa` se mantiene SOLO como landing de campaña** (el link `los11desampa.com/copa` que usan las
  piezas de redes). **No va en la nav**; se llega desde la card de `/ligas`, el banner in-app, o el
  link externo. Puede ser la misma UI de inscripción reutilizada.
- **Escalable:** todo se deriva de **`getGoldenTicketCopas(userId)`** → si mañana hay varias copas
  (oleadas 16vos/8vos, ver checklist), la sección de `/ligas` las lista solas sin tocar la nav:
  las inscriptas como ligas premium, las abiertas no-inscriptas colapsadas en la card de promo.

---

## Qué ya existe (no hay que crearlo)
- **`getGoldenTicketCopas(userId?)`** (`lib/queries.ts`, server component) → lista de copas visibles (no `draft`), cada una con: `code`, `name`, `status`, `capacity`, `enrolled`, `spotsLeft`, `entryFeeArs`, `prizeArs`, `entrySku`, `isEnrolled`. Tipo: `CopaStatus`.
- **`getCopasStatus()`** (`lib/payment-actions.ts`, server action) → mismo payload, para **refrescar el cupo en vivo** (polling).
- **`createEntryOrder(entrySku)`** (`lib/payment-actions.ts`) → crea la orden y devuelve `{ ok, url }` para **redirigir al checkout de MP**. Errores: `"product" | "closed" | "full" | "unavailable"`.
- Webhook de MP ya **inscribe automáticamente** al acreditar el pago (idempotente, control de cupo).
- El **ranking** de la copa ya se ve en `/ligas/[code]` (usa `scoringStartRoundId` → cuenta desde 16vos). Falta solo el **layout premium**.

---

## Superficies a construir

### 1. Sección Copa dentro de `/ligas` (superficie PRINCIPAL)
`app/ligas/page.tsx` ya es server component y arma user + `getMyLeagues(user.id)`. Sumar
`const copas = await getGoldenTicketCopas(user.id)` y, **encima del bloque "LIGAS"** (o justo
debajo de la Liga Global), renderizar la sección Copa según el estado de cada copa:

- **Copa(s) inscripta(s) (`isEnrolled`):** una entrada por copa, **con estilo premium dorado** (borde
  dorado a la izquierda, como hace la Liga Global con `border-l-blue`), que linkea a `/ligas/[code]`
  (su ranking). Va arriba de las ligas privadas — es la liga "destacada".
- **Copa(s) abierta(s) no-inscripta(s) (`status==="open"` + `spotsLeft>0`):** **una card de promo/CTA**
  (`CopaPromoCard`) con premio $400.000 garantizado, entrada $5.000, **barra de cupo en vivo** y CTA
  **"Sumate a la Copa"** → dispara la inscripción por Mercado Pago (`EnrollButton`, ver abajo). Si hay
  varias copas abiertas, mostrar **una sola** card (la copa activa de menor cupo restante) para no
  saturar; el detalle de todas vive en `/copa`.
- **Sin copas abiertas ni inscriptas:** no se muestra nada (la sección desaparece).

> Así un usuario que pagó ve su Copa **junto a sus otras ligas** (mental model correcto: "es una liga
> premium"), y el que no pagó ve **solo la invitación**. Cero ítems nuevos en la nav.

### 2. Página `/copa` (landing de campaña + inscripción detallada) — NO en la nav
Server component que llama `getGoldenTicketCopas(user?.id)` y renderiza una **CopaCard** por copa.
Es el destino del link de redes (`los11desampa.com/copa`) y del banner/CTA; **no se agrega a la barra
de navegación**. Reusa los mismos componentes que la card de `/ligas`.

**CopaCard** (estados):
- **No inscripto + `status==="open"` + `spotsLeft>0`:** muestra entrada ($5.000), premio ($400.000), barra de cupo (`enrolled`/`capacity`), distribución al top 10, **CTA "Inscribirme"** → client component que llama `createEntryOrder(entrySku)` y hace `window.location = url`.
- **`isEnrolled`:** estado **"Ya estás dentro"** + link al ranking (`/ligas/[code]`).
- **`status!=="open"` o `spotsLeft===0`:** "Inscripción cerrada" / "Cupo lleno" (CTA deshabilitado).
- **Pago no disponible (`unavailable`):** "próximamente".

**Contador de cupo en vivo:** client component que hace polling de `getCopasStatus()` (p. ej. cada 15–30s) para actualizar `enrolled`/`spotsLeft` sin recargar (refuerza la escasez). Reusable en la card de `/ligas`.

**Retorno de pago:** manejar `?status=` igual que `/pines` (success/failure/pending) con un mensaje arriba. **El retorno de MP puede volver a `/copa` o a `/ligas`** (definir `back_urls` al crear la orden); manejar `?status=` en ambas si se permite el flujo desde `/ligas`.

**Aceptación de Bases y Condiciones:** checkbox obligatorio antes de habilitar el CTA (link al doc legal). *(depende de que B&C exista)*

### 3. Banner in-app
Componente reusable (estilo `welcome-banner.tsx`) en home que lleva a `/copa` (o ancla a la sección de `/ligas`). Visible solo si hay alguna copa `open` con cupo y el usuario **no** está inscripto. Mensaje de premio garantizado + escasez.

### 4. Layout premium del ranking en `/ligas/[code]`
Cuando la liga es `kind==="golden_ticket"`: header especial con entrada/premio/cupo + **tabla de distribución al top 10** resaltando los puestos premiados. Reusar `LeagueRanking` (`components/domain/LeagueRanking.tsx`) por debajo.

---

## Componentes sugeridos
- `components/copa/CopaPromoCard.tsx` (la card de promo/CTA que se inserta en `/ligas` para no-inscriptos — premio + cupo en vivo + `EnrollButton`).
- `components/copa/CopaLeagueRow.tsx` (la fila premium dorada de la copa inscripta dentro de la lista de `/ligas`, linkea a `/ligas/[code]`).
- `components/copa/CopaCard.tsx` (la versión completa para la landing `/copa`; server-friendly + slot client para el CTA).
- `components/copa/EnrollButton.tsx` (client: llama `createEntryOrder`, maneja loading/errores/redirect). **Reusado en `/ligas` y `/copa`.**
- `components/copa/CupoLive.tsx` (client: polling de `getCopasStatus`). **Reusado en ambas superficies.**
- `components/copa/PrizeTable.tsx` (distribución top 10 — datos en `MONETIZACION.md`).
- Reusar primitivas de `components/editorial` (Eyebrow, PrimaryButton, etc.) y la paleta dorada (capitán/top-3) para el branding "premium".

## Datos de la distribución (top 10)
1°30% · 2°18% · 3°12% · 4°9% · 5°7% · 6°6% · 7°5% · 8°5% · 9°4% · 10°4% → $400.000.
(Tabla completa en `MONETIZACION.md`.)

## Checklist de la UI
- [ ] **Integrar la Copa en `/ligas`** (superficie principal): copa inscripta como fila premium dorada + card de promo/CTA para no-inscriptos. **Sin sumar ítem a la nav.**
- [ ] `/copa` con CopaCard y sus estados (no-inscripto / inscripto / cerrada / llena / unavailable) — landing de campaña, **fuera de la nav**.
- [ ] EnrollButton → `createEntryOrder` → redirect a MP; manejo de errores `closed/full/unavailable/product`. Reusado en `/ligas` y `/copa`.
- [ ] Contador de cupo en vivo (polling `getCopasStatus`).
- [ ] Manejo de `?status=` de retorno de pago (en `/copa` y, si se permite el flujo, en `/ligas`).
- [ ] Checkbox de Bases y Condiciones (cuando exista el doc).
- [ ] Banner in-app → `/copa` (solo si hay copa abierta y el usuario no está inscripto).
- [ ] Layout premium del ranking en `/ligas/[code]`.
- [ ] **Responsive verificado en mobile** (320px → desktop), sin scroll horizontal.
