# Liga Premium — alineación rápida

> 🟢 **EN VIVO desde el 25/06/2026.** Llegó el **OK legal** y la Liga Premium quedó **activa y
> cobrando en producción** (mergeada a `main`, desplegada). El bloqueante legal está resuelto.
> **El checklist detallado más abajo queda como registro del estado previo al lanzamiento** —
> leer la situación actual desde acá, no desde los `[ ]` históricos.
>
> Doc para que **el compañero** entienda la propuesta: decisiones tomadas, lo que queda por
> definir y los **riesgos que asumimos**. **16vos arranca ~28/06**.
> El **código y la UI ya están hechos** (ver "Estado técnico").
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

> **Decisión:** se hace **sí o sí** y los **$400k se reparten sí o sí**. El objetivo es llenar
> los 100; si no se llegara, **la casa cubre la diferencia** (riesgo asumido, ver abajo) — o sea
> **no hay reembolso por "no se llenó la copa"**. **Distinto del overflow:** si alguien **paga
> pero no entra por falta de cupo** (carrera por el último lugar / inscripción ya cerrada),
> **eso sí se reembolsa** (decisión 19/06, ver checklist técnico).

---

## Decisiones tomadas
1. **Premio fijo garantizado $400.000**, lo pone la casa (NO pozo). Se reparte sí o sí.
2. **Entrada $5.000.**
3. **Cupo 100 personas** por copa. Objetivo: llenarlo.
4. **Premio al top 10**, distribución confirmada (abajo).
5. **UNA sola Liga Premium activa (cupo 100).** Cuando se llena, la inscripción se **cierra**
   (`markCopaFull` la pasa a `full`) y la UI muestra "cupos agotados → escribinos por Instagram".
   **No se abre otra copa automáticamente.** Hay una copa de **reserva** seedeada en `draft`
   (oculta); si se quiere abrir una **Liga II/III**, es una decisión **manual** del admin desde
   `/admin` (`setCopaStatus`, draft → open).
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
| 7° | 5,25% | $21.000 |
| 8° | 4,75% | $19.000 |
| 9° | 4,25% | $17.000 |
| 10° | 3,75% | $15.000 |
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


## Estado técnico (rama `feat/copa-golden-ticket`) — actualizado 19/06
**TODO el código está HECHO en esta rama (build verde).** Resumen:
- **Schema + migración `0014`:** `leagues` (`kind`/`status`/`capacity`/`entryFeeArs`/`prizeArs`) +
  `products.entryLeagueId`. **Migración APLICADA en prod** (aditiva, retrocompatible).
- **Inscripción/cobro:** `createEntryOrder` (entrada por MP, gate de cupo y de **deadline**) +
  `creditOrder → enrollInLeague` (webhook): al pagar inscribe (idempotente). Si paga sin
  lugar/fuera de término → orden `refunded` + alerta Slack (reembolso manual). Al llenarse, cierra
  la inscripción (`markCopaFull` → `full`, `lib/copa/lifecycle.ts`); **no** abre otra copa sola.
- **Tope 5 por país desde 16vos:** `MAX_PER_COUNTRY_KNOCKOUT` (regla general, todos los usuarios).
- **Ranking desde 16vos** (`scoringStartRoundId`) + **desempate** (mejor pico de fecha →
  `joinedAt`, en `getLeagueRanking`) + **snapshot de corte** (`snapshotCopaRanking`, admin).
- **5 cambios gratis en 16vos solo para inscriptos** (`getFreeChangesForRound`).
- **Seed corrido:** copas 103/104, productos `golden_ticket_1/2` (`active=false`).
- **UI:** `EnrollButton` (checkbox B&C → `createEntryOrder` → MP), `?status=` en `/ligas/[code]`
  y `/copa`, `CupoLive`, `CopaPromoCard`/`CopaLeagueRow`/`CopaSoldOutCard`, `CopaPrizeHeader`,
  landing `/copa`, banner sutil en la home (`CopaHomeBanner`), reconciliación + control de copas
  en `/admin` (`AdminCopaControls`).
