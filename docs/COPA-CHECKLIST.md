# Copa GOLDEN TICKET — checklist para salir LIVE

> **Archivo guía de la feature de ligas premium.** Estado vivo de lo que falta
> definir/hacer para que la Copa GOLDEN TICKET salga a producción. Vive en la rama
> `feat/copa-golden-ticket`.
>
> Doc de propuesta y decisiones de negocio: [`MONETIZACION.md`](./MONETIZACION.md).
> Plan de la UI de inscripción: [`COPA-UI-INSCRIPCION-PLAN.md`](./COPA-UI-INSCRIPCION-PLAN.md).
> Plan de comunicación en redes: [`social/LANZAMIENTO-COPA.md`](./social/LANZAMIENTO-COPA.md).
>
> Fecha clave: **16vos arranca ~28/06** (la Copa rankea desde ahí).

---

## TL;DR del estado
- **Backend: hecho y verde** (schema, inscripción/cobro por MP, webhook que inscribe,
  ranking desde 16vos, cupo, 5 cambios gratis para inscriptos, seed). Tests + build pasan.
- **Falta para LIVE:** UI completa, visto legal + bases y condiciones, proceso fiscal,
  cierre de inscripción por tiempo, manejo de overflow/reembolso, y el deploy en orden.
- **"Mañana" es ajustado:** las rocas grandes (legal, UI, fiscal) no son código rápido.

---

## ✅ Decisiones tomadas (cerradas)
- Entrada **$5.000**, premio **fijo garantizado $400.000** al **top 10** (lo pone la casa, no es pozo).
- **Cupo 100** por copa. **2 copas iguales**: una `open`, la `#2` en `draft` (se habilita manual si la 1ra llena).
- Arranca y rankea desde **16vos** (`scoringStartRoundId`). Un equipo por usuario.
- Cobro por **Mercado Pago**, alta automática por **webhook** (reusa infra de pines).
- En 16vos, **5 cambios gratis solo para inscriptos** (premium conservan su pack). ✅ implementado.
- **Inscripción abre** con la **primera publicación en Instagram** (y quizás Twitter).
- **Inscripción cierra** con el **kickoff de los 16vos** **o** al llegar a **100 inscriptos** (lo que pase primero).
- **Payout manual:** publicamos ganadores en **Instagram + mail**; los ganadores se comunican con nosotros para cobrar.

---

## 🔴 Pendiente — agrupado por área

### Legal (bloqueante real)
- [ ] **Visto de un abogado** antes de cobrar (entrada + premio en plata puede ser juego regulado). *(aún no)*
- [ ] **Bases y Condiciones**: redactar el documento + publicarlo + **linkearlo en toda comunicación y en el checkout** (aceptación obligatoria antes de pagar). *(aún no — es legal y de confianza a la vez)*
- [ ] **Privacidad**: consentimiento para **publicar nombre/usuario de ganadores** en redes (lo pide la mecánica de payout). *(agregado)*

### Fiscal
- [ ] **Facturación de entradas** y **pago de premios** en regla (monotributo/CUIT, con contador). *(aún no)*
- [ ] **Retención de impuestos** sobre premios, si corresponde. *(agregado)*

