# Plan — UI de inscripción a la Copa GOLDEN TICKET

> **Scaffold como plan (no construido todavía).** Diseño de la UI de inscripción para
> que el compañero la implemente. El backend y las lecturas ya existen y están probados.
>
> Contexto/decisiones: [`MONETIZACION.md`](./MONETIZACION.md) · Checklist: [`COPA-CHECKLIST.md`](./COPA-CHECKLIST.md).
> Reglas de UI: **100% responsive, mobile-first** (ver [`ui/UI-DIRECTION.md`](./ui/UI-DIRECTION.md)).

---

## Qué ya existe (no hay que crearlo)
- **`getGoldenTicketCopas(userId?)`** (`lib/queries.ts`, server component) → lista de copas visibles (no `draft`), cada una con: `code`, `name`, `status`, `capacity`, `enrolled`, `spotsLeft`, `entryFeeArs`, `prizeArs`, `entrySku`, `isEnrolled`. Tipo: `CopaStatus`.
- **`getCopasStatus()`** (`lib/payment-actions.ts`, server action) → mismo payload, para **refrescar el cupo en vivo** (polling).
- **`createEntryOrder(entrySku)`** (`lib/payment-actions.ts`) → crea la orden y devuelve `{ ok, url }` para **redirigir al checkout de MP**. Errores: `"product" | "closed" | "full" | "unavailable"`.
- Webhook de MP ya **inscribe automáticamente** al acreditar el pago (idempotente, control de cupo).
- El **ranking** de la copa ya se ve en `/ligas/[code]` (usa `scoringStartRoundId` → cuenta desde 16vos). Falta solo el **layout premium**.

---

## Superficies a construir

### 1. Página `/copa` (inscripción)
Server component que llama `getGoldenTicketCopas(user?.id)` y renderiza una **CopaCard** por copa.

**CopaCard** (estados):
- **No inscripto + `status==="open"` + `spotsLeft>0`:** muestra entrada ($5.000), premio ($400.000), barra de cupo (`enrolled`/`capacity`), distribución al top 10, **CTA "Inscribirme"** → client component que llama `createEntryOrder(entrySku)` y hace `window.location = url`.
- **`isEnrolled`:** estado **"Ya estás dentro"** + link al ranking (`/ligas/[code]`).
- **`status!=="open"` o `spotsLeft===0`:** "Inscripción cerrada" / "Cupo lleno" (CTA deshabilitado).
- **Pago no disponible (`unavailable`):** "próximamente".

**Contador de cupo en vivo:** client component que hace polling de `getCopasStatus()` (p. ej. cada 15–30s) para actualizar `enrolled`/`spotsLeft` sin recargar (refuerza la escasez).

**Retorno de pago:** manejar `?status=` igual que `/pines` (success/failure/pending) con un mensaje arriba.

**Aceptación de Bases y Condiciones:** checkbox obligatorio antes de habilitar el CTA (link al doc legal). *(depende de que B&C exista)*

### 2. Banner in-app
Componente reusable (estilo `welcome-banner.tsx`) en home y/o nav que lleva a `/copa`. Visible solo si hay alguna copa `open` con cupo. Mensaje de premio garantizado + escasez.

### 3. Layout premium del ranking en `/ligas/[code]`
Cuando la liga es `kind==="golden_ticket"`: header especial con entrada/premio/cupo + **tabla de distribución al top 10** resaltando los puestos premiados. Reusar `LeagueRanking` (`components/domain/LeagueRanking.tsx`) por debajo.

---

## Componentes sugeridos
- `components/copa/CopaCard.tsx` (server-friendly + slot client para el CTA).
- `components/copa/EnrollButton.tsx` (client: llama `createEntryOrder`, maneja loading/errores/redirect).
- `components/copa/CupoLive.tsx` (client: polling de `getCopasStatus`).
- `components/copa/PrizeTable.tsx` (distribución top 10 — datos en `MONETIZACION.md`).
- Reusar primitivas de `components/editorial` (Eyebrow, PrimaryButton, etc.) y la paleta dorada (capitán/top-3) para el branding "premium".

## Datos de la distribución (top 10)
1°30% · 2°18% · 3°12% · 4°9% · 5°7% · 6°6% · 7°5% · 8°5% · 9°4% · 10°4% → $400.000.
(Tabla completa en `MONETIZACION.md`.)

## Checklist de la UI
- [ ] `/copa` con CopaCard y sus estados (no-inscripto / inscripto / cerrada / llena / unavailable).
- [ ] EnrollButton → `createEntryOrder` → redirect; manejo de errores `closed/full/unavailable/product`.
- [ ] Contador de cupo en vivo (polling `getCopasStatus`).
- [ ] Manejo de `?status=` de retorno de pago.
- [ ] Checkbox de Bases y Condiciones (cuando exista el doc).
- [ ] Banner in-app → `/copa`.
- [ ] Layout premium del ranking en `/ligas/[code]`.
- [ ] **Responsive verificado en mobile** (320px → desktop), sin scroll horizontal.