- **Bases y Condiciones:** `docs/legal/BASES-Y-CONDICIONES.md` (draft) + `/bases`, linkeada en el
  checkout y en `/soporte`.

## Cómo activar (gated por visto legal) 🔒 — lo que QUEDA, en orden
1. **Visto legal** (abogado) + cerrar los `[REVISAR CON ABOGADO]` de las Bases.
2. **Fiscal** (contador): facturación de entradas + pago de premios + retenciones.
3. **Merge de la rama a `main` + deploy** con build verde (recién acá se toca prod; la migración
   ya está aplicada → seguro).
4. **Activar los productos** `golden_ticket_1/2` (`active=true`) — hoy en `false`.
5. **Crear el producto/preferencia GOLDEN TICKET en MP** + **smoke-test de pago real** en prod
   (el webhook no llega a localhost; ojo gotcha test/prod).
6. **Lanzamiento en Instagram/Twitter** (abre inscripción) → cierra al kickoff de 16vos o a los 100.

---

## Resumen
- **Liga Premium** en **16vos**, **cupo 100**, **UNA sola copa activa** (al llenarse cierra la
  inscripción; hay una reserva en `draft` que se abre **a mano** si se decide una Liga II),
  **entrada $5.000**, **premio FIJO $400.000** al **top 10**.
- **No es pozo**: lo pone la casa. Vamos a **llenar los 100**; si no, la casa cubre.
- **El negocio son los pines**; la entrada es secundaria.
- **Cobro por MP** con **alta automática** por webhook. ~~Único bloqueante: visto legal antes
  de cobrar.~~ ✅ **Visto legal recibido (25/06/2026) — en vivo.**
- En 16vos, **5 cambios gratis solo para los inscriptos en la Copa** (premium conservan ventaja).

---

## Checklist para salir LIVE

### TL;DR del estado (actualizado 19/06)
- **Backend + UI: HECHO en esta rama.** Schema + migración `0014` **aplicada** en prod, seed
  **corrido** (copas 103/104, productos `golden_ticket_1/2` `active=false`). Inscripción/cobro por
  MP, webhook que inscribe, ranking desde 16vos, cupo, 5 cambios gratis para inscriptos.
- **Cerrado en esta rama (código):** tope **5 por país desde 16vos** (regla general); **cierre por
  cupo + por kickoff de 16vos**; **auto-activación de la copa II** al llenarse la I; **overflow →
  orden `refunded` + alerta Slack + vista de reconciliación en `/admin`** (reembolso manual en MP);
  **desempate** (mejor pico de fecha → inscripción más temprana); **snapshot de corte** tras la
  Final (`snapshotCopaRanking`); **UI de pago** (EnrollButton con T&C → `createEntryOrder`, retorno
  `?status=`, cupo en vivo, estado "cupos agotados → Instagram", landing `/copa`, **banner sutil en
  la home**); **Bases y Condiciones** (`docs/legal/BASES-Y-CONDICIONES.md` + `/bases`, linkeadas en
  el checkout y en `/soporte`).
- **Falta para LIVE (NO es código):** visto legal del abogado, proceso fiscal (monotributo/CUIT),
  activar los productos `golden_ticket_1/2` (`active=true`), crear el producto/preferencia en MP,
  merge a `main` + deploy, y la **prueba de pago real** end-to-end en prod.

---

