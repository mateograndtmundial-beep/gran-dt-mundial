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

---

## Checklist para salir LIVE

### TL;DR del estado
- **Backend: hecho y verde** (schema, inscripción/cobro por MP, webhook que inscribe,
  ranking desde 16vos, cupo, 5 cambios gratis para inscriptos, seed). Tests + build pasan.
- **Falta para LIVE:** UI completa, visto legal + bases y condiciones, proceso fiscal,
  cierre de inscripción por tiempo, manejo de overflow/reembolso, y el deploy en orden.
- **"Mañana" es ajustado:** las rocas grandes (legal, UI, fiscal) no son código rápido.

---

### ✅ Decisiones tomadas (cerradas)
- Entrada **$5.000**, premio **fijo garantizado $400.000** al **top 10** (lo pone la casa, no es pozo).
- **Cupo 100** por copa. **2 copas iguales**: una `open`, la `#2` en `draft` (se habilita manual si la 1ra llena).
- Arranca y rankea desde **16vos** (`scoringStartRoundId`). Un equipo por usuario.
- Cobro por **Mercado Pago**, alta automática por **webhook** (reusa infra de pines).
- En 16vos, **5 cambios gratis solo para inscriptos** (premium conservan su pack). ✅ implementado.
- **Inscripción abre** con la **primera publicación en Instagram** (y quizás Twitter).
- **Inscripción cierra** con el **kickoff de los 16vos** **o** al llegar a **100 inscriptos** (lo que pase primero).
- **Payout manual:** publicamos ganadores en **Instagram + mail**; los ganadores se comunican con nosotros para cobrar.
- **Ligas de 100, premio fijo $400.000** (no se balancea en ligas chicas: bajo ~80 pagos pierden plata). Se llena una y se abre la siguiente.
- **Escalado por oleadas:** oleada **16vos** (cierra 28/06); si quedan muchos interesados, se abre una **nueva copa que arranca en 8vos** (cierra en el kickoff de 8vos → más días para llenarla). **Cierre de inscripciones manual/discrecional** (el cupo 100 frena cada liga sola).
- **`MAX_PER_COUNTRY` en 16avos** (`lib/actions.ts`): Quiero que el tope de 3 jugadores por país se libere desde 16avos (32 selecciones vivas) y pase a 5 jugadores por pais. Este tope de 5 por pais ya permite tener equipos 100% funcionales hasta la ultima instancia (4 selecciones vivas. 20 jugadores posibles sobre 15 totales.). El anterior de 3, no.

---

### 🔴 Pendiente — agrupado por área

#### Legal (bloqueante real)
- [ ] **Visto de un abogado** antes de cobrar (entrada + premio en plata puede ser juego regulado). *(aún no)*
- [ ] **Bases y Condiciones**: redactar el documento + publicarlo + **linkearlo en toda comunicación y en el checkout** (aceptación obligatoria antes de pagar). *(aún no — es legal y de confianza a la vez)*
- [ ] **Privacidad**: consentimiento para **publicar nombre/usuario de ganadores** en redes (lo pide la mecánica de payout). *(agregado)*

#### Fiscal
- [ ] **Facturación de entradas** y **pago de premios** en regla (monotributo/CUIT, con contador). *(aún no)*
- [ ] **Retención de impuestos** sobre premios, si corresponde. *(agregado)*

