# Liga Premium — alineación rápida

> Doc para que **el compañero** entienda la propuesta: decisiones tomadas, lo que queda por
> definir y los **riesgos que asumimos**. Hoy 18/06; **16vos arranca ~28/06**.
>
> Se trabaja en la rama `feat/copa-golden-ticket`; se mergea a `main` cuando lo decidamos.
>
> **Nombres:** la feature se llama **Liga Premium** de cara al usuario (es el nombre público,
> el que se ve en la app — copas **"Liga Premium I"** y **"Liga Premium II"**). **"GOLDEN
> TICKET"** es **solo** el rótulo del producto en la interfaz de Mercado Pago al pagar, para
> que el cobro **no deje explícito** que es una liga premium paga. Internamente el codename
> sigue siendo `golden_ticket` (kind, sku, nombre de la rama y de los scripts).

## La idea en 3 líneas
**Liga Premium** = liga de **cupo fijo (100)**, **entrada $5.000**, **premio FIJO
garantizado de $400.000** repartido entre los **10 primeros**. Arranca en **16vos**, se compite
con el **equipo de siempre** (1 por usuario). El premio lo **pone la casa** (no es pozo
redistribuido) y se reparte **sí o sí**. Vamos a **llenar los 100** (hay tiempo de promo).

> El ingreso real del negocio son **los pines** que la competencia dispara (rearmar en
> instancias finales cuesta pines); la entrada es secundaria.

---

## Modelo económico
Entrada $5.000 · premio fijo $400.000 · cupo 100. A cupo lleno la casa deja **+$100k**.

| Inscriptos | Recauda | Premio | Resultado casa |
|---|---|---|---|
| **100 (objetivo)** | $500.000 | $400.000 | **+$100.000** 🟢 |
| 80 | $400.000 | $400.000 | $0 |
| 56 | $280.000 | $400.000 | −$120.000 |
| 30 | $150.000 | $400.000 | −$250.000 |

> **Decisión:** se hace **sí o sí** y los **$400k se reparten sí o sí** — **sin mínimo ni
> reembolso**. El objetivo es llenar los 100. Si no se llegara, la casa cubre la diferencia
> (riesgo asumido, ver abajo).

---

## Decisiones tomadas
1. **Premio fijo garantizado $400.000**, lo pone la casa (NO pozo). Se reparte sí o sí.
2. **Entrada $5.000.**
3. **Cupo 100 personas** por copa. Objetivo: llenarlo.
4. **Premio al top 10**, distribución confirmada (abajo).
5. **Dos copas IGUALES.** Una activa; la segunda se **habilita manualmente** si la primera
   llena los 100. Misma entrada/premio/cupo. Estructura lista desde el arranque.
6. **Arranca en 16vos.** Rankea desde 16vos en adelante (grupos no cuenta). → técnicamente
   `leagues.scoringStartRoundId` apuntando a 16vos (infra ya existe y probada en prod).
7. **Un equipo por usuario.** Es un ranking sobre el equipo actual, no un equipo nuevo.
8. **Cobro por Mercado Pago**, producto **"GOLDEN TICKET"** (rótulo del cobro a propósito: el
   usuario ve "GOLDEN TICKET" en MP, no "Liga Premium", para no explicitar que es premium paga).
9. **Alta automática** tras el pago vía **webhook de MP** (reusa la infra de pines): pagó
   GOLDEN TICKET → queda inscripto en la copa. *(Patrón similar al pack `unlimited`, que en
   vez de acreditar pines marca al usuario; acá inscribe en la copa.)*
10. **16vos: 5 cambios gratis SOLO para los inscriptos en la Copa** (los premium conservan
    su pack ilimitado), para emparejar cuentas nuevas y viejas que entran a la Copa. El resto
    de los usuarios sigue con 1 cambio gratis. Se reinician al arrancar la fecha (no se
    acumulan). *(`getFreeChangesForRound(order, inCopa)` en config.ts; la inscripción se
    chequea con `isEnrolledInGoldenTicket`.)*

---

## Distribución del premio (confirmada)
$400.000 entre los 10 primeros:

| Puesto | % | Premio |
|---|---|---|
| 1° | 30% | $120.000 |
| 2° | 18% | $72.000 |
| 3° | 12% | $48.000 |
| 4° | 9% | $36.000 |
| 5° | 7% | $28.000 |
| 6° | 6% | $24.000 |
| 7° | 5% | $20.000 |
| 8° | 5% | $20.000 |
| 9° | 4% | $16.000 |
| 10° | 4% | $16.000 |
| **Total** | **100%** | **$400.000** |