### ✅ Decisiones tomadas (cerradas)
- Entrada **$5.000**, premio **fijo garantizado $400.000** al **top 10** (lo pone la casa, no es pozo).
- **Cupo 100.** **UNA sola copa activa**; hay una `#2` en `draft` (reserva oculta) que **NO se abre sola** — solo a mano desde `/admin` si se decide una Liga II.
- Arranca y rankea desde **16vos** (`scoringStartRoundId`). Un equipo por usuario.
- Cobro por **Mercado Pago**, alta automática por **webhook** (reusa infra de pines).
- En 16vos, **5 cambios gratis solo para inscriptos** (premium conservan su pack). ✅ implementado.
- **Inscripción abre** con la **primera publicación en Instagram** (y quizás Twitter).
- **Inscripción cierra** con el **kickoff de los 16vos** **o** al llegar a **100 inscriptos** (lo que pase primero).
- **Payout manual:** publicamos ganadores en **Instagram + mail**; los ganadores se comunican con nosotros para cobrar.
- **Ligas de 100, premio fijo $400.000** (no se balancea en ligas chicas: bajo ~80 pagos pierden plata). Se llena UNA; abrir otra es **decisión manual** (no automática).
- **Escalado por oleadas (manual):** oleada **16vos** (cierra 28/06); si quedan muchos interesados, se puede abrir **a mano** una **nueva copa que arranca en 8vos** (cierra en el kickoff de 8vos → más días para llenarla). **Apertura y cierre de copas siempre manual/discrecional** (el cupo 100 frena la copa sola; abrir otra lo decide el admin).
- **`MAX_PER_COUNTRY` en 16avos** (`lib/actions.ts`): Quiero que el tope de 3 jugadores por país se libere desde 16avos (32 selecciones vivas) y pase a 5 jugadores por pais. Este tope de 5 por pais ya permite tener equipos 100% funcionales hasta la ultima instancia (4 selecciones vivas. 20 jugadores posibles sobre 15 totales.). El anterior de 3, no.

---

### 🔴 Pendiente — agrupado por área

#### Legal (bloqueante real)
- [x] **Visto de un abogado** antes de cobrar (entrada + premio en plata puede ser juego regulado). *(recibido el 25/06/2026 — desbloqueado, en vivo)*
- [~] **Bases y Condiciones**: **draft hecho** (`docs/legal/BASES-Y-CONDICIONES.md` + página `/bases`, con aceptación obligatoria en el checkout y link en `/soporte`). **Falta:** que el abogado revise/cierre los `[REVISAR CON ABOGADO]` y dar por publicada la versión final.
- [x] **Privacidad**: el consentimiento para **publicar nombre/usuario de ganadores** ya está en las Bases (se acepta al inscribirse). *(operativo si cambia el texto legal)*

#### Fiscal
- [ ] **Facturación de entradas** y **pago de premios** en regla (monotributo/CUIT, con contador). *(aún no)*
- [ ] **Retención de impuestos** sobre premios, si corresponde. *(agregado)*

#### Producto / técnico
- [x] **Tope por país en playoffs = 5 (regla GENERAL, todos los usuarios).** `MAX_PER_COUNTRY_KNOCKOUT = 5` en `lib/game/config.ts`; `saveLineup` aplica 3 en grupos / 5 en knockout; `/equipo` pasa el cap correcto; texto actualizado en `/como-funciona`.
- [x] **UI completa.** EnrollButton con checkbox de Bases y Condiciones → `createEntryOrder` → checkout MP; retorno `?status=` en `/ligas/[code]` y `/copa`; cupo en vivo (`CupoLive`, polling de `getCopasStatus`); estado "cupos agotados → Instagram" (`CopaSoldOutCard`); landing `/copa`; layout premium del ranking ya existía (`CopaPrizeHeader`).
- [x] **Migración `0014` aplicada** a la DB de prod (aditiva, retrocompatible). *(hecho el 19/06)*
- [x] **Copas seedeadas** en prod (`npm run seed:golden-ticket`): copas 103/104, productos `golden_ticket_1/2`. *(hecho el 19/06)*
- [x] **Cierre de inscripción por tiempo**: `createEntryOrder` y `enrollInLeague` rechazan después del kickoff de 16vos (`isCopaPastDeadline`, `lib/copa/lifecycle.ts`). Acción admin `setCopaStatus` para abrir/cerrar a mano.
- [x] **Overflow / pago-sin-lugar → reembolso**: si se paga sin lugar (carrera por el último cupo) o fuera de término, `enrollInLeague` marca la orden `refunded` + alerta Slack con todos los datos → reembolso manual en MP.
- [x] **Reconciliación de órdenes pagas no inscriptas**: `getOrphanedEntryOrders` + vista en `/admin` (`AdminCopaControls`).
- [x] **Cierre de copa por cupo**: `markCopaFull` pasa la copa llena a `full` (cierra la inscripción). **No** abre otra copa: abrir una Liga II/III es **manual** con `setCopaStatus` (draft → open) desde `/admin`.
- [x] **Desempates**: mejor puntaje en una sola fecha → inscripción más temprana (`getLeagueRanking`). Documentado en Bases y Condiciones.
- [x] **Momento de corte del ranking**: snapshot tras publicar la Final — `snapshotCopaRanking` (admin) congela `leagueMembers.currentRank`.
- [ ] **Merge a `main` + deploy** con build verde. *(aún no)*
- [ ] **Activar los productos `golden_ticket_1/2`** (`active=true`) al go-live (hoy `active=false`). *(operativo)*
- [ ] **MP**: crear el producto/preferencia GOLDEN TICKET en la cuenta real + **probar un pago real end-to-end** (pagar $5.000 → webhook inscribe). El webhook **no llega a localhost**; se prueba en prod. Ojo gotcha test/prod. *(aún no)*
- [~] **Proceso de claim del premio**: **decidido** — pago por **transferencia a CBU/ALIAS** de cuenta bancaria **argentina** a nombre del ganador; verificación = pedir **acceso al mail registrado** del usuario. Ya está en las Bases (`/bases`). Falta solo definir la **ventana de reclamo** y el operativo de pago.
- [ ] **Soporte / disputas**: usar el canal existente `/soporte` (Instagram + email). *(operativo)*
- [ ] **Tener los $400.000 disponibles** para el payout. *(operativo)*