### Producto / técnico
- [ ] **UI completa** (ver [`COPA-UI-INSCRIPCION-PLAN.md`](./COPA-UI-INSCRIPCION-PLAN.md)): inscripción, cupo en vivo, layout premium del ranking. *(scaffold dejado como plan, sin construir)*
- [ ] **Aplicar migración `0014` a la DB de prod ANTES de deployar.** Si se mergea sin esto, `/equipo` y `saveLineup` se rompen para **todos** (consultan `leagues.kind`). La migración tiene `DEFAULT` → aplicarla sola es inocua y retrocompatible. *(aún no)*
- [ ] **Merge a `main` + deploy** con build verde. *(aún no)*
- [ ] **Seedear copas** en prod: `npm run seed:golden-ticket` (necesita admin + torneo seedeado). *(aún no)*
- [ ] **MP**: crear el producto/preferencia GOLDEN TICKET en la cuenta real + **probar un pago real end-to-end** (pagar $5.000 → webhook inscribe). El webhook **no llega a localhost**; se prueba en prod. Ojo gotcha test/prod. *(aún no)*
- [ ] **Cierre de inscripción por tiempo**: hoy **no se cierra solo**. `createEntryOrder` valida `status === "open"` y cupo, pero **nadie pasa la copa a `closed` al kickoff de 16vos**. Falta un mecanismo (cron o acción admin) que la cierre al deadline. *(agregado — la decisión 7 lo exige)*
- [ ] **Overflow / pago-sin-lugar**: `createEntryOrder` chequea cupo al crear la orden, pero la inscripción final ocurre en el **webhook** (`creditOrder`). Dos personas pueden pasar el check, pagar, y superar 100 → `creditOrder` rechaza al que sobra **pero ya pagó**. Definir: ¿reembolso al que quedó afuera? ¿lista de espera? Hoy "sin reembolso" choca con este caso. *(agregado — importante)*
- [ ] **Reconciliación de órdenes pagas no inscriptas**: detectar y resolver órdenes `paid` que no inscribieron (cupo lleno, error). *(agregado)*
- [ ] **Activación de la copa #2**: definir el trigger (manual) y la acción admin/script para pasar `draft → open` cuando la 1ra llene. *(agregado)*
- [ ] **Desempates** para los puestos del premio (top 10): definir criterio si dos equipos terminan con los mismos puntos. *(agregado)*
- [ ] **Momento de corte del ranking** para premiar (snapshot tras la final). *(agregado)*
- [ ] **Reembolsos / contracargos** de MP: política y manejo operativo. *(aún no)*
- [ ] **Proceso de claim del premio**: ventana para reclamar, **verificación de identidad** (que el usuario de IG/mail = titular de la cuenta) antes de transferir plata. *(agregado — KYC mínimo)*
- [ ] **Soporte / disputas** para usuarios que pagaron (canal y SLA). *(agregado)*
- [ ] **Tener los $400.000 disponibles** para el payout. *(operativo)*

### Marketing
- [ ] **Banner in-app** que lleve a la inscripción (parte técnica de la UI). *(decisión: sí)*
- [ ] **Lanzamiento en Instagram + Twitter** (la publicación que **abre** la inscripción). *(decisión: sí)*
- [ ] **Email**: evaluar como posibilidad (hoy **no hay** setup de envío de mails; solo notificaciones a Slack). Si se hace, hay que: conseguir los mails (¿vía Clerk?), elegir proveedor de envío, e integrarlo. *(decisión: "puede llegar a ser" → desarrollar como posibilidad)*
- [ ] **Creativos + copy**: placas para redes, gráfico de la **distribución al top 10**, mensaje de premio **garantizado** (no pozo) y de **escasez** (cupo 100, contador en vivo). *(agregado)*
- [ ] **Contador de cupo en vivo** en la comunicación/landing (`getCopasStatus` ya lo soporta). *(agregado)*
- [ ] **Link a Bases y Condiciones** en todas las piezas. *(agregado)*

---

## 🔢 Orden recomendado de activación (cuando se decida ir)
1. Visto legal + Bases y Condiciones publicadas.
2. Resolver fiscal (contador) + overflow/reembolso + cierre por tiempo (código).
3. Construir la UI (inscripción + ranking premium + banner).
4. Aplicar migración `0014` a prod → **después** deploy/merge a `main`.
5. Seedear copas (`seed:golden-ticket`) + crear producto en MP + smoke-test de pago real.
6. Lanzamiento en Instagram/Twitter (abre inscripción) → cierra al kickoff de 16vos o a los 100.

> ⚠️ El paso 4 es de seguridad de deploy: la migración **antes** que el código, o se rompe el armador para todos.