---

## Riesgos asumidos (torneo acotado, evento único)
Cupo de 100, una sola vez. Los conocemos y los asumimos a conciencia:

1. **Mercado Pago.** Cobrar entradas va contra los términos de MP. Al ser **acotado** (100
   pagos, evento único) la exposición es baja, pero el riesgo de congelamiento **no es cero**
   — y si pasa, se cae también la venta de pines. Asumido.
2. **Legal.** Entrada + premio en plata puede encuadrarse como juego regulado; que sea
   acotado **no cambia** si es legal o no. **Acción pendiente: visto de un abogado antes de
   cobrar.** Es el único bloqueante real para darle "play" al cobro.
3. **Bolsillo.** Premio fijo garantizado: confiamos en llenar los 100; si no, la casa cubre la
   diferencia. Asumido.
4. **Asimetría nuevo/viejo + algo de pay-to-win** del premium en una liga con plata, mitigado
   por la decisión 10.

---

## Estado técnico (rama `feat/copa-golden-ticket`)
**Hecho (backend) — build + tests verdes:**
- **Schema:** `leagues` + `kind`/`status`/`capacity`/`entryFeeArs`/`prizeArs`; `products` +
  `entryLeagueId`. Migración `drizzle/0014` **generada, NO aplicada**.
- **Inscripción:** `createEntryOrder` (cobra la entrada por Mercado Pago) + branch en
  `creditOrder` → al pagar, inscribe en la copa (idempotente, control de cupo, aviso a Slack
  si está llena) en vez de acreditar pines. El webhook actual ya enruta solo.
- **Ranking desde 16vos:** reusa `scoringStartRoundId` (sin código nuevo).
- **5 cambios gratis en 16vos solo para inscriptos:** `getFreeChangesForRound(order, inCopa)`
  (config.ts) + `isEnrolledInGoldenTicket` (queries.ts).
- **Seed:** `npm run seed:golden-ticket` crea las 2 copas (1 `open`, 1 `draft`) + sus
  productos de entrada. Idempotente.

**Datos listos para la UI:**
- `getGoldenTicketCopas(userId?)` (lectura, server component) y `getCopasStatus()` (server
  action, para refrescar el cupo en vivo / polling). Devuelven cada copa con: `code`, `name`,
  `status`, `capacity`, `enrolled`, `spotsLeft`, `entryFeeArs`, `prizeArs`, `entrySku`,
  `isEnrolled`. Tipo exportado: `CopaStatus`.
- `createEntryOrder(entrySku)` → crea la orden y devuelve `{ url }` para redirigir al checkout.

**Falta — UI (lo del compañero):**
- Sección de inscripción (botón → `createEntryOrder(entrySku)` → redirige a `url`).
- Mostrar cupo (`enrolled`/`capacity`), entrada y premio; si `isEnrolled`, estado "ya estás dentro".
- Ranking de la Copa: `/ligas/[code]` ya muestra el ranking; falta el layout premium
  (entrada/premio/cupo + distribución al top 10).

## Cómo activar (gated por OK + visto legal) 🔒
1. Aplicar la migración a la DB (`npm run db:migrate`) — leé `docs/PRODUCCION.md §2` antes.
2. Seedear copas + productos (`npm run seed:golden-ticket`) — requiere un admin y el torneo seedeado.
3. Crear el producto/preferencia GOLDEN TICKET en Mercado Pago (el adapter ya arma el checkout).
4. Mergear la rama a `main` (recién **acá** se toca producción).

---

## Resumen
- **Liga Premium** en **16vos**, **cupo 100**, **2 copas iguales** (1 activa + 1 reserva
  manual), **entrada $5.000**, **premio FIJO $400.000** al **top 10**, **se reparte sí o sí**.
- **No es pozo**: lo pone la casa. Vamos a **llenar los 100**; si no, la casa cubre.
- **El negocio son los pines**; la entrada es secundaria.
- **Cobro por MP** con **alta automática** por webhook. **Único bloqueante: visto legal antes
  de cobrar.**
- En 16vos, **5 cambios gratis solo para los inscriptos en la Copa** (premium conservan ventaja).
</content>