#### Marketing
- [x] **Banner in-app** (home: `CopaHomeBanner`, sutil; `/ligas`: `CopaPromoCard`). Parte técnica lista.
- [x] **Contador de cupo en vivo** in-app (`CupoLive`, polling de `getCopasStatus`). *(en la landing/app)*
- [x] **Link a Bases y Condiciones** in-app (checkout + `/soporte`). *(falta en las piezas de redes)*
- [ ] **Lanzamiento en Instagram + Twitter** (la publicación que **abre** la inscripción). *(no código)*
- [ ] **Creativos + copy** para redes (placas, gráfico de la distribución, premio garantizado + escasez). *(no código)*
- [ ] **Email a ganadores** (DIFERIDO — se construye más adelante): hoy **no hay** setup de envío (solo Slack). Cuando se haga: conseguir mails (¿Clerk?) + proveedor de envío + integración.

---

### 🔢 Orden recomendado de activación (cuando se decida ir) — actualizado 19/06
> El **código y la UI ya están** (migración aplicada, seed corrido). Lo que queda es legal/fiscal/operativo:
1. **Visto legal** (abogado) + cerrar los `[REVISAR CON ABOGADO]` de las Bases.
2. **Fiscal** (contador): facturación de entradas + pago de premios + retenciones.
3. **Merge a `main` + deploy** con build verde (la migración ya está aplicada → seguro).
4. **Activar los productos** `golden_ticket_1/2` (`active=true`).
5. **Crear producto/preferencia en MP** + **smoke-test de pago real** en prod.
6. **Lanzamiento en Instagram/Twitter** (abre inscripción) → cierra al kickoff de 16vos o a los 100.

---

## UI de inscripción (plan) — ✅ EJECUTADO (19/06)

> Esta sección era el **plan** de la UI; **ya está construido** (ver "Estado técnico" arriba).
> Se conserva como referencia de las decisiones de diseño. Cambio respecto del plan: **no se hizo
> `PrizeTable`/tabla de distribución en la UI** (decisión del dueño — `CopaPrizeHeader` sin tabla);
> la distribución vive en `/bases`. Tampoco se hizo `CopaCard.tsx` (se resolvió con
> `CopaPromoCard` + `CopaLeagueRow` + la landing `/copa`).

### ⭐ Decisión de navegación (IMPORTANTE — leer primero)
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

