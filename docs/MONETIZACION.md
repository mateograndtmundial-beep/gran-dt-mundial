# Copa GOLDEN TICKET — alineación rápida

> Doc para que **el compañero** entienda la propuesta: decisiones tomadas, grises
> abiertos y los **riesgos que estamos asumiendo a conciencia**. Hoy 18/06; **16vos
> arranca ~28/06** (ventana para lanzar).
>
> Se trabaja en la rama `feat/copa-golden-ticket`; se mergea a `main` cuando lo decidamos.

## La idea en 3 líneas
**Copa GOLDEN TICKET** = liga de **cupo fijo (máx. 100)**, **entrada $5.000**, **premio
FIJO garantizado de $400.000** repartido entre los **10 primeros**. Arranca en **16vos**,
se compite con el **equipo de siempre** (1 por usuario). El premio lo **pone la casa**
(no es un pozo redistribuido) y es el **mismo monto jueguen 30 o 100**.

> ⚠️ **Cambio respecto a la versión anterior:** ya **no** es "100% del pozo repartido".
> Ahora el premio es un **monto fijo garantizado** ($400k) → **la casa asume el riesgo**.
> El ingreso real del negocio sigue siendo **la venta de pines** que la competencia
> dispara (rearmar en instancias finales cuesta pines); la entrada es secundaria.

---

## Modelo económico (entender SÍ o SÍ)
Entrada $5.000 · premio fijo $400.000 · cupo máx 100. **Break-even = 80 inscriptos.**
Arriba de 80 hay margen para la casa; **abajo, la diferencia la pone la casa.**

| Inscriptos | Recauda | Premio | Resultado casa |
|---|---|---|---|
| 100 (lleno) | $500.000 | $400.000 | **+$100.000** 🟢 |
| 80 | $400.000 | $400.000 | $0 |
| 56 | $280.000 | $400.000 | **−$120.000** 🔴 |
| 30 | $150.000 | $400.000 | **−$250.000** 🔴 |

> El **mínimo de inscriptos** que definamos para que la copa arranque = **nuestro tope
> de pérdida**. Por debajo de ese mínimo, la copa se cancela y se reembolsa (a definir).

---

## Decisiones tomadas
1. **Premio fijo garantizado $400.000**, lo pone la casa (NO pozo redistribuido). Jueguen
   30 o 100, el premio es el mismo. *(Riesgo de bolsillo asumido a conciencia.)*
2. **Entrada $5.000.**
3. **Cupo fijo: máx. 100 personas** por copa.
4. **Premio al top 10**, repartido (distribución propuesta abajo, a confirmar).
5. **Dos copas IGUALES.** Una activa; la segunda se **habilita manualmente** si la primera
   llena los 100. Misma entrada/premio/cupo. La **estructura queda lista desde el arranque**
   aunque la segunda no se use.
6. **Arranca en 16vos.** Rankea los puntos del equipo **desde 16vos en adelante** (lo de
   grupos no cuenta). → técnicamente: `leagues.scoringStartRoundId` apuntando a 16vos
   (la infra de ranking-desde-una-ronda **ya existe** y está probada en prod).
7. **Un equipo por usuario.** Es solo un **ranking sobre el equipo actual**, no un equipo nuevo.
8. **Cobro por Mercado Pago**, producto **"GOLDEN TICKET"** (es el nombre real del torneo,
   sin disfraz). *(Riesgo MP asumido — ver Riesgos.)*
9. **16vos: 4 cambios gratis para todos** (los premium conservan su pack ilimitado), para
   emparejar cuentas nuevas y viejas en la entrada a la Copa. Se reinician al arrancar la
   fecha (no se acumulan). *(Heredado de la propuesta anterior; sigue vigente. Hoy
   `FREE_CHANGES_PER_ROUND = 1` es constante global → hay que volverla por-ronda.)*

---

## Distribución del premio (PROPUESTA — a confirmar)
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

> "El 1° se lleva $120.000 (24× su entrada); 10 de cada 100 cobran" vende bien.

---

## Grises a resolver
- **Mínimo de inscriptos + qué pasa si no se llega** (¿se cancela y se reembolsa?). Define
  el **tope de pérdida**.
- **Distribución exacta** (la de arriba es propuesta).
- **Alta tras el pago**: ¿automática vía webhook MP (ya existe para pines) o manual?
- **Cómo se muestra en la app** (ver abajo).

---

## ⚠️ Riesgos que asumimos a conciencia
Esto NO es para frenar el proyecto — es para que quede por escrito en qué nos estamos
metiendo. Decisión de negocio tomada con los ojos abiertos.

1. **Mercado Pago — congelamiento.** Cobrar entradas de un torneo por plata va contra los
   términos de MP, **independientemente del nombre del producto**. MP detecta por **patrón**
   (100 cobros iguales de $5.000, un contracargo, una denuncia de un usuario), no por el
   nombre del SKU. Si lo detectan pueden **congelar la cuenta con la plata de los inscriptos
   adentro** → se cae la **venta de pines** (el ingreso real). El nombre transparente no
   reduce este riesgo; solo evita el agravante de "ocultamiento".
2. **Legal / regulatorio.** Entrada en plata + premio en plata puede **encuadrarse como
   apuesta/juego regulado** (competencia provincial en Argentina; posibles consecuencias más
   allá de lo fiscal). **Requiere el visto de un abogado ANTES de cobrarle a nadie.** Hoy NO
   está resuelto — "no eludimos ninguna ley" es justo lo que el abogado tiene que confirmar.
3. **Riesgo de bolsillo.** Premio fijo garantizado = la casa pone la diferencia si no se
   llena (hasta −$250k con 30 inscriptos). Acotado por el **mínimo** que definamos.
4. **Asimetría cuenta nueva vs. vieja** (mitigada por la decisión 9, no eliminada del todo) +
   algo de **pay-to-win** del premium dentro de una liga con plata.

---

## Cómo mostrarlo en la app (a pensar)
- _(pendiente — definir entrada/sección, copy, cómo se ve el cupo en vivo y el ranking de la Copa)_

---

## Resumen
- **Copa GOLDEN TICKET** en **16vos**, **cupo máx 100**, **2 copas iguales** (1 activa + 1 de
  reserva manual), **entrada $5.000**, **premio FIJO garantizado $400.000** al **top 10**.
- **No es pozo**: el premio lo pone la casa → **riesgo de bolsillo** por debajo de 80 inscriptos.
- **El negocio son los pines**, no la entrada (la Copa los dispara).
- **Cobro por MP** (producto GOLDEN TICKET) — **riesgo MP y legal asumidos**; el legal hay que
  cerrarlo con abogado antes de cobrar.
- En 16vos, **4 cambios gratis para todos** (premium conservan ventaja).
- **A definir:** mínimo de inscriptos (tope de pérdida), distribución exacta, alta auto/manual, UI.
</content>
</invoke>