#### Producto / técnico
- [ ] **Tope por país en playoffs = 5 (regla GENERAL, aplica a TODOS los usuarios, no solo la Copa).** Hoy (`lib/actions.ts:77`) el tope de **3 por país rige solo en grupos** y en playoffs queda **sin límite**. Cambiarlo: desde **16vos** (`round.type === "knockout"`, order ≥ 4, 32 selecciones vivas) el tope pasa a **5 por país** (en vez de ilimitado). Razón: 5 por país ya permite equipos 100% funcionales hasta la última instancia (4 selecciones vivas → 20 jugadores posibles sobre 15 titulares+suplentes); con 3 no alcanzaba. Implica: `MAX_PER_COUNTRY_KNOCKOUT = 5` en `lib/game/config.ts`, aplicar el cap también en la rama `knockout` de `saveLineup`, mensaje de error con el `max` correcto, y **aclararlo en `/como-funciona`** (la regla la ve cualquier usuario, no es exclusiva de la Copa). *(agregado — decisión cerrada)*
- [ ] **UI completa** (ver sección **"UI de inscripción (plan)"** más abajo, en este mismo doc): inscripción, cupo en vivo, layout premium del ranking. *(scaffold dejado como plan, sin construir)*
- [ ] **Aplicar migración `0014` a la DB de prod ANTES de deployar.** Si se mergea sin esto, `/equipo` y `saveLineup` se rompen para **todos** (consultan `leagues.kind`). La migración tiene `DEFAULT` → aplicarla sola es inocua y retrocompatible. *(aún no)*
- [ ] **Merge a `main` + deploy** con build verde. *(aún no)*
- [ ] **Seedear copas** en prod: `npm run seed:golden-ticket` (necesita admin + torneo seedeado). *(aún no)*
- [ ] **MP**: crear el producto/preferencia GOLDEN TICKET en la cuenta real + **probar un pago real end-to-end** (pagar $5.000 → webhook inscribe). El webhook **no llega a localhost**; se prueba en prod. Ojo gotcha test/prod. *(aún no)*
- [ ] **Cierre de inscripción por tiempo**: hoy **no se cierra solo**. `createEntryOrder` valida `status === "open"` y cupo, pero **nadie pasa la copa a `closed` al kickoff de 16vos**. Falta un mecanismo (cron o acción admin) que la cierre al deadline. *(agregado — la decisión 7 lo exige)*
- [ ] **Overflow / pago-sin-lugar**: `createEntryOrder` chequea cupo al crear la orden, pero la inscripción final ocurre en el **webhook** (`creditOrder`). Dos personas pueden pasar el check, pagar, y superar 100 → `creditOrder` rechaza al que sobra **pero ya pagó**. Definir: ¿reembolso al que quedó afuera? ¿lista de espera? Hoy "sin reembolso" choca con este caso. *(agregado — importante)*
- [ ] **Reconciliación de órdenes pagas no inscriptas**: detectar y resolver órdenes `paid` que no inscribieron (cupo lleno, error). *(agregado)*
- [ ] **Activación de copas (misma oleada):** la copa #2 ya está seedeada en `draft`; falta la acción admin/script para `draft → open` cuando la anterior llene. *(agregado)*
- [ ] **Copas de oleada 8vos:** el seed actual crea copas que arrancan en **16vos** (`scoringStartRoundId = r16`). Una copa que arranque en **8vos** (order 5) necesita seedearse con ese `scoringStartRoundId` y su deadline en el kickoff de 8vos. **Falta parametrizar el seed** para generar copas por oleada. *(agregado — decisión: si quedan interesados al 28/06, se abre oleada 8vos)*
- [ ] **Desempates** para los puestos del premio (top 10): definir criterio si dos equipos terminan con los mismos puntos. *(agregado)*
- [ ] **Momento de corte del ranking** para premiar (snapshot tras la final). *(agregado)*
- [ ] **Reembolsos / contracargos** de MP: política y manejo operativo. *(aún no)*
- [ ] **Proceso de claim del premio**: ventana para reclamar, **verificación de identidad** (que el usuario de IG/mail = titular de la cuenta) antes de transferir plata. *(agregado — KYC mínimo)*
- [ ] **Soporte / disputas** para usuarios que pagaron (canal y SLA). *(agregado)*
- [ ] **Tener los $400.000 disponibles** para el payout. *(operativo)*

#### Marketing
- [ ] **Banner in-app** que lleve a la inscripción (parte técnica de la UI). *(decisión: sí)*
- [ ] **Lanzamiento en Instagram + Twitter** (la publicación que **abre** la inscripción). *(decisión: sí)*
- [ ] **Email**: evaluar como posibilidad (hoy **no hay** setup de envío de mails; solo notificaciones a Slack). Si se hace, hay que: conseguir los mails (¿vía Clerk?), elegir proveedor de envío, e integrarlo. *(decisión: "puede llegar a ser" → desarrollar como posibilidad)*
- [ ] **Creativos + copy**: placas para redes, gráfico de la **distribución al top 10**, mensaje de premio **garantizado** (no pozo) y de **escasez** (cupo 100, contador en vivo). *(agregado)*
- [ ] **Contador de cupo en vivo** en la comunicación/landing (`getCopasStatus` ya lo soporta). *(agregado)*
- [ ] **Link a Bases y Condiciones** en todas las piezas. *(agregado)*

---

### 🔢 Orden recomendado de activación (cuando se decida ir)
1. Visto legal + Bases y Condiciones publicadas.
2. Resolver fiscal (contador) + overflow/reembolso + cierre por tiempo (código).
3. Construir la UI (inscripción + ranking premium + banner).
4. Aplicar migración `0014` a prod → **después** deploy/merge a `main`.
5. Seedear copas (`seed:golden-ticket`) + crear producto en MP + smoke-test de pago real.
6. Lanzamiento en Instagram/Twitter (abre inscripción) → cierra al kickoff de 16vos o a los 100.

> ⚠️ El paso 4 es de seguridad de deploy: la migración **antes** que el código, o se rompe el armador para todos.

---

## UI de inscripción (plan)

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
1°30% · 2°18% · 3°12% · 4°9% · 5°7% · 6°6% · 7°5% · 8°5% · 9°4% · 10°4% → $400.000.
(Tabla completa en `MONETIZACION.md`.)

### Checklist de la UI
- [ ] **Integrar la Copa en `/ligas`** (superficie principal): copa inscripta como fila premium dorada + card de promo/CTA para no-inscriptos. **Sin sumar ítem a la nav.**
- [ ] `/copa` con CopaCard y sus estados (no-inscripto / inscripto / cerrada / llena / unavailable) — landing de campaña, **fuera de la nav**.
- [ ] EnrollButton → `createEntryOrder` → redirect a MP; manejo de errores `closed/full/unavailable/product`. Reusado en `/ligas` y `/copa`.
- [ ] Contador de cupo en vivo (polling `getCopasStatus`).
- [ ] Manejo de `?status=` de retorno de pago (en `/copa` y, si se permite el flujo, en `/ligas`).
- [ ] Checkbox de Bases y Condiciones (cuando exista el doc).
- [ ] Banner in-app → `/copa` (solo si hay copa abierta y el usuario no está inscripto).
- [ ] Layout premium del ranking en `/ligas/[code]`.
- [ ] **Responsive verificado en mobile** (320px → desktop), sin scroll horizontal.