### Qué ya existe (no hay que crearlo)
- **`getGoldenTicketCopas(userId?)`** (`lib/queries.ts`, server component) → lista de copas visibles (no `draft`), cada una con: `code`, `name`, `status`, `capacity`, `enrolled`, `spotsLeft`, `entryFeeArs`, `prizeArs`, `entrySku`, `isEnrolled`. Tipo: `CopaStatus`.
- **`getCopasStatus()`** (`lib/payment-actions.ts`, server action) → mismo payload, para **refrescar el cupo en vivo** (polling).
- **`createEntryOrder(entrySku)`** (`lib/payment-actions.ts`) → crea la orden y devuelve `{ ok, url }` para **redirigir al checkout de MP**. Errores: `"product" | "closed" | "full" | "unavailable"`.
- Webhook de MP ya **inscribe automáticamente** al acreditar el pago (idempotente, control de cupo).
- El **ranking** de la copa ya se ve en `/ligas/[code]` (usa `scoringStartRoundId` → cuenta desde 16vos). Falta solo el **layout premium**.

---

### Superficies a construir

#### 1. Sección Copa dentro de `/ligas` (superficie PRINCIPAL)
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

#### 2. Página `/copa` (landing de campaña + inscripción detallada) — NO en la nav
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

#### 3. Banner in-app
Componente reusable (estilo `welcome-banner.tsx`) en home que lleva a `/copa` (o ancla a la sección de `/ligas`). Visible solo si hay alguna copa `open` con cupo y el usuario **no** está inscripto. Mensaje de premio garantizado + escasez.

#### 4. Layout premium del ranking en `/ligas/[code]`
Cuando la liga es `kind==="golden_ticket"`: header especial con entrada/premio/cupo + **tabla de distribución al top 10** resaltando los puestos premiados. Reusar `LeagueRanking` (`components/domain/LeagueRanking.tsx`) por debajo.

---

### Componentes sugeridos
- `components/copa/CopaPromoCard.tsx` (la card de promo/CTA que se inserta en `/ligas` para no-inscriptos — premio + cupo en vivo + `EnrollButton`).
- `components/copa/CopaLeagueRow.tsx` (la fila premium dorada de la copa inscripta dentro de la lista de `/ligas`, linkea a `/ligas/[code]`).
- `components/copa/CopaCard.tsx` (la versión completa para la landing `/copa`; server-friendly + slot client para el CTA).
- `components/copa/EnrollButton.tsx` (client: llama `createEntryOrder`, maneja loading/errores/redirect). **Reusado en `/ligas` y `/copa`.**
- `components/copa/CupoLive.tsx` (client: polling de `getCopasStatus`). **Reusado en ambas superficies.**
- `components/copa/PrizeTable.tsx` (distribución top 10 — datos en `MONETIZACION.md`).
- Reusar primitivas de `components/editorial` (Eyebrow, PrimaryButton, etc.) y la paleta dorada (capitán/top-3) para el branding "premium".

### Datos de la distribución (top 10)
1°30% · 2°18% · 3°12% · 4°9% · 5°7% · 6°6% · 7°5,25% · 8°4,75% · 9°4,25% · 10°3,75% → $400.000.
(Tabla completa arriba, en la sección "Distribución del premio".)

### Checklist de la UI — ✅ todo hecho
- [x] **Integrar la Copa en `/ligas`**: fila premium dorada (inscripto) + card de promo/CTA (no inscripto). Sin ítem nuevo en la nav.
- [x] `/copa` landing con sus estados (no-inscripto / inscripto / agotado), fuera de la nav.
- [x] EnrollButton → `createEntryOrder` → redirect a MP, con manejo de errores `closed/full/already/unavailable/...`.
- [x] Contador de cupo en vivo (`CupoLive`, polling `getCopasStatus`).
- [x] Manejo de `?status=` de retorno de pago (`/ligas/[code]` y `/copa`).
- [x] Checkbox de Bases y Condiciones (link a `/bases`) obligatorio antes del CTA.
- [x] Banner in-app → `/copa` en la home (`CopaHomeBanner`), solo si hay copa abierta y no estás inscripto.
- [x] Layout premium del ranking en `/ligas/[code]` (`CopaPrizeHeader`).
- [~] **Responsive en mobile**: estructura mobile-first; pendiente una **verificación visual final** con sesión real (el banner solo aparece logueado + copa abierta + no inscripto).
