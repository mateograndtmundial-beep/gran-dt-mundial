# Plan de comunicación en redes — Lanzamiento Liga Premium

**Qué es este doc:** el playbook de redes para **llenar la Liga Premium** (la liga paga del juego):
qué publicar, cuándo y con qué mensaje, más las **placas y captions listas para usar**. El producto
en sí (reglas, cupo, premio, cobro, estado técnico) vive en
[`../MONETIZACION.md`](../MONETIZACION.md) — este doc es solo el marketing.

**La oferta, en una línea:** cupo **100**, entrada **$5.000**, premio **fijo $400.000 garantizado**
al **top 10**; se juega con tu equipo de siempre y rankea **desde los 16vos** hasta la final.

**Cómo usar este doc (orden de lectura sugerido):**
1. **§7 — Calendario:** qué pieza sale cada día.
2. **ANEXO A — Las 9 piezas:** ángulo, slides y cómo regenerar la placa de cada una.
3. **ANEXO B — Captions:** el texto listo para copiar y pegar al publicar.
4. Las §1–§6 son la **estrategia** (presupuesto, cadencia, ángulo, anatomía de cada pieza); leelas
   una vez para entender el porqué.

**Nombre:** de cara al usuario la feature es **Liga Premium**. "GOLDEN TICKET" aparece **solo** en
el checkout de Mercado Pago (rótulo del cobro), para no explicitar que es una liga paga. En este doc
"copa" se usa como sinónimo casual de Liga Premium.

> 📐 Voz y diseño de las placas: [`COPY-VOICE.md`](./COPY-VOICE.md), [`FORMATS.md`](./FORMATS.md),
> [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md), [`PLACAS-GUIDELINES.md`](./PLACAS-GUIDELINES.md).

---

## ⚠️ Antes de publicar nada (gating)
La **primera publicación abre la inscripción**, así que **antes** de subirla tienen que estar listos:
1. **Visto legal + Bases y Condiciones publicadas** (link obligatorio en todas las piezas).
2. **UI `/copa`** funcionando (inscripción + cupo en vivo) y **producto GOLDEN TICKET en MP** probado con un pago real.
3. Migración aplicada + copa seedeada en prod (ver checklist).

Si esto no está, el plan no arranca: mandarías tráfico a una inscripción que no existe.

---

## 0. La idea central: una copa es el objetivo; escalar es discrecional
**El objetivo comprometido de esta campaña es llenar UNA copa de 100 personas.** Eso es lo que se
promociona y lo que se planea. Todo lo demás —abrir más ligas premium— es **discrecional**: lo
vamos viendo sobre la marcha según cuánta gente atraigamos.

> **Plan base:** $100k para llenar la **Copa #1** (100 lugares). **Después se evalúa** abrir otra.
> Solo se abre una copa nueva si **quedan días suficientes Y hay confianza de poder llenarla**.
> Si faltan **horas** y habría que llenar una liga entera, **no se abre**. Cubrimos cupos **de a
> 100**, sin compromiso anticipado con la segunda.

Por qué es lo correcto:
- **Riesgo controlado**: cada copa nueva suma **$400k de premio garantizado** que la casa cubre si
  no se llena. Abrir otra **solo con la anterior llena + tiempo + confianza** de-riesgea la garantía
  (la copa llena ya dejó +$100k de margen que respalda la decisión).
- **Eficiencia**: no comprometés plata para llenar lugares que tal vez ni abras.
- **Decisión, no automatismo**: el tramo 2 **no se dispara solo**; es una llamada que hacés mirando
  los días que quedan y el ritmo real.

⚠️ **Límites de "ir abriendo más" que hay que tener en cuenta:**
- **Solo hay 2 copas seedeadas** (`seed:golden-ticket` crea #1 `open` + #2 `draft`). Una **3ra+
  copa requiere seedear más** (pendiente en el checklist).
- **El deadline 28/06 acota la oleada 16vos**: una copa abierta a horas del cierre **no se llena** →
  regla "días + confianza, nunca horas". Si al cerrar el 28/06 **quedan muchos interesados**, se
  abre una **nueva copa de oleada 8vos** (arranca/cierra más tarde → más tiempo para llenarla).
  Ver §1.5 (decidido).

---

## 1. Modelo de tramos (cómo se libera la plata)

| Tramo | Monto | Se activa cuando… | Qué financia |
|---|---|---|---|
| **Tramo 1** | **$100.000** | Al lanzar (23/06) | Promoción de la **Copa #1**. |
| **Tramo 2** | **$100.000** | Copa #1 **llena (o ~80%+ con ritmo claro)** y **quedan días útiles** | Habilitar (`draft→open`) y promocionar la **Copa #2**. |
| **Tramo 3+** | **$100.000** c/u | Idem, copa anterior llena + días | Requiere **seedear más copas** + definir si arrancan más tarde (octavos). |

**Regla de oro:** un tramo nuevo se libera **solo si** (a) la copa anterior llenó y (b) hay tiempo
real para llenar la siguiente antes de su cierre. Si no se cumplen las dos, **no se libera** (la
plata no gastada queda disponible, no es una pérdida).

### Reparto de cada $100.000 (por copa)
| Partida | $ | % | Por qué |
|---|---|---|---|
| **Retargeting Meta** (visitantes del sitio, engagers IG/FB, jugadores) | $45.000 | 45% | **Mejor ROI**: público que ya te conoce. |
| **Prospecting Meta** (lookalike de jugadores + interés fútbol/fantasy AR) | $35.000 | 35% | Llena la copa **y** suma jugadores nuevos (LTV de pines). |
| **Empuje final 48 h** (Meta, conversión) | $15.000 | 15% | La escasez convierte: reservar para la recta final de esa copa. |
| **Test X/Twitter (opcional)** | $5.000 | 5% | Solo para medir; X orgánico es el plan real (§6). |

> **CPA de referencia:** $100.000 / 100 lugares = **$1.000 por inscripto** si gastaras todo el
> tramo (no lo vas a gastar entero: el orgánico llena buena parte). $1.000 de CPA sobre una entrada
> de $5.000 es sano — y aún más si lo medís por el **LTV de pines**, no solo la entrada.

---

## 1.5 Tamaño de liga y escalado por oleadas
**Ligas de 100, premio fijo $400.000.** Se descartó balancear la demanda en N ligas parejas (ej.
220 → 3 de ~73): con premio fijo, **cada liga por debajo de ~80 pagos pierde plata** (break-even
80), así que 3 ligas de 73 darían **−$100.000**. Ligas de 100 dejan **+$100.000** cada una. Como
el tamaño es fijo, **no hace falta** el "pool"/reparto al cierre: se llena una liga y, **si se
decide**, se abre otra **a mano** (el backend NO abre la siguiente solo: al llenarse, cierra la
inscripción y muestra "agotado").

**Escalado por oleadas (según round de arranque):**

| Oleada | Copas | Arranca / rankea desde | Inscripción cierra | Cuándo se abre |
|---|---|---|---|---|
| **1 (16vos)** | #1 (+ #2 reserva manual) | **16vos** (order 4) | **kickoff de 16vos = 28/06** | Al llegar a 100 se cierra. Abrir la #2 es **manual** (admin), no automático. |
| **2 (8vos)** | nuevas | **8vos de Final** (order 5) | **kickoff de 8vos** (unos días después) | **Si al cerrar la oleada 1 quedan muchos interesados.** |

- **Por qué oleadas:** una liga que arranca en 8vos **cierra en el kickoff de 8vos** → da **más días
  para llenarla**. Resuelve el caso "quedan interesados pero ya no hay tiempo antes del 28/06".
- **Cierre de inscripciones = manual/discrecional.** El cupo de 100 frena cada liga sola; **abrir
  una nueva (misma oleada u oleada siguiente) lo decidís vos** mirando demanda y días restantes.
- **Hook de marketing** (escasez real, sin prometer una 2da copa automática): **"son 100 lugares y
  nada más; cuando se llena, se cierra"**. Si después se decide abrir otra, se comunica aparte.
- **El usuario ve a sus rivales recién al kickoff** → no le molesta en qué liga puntual quedó
  mientras tanto; la inscripción es a "la Copa", la liga concreta es detalle interno.

> **Dependencia técnica para la oleada 8vos:** el seed hoy crea 2 copas que arrancan en **16vos**
> (`scoringStartRoundId = r16`). Una copa de **oleada 8vos** necesita `scoringStartRoundId = 8vos`
> (order 5) y su deadline en el kickoff de 8vos → **seedear copas nuevas con ese parámetro**.
> Anotado en el checklist.

---

## 1.6 Ángulo central de comunicación: surfear el furor de los prodes
**Estamos en el pico del Mundial y todo el mundo está en algún prode.** Es el comportamiento
caliente del momento: grupos de WhatsApp, planillas de Excel, quinielas de oficina. **No competimos
contra el prode: lo usamos como rampa de entrada.** El prode es el lenguaje que la gente ya entiende
→ lo agarramos y mostramos que la Copa es "el prode, pero en serio".

**El gancho:** *"El prode lo gana la suerte. La Liga Premium, los que saben de fútbol."*

> ⚠️ **Premisa correcta:** el prode **no termina** en fase de grupos — corrés predicciones de todo
> el torneo. El contraste real (y siempre verdadero) es **suerte vs. skill**: en el prode adivinás
> resultados; en la Liga Premium armás y dirigís tu equipo. No usar ganchos del tipo "el prode se te
> termina" / "tu prode ya está liquidado" (son falsos).

| | **Prode / quiniela típica** | **Liga Premium** |
|---|---|---|
| Cómo ganás | Adivinar resultados (**suerte**) | Armás y dirigís tu equipo (**skill**, dura todo el Mundial) |
| Pago del premio | Lo que junten — y **a veces no se paga** (el que organiza desaparece) | **$400.000 asegurados, se reparten sí o sí** (nadie se baja) |
| Confianza | "¿el que organiza va a pagar?" | Premio garantizado + **Bases y Condiciones** |
| Duración | Se define rápido / se pincha | **Hasta la final** |
| Entrada | Informal | **$5.000**, transparente |

> ⚠️ **No vender "premio fijo, no pozo" como ventaja.** Un pozo de 100×$5.000 = **$500.000**, **mayor**
> que los $400.000 → comparar por ahí es perder. El diferencial real es doble: **se paga seguro**
> (nadie se baja, garantizado + B&C) **y es skill** (estrategia + criterio de presupuesto, no azar).
> Nunca "lo pone la casa". (Aplicado en la publicación #4.)

**Mensajes-rampa (usar en HERO y stories):**
- *"En el prode adivinás resultados. Acá armás y dirigís tu equipo."*
- *"Cansado de que el del prode después no aparezca? Acá el premio se reparte sí o sí: $400.000 asegurados."*
- *"El prode es de suerte. Esto es de los que saben de fútbol."*
- *"Dejá de adivinar resultados. Armá tu equipo y jugá por $400.000 hasta la final."*

**Cómo se aplica sin friccionar:**
- **Posiciona, no insulta:** el que está en un prode es nuestro público ideal, no el enemigo. Tono
  cómplice ("vos que ya estás jugando…"), nunca despectivo con el prode del grupo de amigos.
- **Aprovechá el momento de dolor:** cuando a alguien el prode se le va al descenso por pura suerte
  (un rebote, un penal en contra, un resultado insólito), es **el mejor momento** para decir "acá no
  dependés de la suerte: armás tu equipo y el premio está garantizado". El calendario (§7) lo explota
  en la fase de Educación/Prueba.
- **Retargeting fútbol/fantasy:** el público de prospecting (§1) se solapa con quien busca prodes →
  el ángulo mejora el CTR de esa partida.

> Cuidado legal: el encuadre "prode pero en serio" no debe prometer nada que no esté en las **Bases y
> Condiciones**; el premio se comunica siempre como **garantizado y repartido sí o sí** (no pozo de
> los inscriptos, se reparte aunque no se llenen los 100), que es justo lo que nos diferencia del
> prode. **No usar el rótulo "lo pone la casa"** (es obvio que sale de las entradas). Ver checklist (legal).

---

## 2. ¿Cuántas publicaciones por día?
Ya subís **2 carruseles de puntajes/día** (uno por grupo). **No los toques como motor de
contenido** — son tu alcance orgánico gratis. La Copa se monta encima así:

| Tipo | Cadencia | Para qué |
|---|---|---|
| **Scoreboards (ya existen)** | 2/día | Mantener el alcance. **Agregar CTA de la Copa** en el caption + 1 slide final "Sumate a la Copa". |
| **Post dedicado de la Copa (feed)** | **1/día** | Una pieza por día con un ángulo distinto (calendario §7). |
| **Stories** | **3–5/día** (ramp a 6 en las últimas 48 h) | Recordatorio, cupo en vivo, countdown, redirección al post. |

**No más de 1 post dedicado/día en feed** (en condiciones normales): más que eso fatiga y compite con
tus propios scoreboards. La frecuencia alta va por **stories**, donde el público caliente convierte.

> ⚠️ **Excepción — 24, 25 y 26/06 llevan 2 piezas cada uno:** con el lanzamiento el **23/06 a la
> noche** (#1 solo) y el cierre fijo el 28/06, las 9 piezas entran duplicando esos tres días.
> Mitigá la fatiga **espaciando** las dos piezas del día (una a la mañana, otra a la tarde/noche,
> ~8 h de diferencia) — así no compiten por alcance entre sí. El **27/06** y el **28/06** vuelven a
> 1 pieza. Si igual satura, **#6 (jugar gratis) es la sacrificable** (a stories o post-28/06).

---

## 3. Stories: ¿solo redirección o contenido propio?
**Ambas, pero el grueso es contenido propio.** Son tu mejor superficie para un público que ya te
sigue (link sticker + countdown + encuestas). Mezcla diaria sugerida:
- **1 redirección** al post del día ("mirá esto 👆 / deslizá").
- **1 countdown sticker** a 28/06 (urgencia automática).
- **1 de cupo en vivo** ("quedan X de 100" — `getCopasStatus` da el dato). **Es la pieza clave del
  modelo escalonado**: el cupo llenándose es la mejor prueba social y dispara el tramo siguiente.
- **1 de engagement** (encuesta/quiz).
- **1 con link sticker directo a `/copa`** (conversión pura).

---

## 4. ¿Pocas muy promocionadas o varias poco promocionadas?
**Pocas piezas HERO muy respaldadas + muchas piezas orgánicas (gratis).**
- **Pauta** concentrada en **2–3 creativos HERO** por copa (premio garantizado / cómo funciona /
  escasez-cupo). Concentrar da **datos limpios** y evita diluir un tramo ya chico ($100k).
- **Orgánico** variado y diario (calendario §7): muchos ángulos, costo $0.

| Alternativa | Ventajas | Desventajas |
|---|---|---|
| **Pocas muy promocionadas** | Aprendizaje rápido del algoritmo, mensaje claro, fácil de medir. | **Riesgo de fatiga** en audiencia chica. |
| **Muchas poco promocionadas** | Variedad, menos fatiga. | Presupuesto diluido, el algoritmo no optimiza, difícil de leer. |
| **Híbrido (recomendado)** | Pauta enfocada (hero) + variedad orgánica gratis. | Requiere disciplina: no promocionar todo "un poco". |

**Mitigación de fatiga** (clave con público chico + tramo chico): rotá 2–3 creativos en el mismo
conjunto y **capá la frecuencia** (~2–3 impresiones/persona/semana).

---

## 5. Instagram vs Twitter (X): ¿pauta 50/50?
**No 50/50.** Para **pauta de conversión**, la decisión real es **Meta (IG+FB) vs X**, y **Meta
gana claro** para fantasy fútbol AR/LatAm: mejor targeting, retargeting, objetivo de conversión y
placement de Stories. X Ads en Argentina rinde flojo para respuesta directa.

| Red | Rol | % de pauta | Por qué |
|---|---|---|---|
| **Meta (Instagram + Facebook)** | **Motor de conversión** | **~90%** | Donde está tu audiencia y tus herramientas. IG y FB comparten Ads Manager → corrés ambos placements de una. |
| **X / Twitter** | **Amplificador orgánico en tiempo real** | **~0–10%** (casi todo orgánico) | Hilos durante los partidos + **tweet fijado** con el link. Pauta solo como test chico. |

→ **Instagram es el pilar; Twitter acompaña orgánico.** **No 50/50** (sería regalar plata a la red
que peor convierte acá).

---

## 6. Qué debe tener CADA pieza (anatomía obligatoria)
Toda publicación/aviso de la Copa, sin excepción, lleva:
1. **La oferta clara**: premio **FIJO $400.000 garantizado** al **top 10** (no es pozo; **se reparte sí o sí, aunque no se llenen los 100**).
2. **Entrada $5.000.**
3. **Escasez**: **cupo 100** (y, cuando aplique, "quedan X").
4. **Deadline**: **cierra el 28/06** (kickoff de 16vos) o al llenarse.
5. **CTA + dónde**: "Sumate en los11desampa.com/copa" (link en bio IG / clickeable en FB/stories/X).
6. **Cómo funciona en 1 línea**: "jugás con tu equipo de siempre, rankea desde 16vos".
7. **Confianza**: el premio **se reparte sí o sí**.
8. **Legal**: link a **Bases y Condiciones**.
9. **Un gancho de engagement** (pregunta/encuesta).
10. **Marca consistente** (paleta dorada premium, Archivo Black — ver `VISUAL-SYSTEM.md`).
11. **Cuando aplique, el ángulo "prode pero en serio"** (§1.6) como hook de apertura: conecta con lo
    que la gente ya está haciendo y resalta el diferencial (premio garantizado vs. el prode que no paga).

> Como hay plata real, cuidá el "sin reembolso" y el encuadre del premio → que coincida con las
> **Bases y Condiciones** (riesgo legal, ver checklist).

---

## 7. Calendario día por día (23/06 → 28/06) — Copa #1 (ventana comprimida)
Fases: **Lanzamiento → Educación/Prueba → Escasez → Último llamado.** Cada día = scoreboards de
siempre (con CTA Copa) + post(s) dedicado(s) + stories. Como el lanzamiento real es el **23/06 a la
noche** y el cierre (28/06) es fijo, las **9 piezas** entran en ~5 días **duplicando 24, 25 y 26**
(mañana + tarde). Las piezas de countdown (#7/#8/#9) quedan ancladas a fecha exacta. **El tramo 2
(Copa #2, si se decide abrir a mano) reusa este calendario comprimido** según los días que queden.

| Día | Fecha | Fase | Post(s) dedicado(s) | Stories | Pauta (Tramo 1) |
|---|---|---|---|---|---|
| **D-5** | 23/06 (noche) | 🚀 Lanzamiento | **#1 HERO — "Llegó la Liga Premium"**: lanzamiento (antes gratis entre amigos → ahora por premios). Premio $400k al top 10, cupo 100, entrada $5.000, abre HOY, **desde 16vos**, te sumás **hasta 28/06**. | Anuncio + countdown + link a `/copa` | **Activar retargeting + prospecting** (HERO 1) |
| **D-4** | 24/06 (**2 piezas**) | Educación/Acción + Prueba | **#2 Cómo entrás (3 pasos)** (mañana): armá gratis → entrá a /copa ($5.000) → rankeás desde 16vos por $400.000 (**+ bonus: 5 cambios gratis en 16vos al entrar**); remite al fijado *¿Qué es?*. **+ #3 La distribución del premio** (tarde): gráfico top 10 (1°=$120k…). | Los 3 pasos + link al fijado · Desglose del premio + link | Sigue HERO 1 a retargeting + prospecting |
| **D-3** | 25/06 (**2 piezas**) | Confianza + General | **#4 "El premio se reparte sí o sí"** (mañana): anti-objeción "¿es real?" — repartimos los $400.000 aunque no se llenen los 100 + B&C. **+ #6 "Jugá gratis con amigos"** (tarde, general): capta jugador nuevo. | Q&A / FAQ · Liga con amigos | Cortar el creativo que peor convierte |
| **D-2** | 26/06 (**2 piezas**) | Escasez + Urgencia | **#5 Cupo en vivo** (mañana): "Ya se anotaron X. Quedan Y de 100." **+ #7 "Faltan 2 días"** (tarde): recordatorio fuerte con deadline (26→28 = 2 días). | Cupo en vivo + countdown | Subir al mejor creativo · **empuje final 48 h** |
| **D-1** | 27/06 | Urgencia | **#8 "Última chance, cierra mañana"**. | Cupo + countdown | Máximo del empuje 48 h |
| **D-0** | 28/06 (mañana) | 🔔 Último llamado | **#9 "CIERRA HOY antes del primer partido"**. | Cuenta regresiva por horas | Última pauta corta; cortar al cerrar |

> **#6 (general / jugar gratis) es la pieza flexible:** si los días dobles saturan, moverla a
> stories o correrla *después* del 28/06 (el juego gratis sigue) sin afectar la secuencia premium.

**Reusá tu tooling**: las placas de la Copa siguen `VISUAL-SYSTEM.md`; el gráfico de premio y el
contador de cupo pueden ser plantillas nuevas en `assets/`. Captions con la voz de `COPY-VOICE.md`.

---

## 8. Métricas y la regla que dispara el tramo siguiente
- **Ritmo objetivo por copa**: 100 inscriptos en los días disponibles. Para la #1 (~5 días, con el lanzamiento el 23/06 a la noche) ≈ **20/día**.
- **Gatillo del Tramo 2**: Copa #1 **llena (o ~80%+ con ritmo sostenido)** **y** quedan **≥ 3–4 días
  útiles** antes del 28/06 → liberás $100k, hacés `draft→open` la Copa #2 y arrancás su calendario.
- **Si NO se cumple el gatillo**: no liberás (la plata queda; cero pérdida). Si la #1 va lenta,
  reforzás escasez sobre la #1 en vez de abrir una segunda.
- **KPIs**: lugares ocupados/día por copa, **CPA** (techo de referencia $1.000), link taps en
  stories, % inscriptos retargeting vs prospecting, ritmo vs días restantes.
- **Decisión de escala**: cada copa nueva = **+$400k de garantía**. Abrí la siguiente solo con la
  anterior llena, porque ese margen (+$100k) respalda el riesgo de la nueva.

---

## 9. Resumen de decisiones recomendadas
- **Ángulo central**: **surfear el furor de los prodes** (§1.6) — "el prode pero en serio": skill vs. suerte, dura todo el Mundial, premio **garantizado y repartido sí o sí** (no el prode que no paga). Rampa de entrada, no rival. **Excepción:** la **publicación #1 abre con ángulo de lanzamiento** ("llegó la Liga Premium", antes gratis entre amigos → ahora por premios), no con el prode.
- **Objetivo**: llenar **1 copa de 100**. Abrir más es **discrecional** (días + confianza, **nunca con horas**).
- **Budget**: **escalonado, $100k por copa**, liberado por demanda (no $300k de entrada). Sobra → no se gasta / financia la copa siguiente.
- **Tamaño de liga**: **ligas de 100, premio fijo $400k** (decidido). Se descartó balancear en ligas chicas (pierden plata bajo 80). Hook: "cada 100 → otra copa de $400k".
- **Escalado por oleadas**: oleada 16vos (cierra 28/06); si quedan interesados, **nueva copa que arranca en 8vos** (cierra más tarde → más tiempo). Cierre de inscripciones manual/discrecional.
- **Posts/día**: 2 scoreboards (con CTA Copa) + **1 post dedicado** + **3–5 stories**.
- **Stories**: contenido propio (countdown, **cupo en vivo**, engagement) **+** algo de redirección.
- **Pauta**: por tramo de $100k → **retargeting (45%) > prospecting (35%) > empuje final (15%) > X test (5%)**.
- **Pocas vs muchas**: **híbrido** — 2–3 creativos HERO pauteados + orgánico variado gratis.
- **Red**: **~90% Meta (IG+FB) / 10% X opcional**; X sobre todo **orgánico**. **No 50/50.**
- **Todo gateado** a que B&C + `/copa` + MP estén live antes del primer post.

---

## ANEXO A — Las 9 publicaciones de IG, una por una

### Nombre público y prode (recordatorio)
- **Nombre público: Liga Premium.** "GOLDEN TICKET" **no** aparece nunca en copy público — es solo
  el rótulo del cobro en Mercado Pago.
- **Ángulo madre: "el prode, pero en serio"** (`LANZAMIENTO-COPA.md` §1.6). El prode es la rampa de
  entrada, no el rival: tono cómplice con quien ya está en uno, nunca despectivo.

### Objetivo de cada pieza (leyenda)
- **🏆 Liga Premium** — convertir a la inscripción paga (entrada $5.000, premio $400.000).
- **🎮 General** — captar **jugador nuevo gratis** (registro + armar equipo). Alimenta la Liga
  Premium: para entrar hay que ser jugador (1 equipo por usuario), así que sumar jugadores gratis
  agranda el público al que después le vendés la Liga Premium.
- **🏆🎮 Ambos** — abre el general pero mantiene el hilo premium.

---

### Tabla resumen

| # | Día · Fecha | Fase | Ángulo | Objetivo | CTA principal |
|---|---|---|---|---|---|
| 1 | D-5 · 23/06 (mar, noche) | 🚀 Lanzamiento | "Llegó la Liga Premium" — antes gratis entre amigos, ahora por premios (desde 16vos, hasta 28/06) | 🏆 Liga Premium | Sumate: los11desampa.com/copa |
| 2 | D-4 · 24/06 (mié, mañana) | Educación/Acción | Cómo entrás a la Liga Premium (en 3 pasos; paso 1 gratis; **+ 5 cambios gratis en 16vos**) | 🏆🎮 Ambos | Armá tu equipo / Entrá a la Copa |
| 3 | D-4 · 24/06 (mié, tarde) | Educación/Prueba | La distribución del premio (top 10, transparente) | 🏆 Liga Premium | Anotate antes que se llene |
| 4 | D-3 · 25/06 (jue, mañana) | Confianza | "El premio se reparte sí o sí" (aunque no se llenen los 100) | 🏆 Liga Premium | Sumate con confianza |
| 6 | D-3 · 25/06 (jue, tarde) | Prueba/General | "Jugá gratis con tus amigos" (el prode del grupo, bien hecho) | 🎮 General | Creá tu liga con amigos |
| 5 | D-2 · 26/06 (vie, mañana) | Escasez | Cupo en vivo: quedan Y de 100 | 🏆 Liga Premium | Asegurá tu lugar |
| 7 | D-2 · 26/06 (vie, tarde) | Urgencia | "Faltan 2 días" | 🏆 Liga Premium | Entrá antes del cierre |
| 8 | D-1 · 27/06 (sáb) | Urgencia | "Última chance, cierra mañana" | 🏆 Liga Premium | Último día para anotarte |
| 9 | D-0 · 28/06 (dom, mañana) | 🔔 Último llamado | "Cierra HOY" + jugá gratis igual | 🏆🎮 Ambos | Cierra hoy / Jugá gratis igual |

> **Orden de publicación:** 23 → #1 · 24 → #2 (mañana) + #3 (tarde) · 25 → #4 (mañana) + #6 (tarde) ·
> 26 → #5 (mañana) + #7 (tarde) · 27 → #8 · 28 → #9. La tabla está ordenada por número de pieza, no
> por fecha de salida.
>
> **Reparto de objetivos:** los posts **6 y 9** abren a usuario general (jugar gratis) y el **2**
> (cómo entrás) tiene el **primer paso gratis** como rampa; el resto sostiene el foco premium. El
> **1** (lanzamiento) y el **4** (confianza) usan el contraste con el prode; el **3** (premio) y el
> **6** (amigos) lo rozan suave. La idea: que la campaña **también** deje jugadores nuevos gratis
> (LTV de pines), no solo inscriptos.

---

### 1 · D-5 · martes 23/06 (a la noche) — 🚀 Lanzamiento (HERO 1)
> **Nota de cadencia:** lanzamiento real **martes 23/06 a la noche**, sale **solo**. Como el cierre
> (28/06) es fijo, los días **24, 25 y 26 llevan 2 piezas** cada uno para no descartar ninguna. **No
> hay que regenerar esta placa**: el slide dice "Abre HOY" (sigue siendo cierto) y "cierra 28/06"
> (sin cambios).
**Objetivo:** 🏆 Liga Premium. **Ángulo LANZAMIENTO** (no se abre "de base" con el prode): se
presenta la Liga Premium como algo **nuevo**. Hasta ahora se jugaba **gratis entre amigos**; ahora
llega la posibilidad de **competir por premios** y **demostrar quién sabe de verdad**. Le habla a
todo el jugador actual + al futbolero que viene siguiendo el Mundial.
**Formato:** carrusel 4 slides — `scripts/generate-copa-1.ts` → `out/copa-1/copa-1_01..04.png`.

**Slides (idea de cada uno):**
1. **Portada / lanzamiento:** "**Llegó la Liga Premium.**" + "Hasta ahora jugabas gratis con tus
   amigos. Ahora competís **por premios de verdad** y demostrás quién sabe más de fútbol." Deja
   claro **ya en slide 1**: **rankea desde 16vos** y **te sumás hasta el 28/06**. Caja dorada
   $400.000. Fondo claro premium, Archivo Black.
2. **La oferta:** "$400.000 al top 10. Entrada $5.000. Cupo 100. Abre HOY." + "Premiamos al top 10,
   desde $120.000 el 1°. Es **fijo**: repartimos los $400.000 completos **aunque no se llenen los 100**."
3. **Cómo se juega:** "**Sos el DT.** Armás (15 figuras + DT con presupuesto) y **dirigís** —cada
   fecha hacés cambios, no es un equipo fijo—. **Rankea desde 16vos, hasta la final.** El que mejor
   arma y dirige, gana."
4. **CTA + confianza:** "El premio **se reparte sí o sí**. Repartimos los $400.000 al top 10 aunque
   no se llenen los 100. Con **Bases y Condiciones**. Cierra el 28/06 o al llenar los 100.
   Sumate: los11desampa.com/copa."

**Caption:** lista para copiar tal cual en el **ANEXO B (#1)** (al final del doc).

**Idea que transmite:** llegó algo nuevo y en serio — lo que jugabas gratis entre amigos ahora se
juega por premios, y acá se demuestra **quién sabe de verdad**.
**Por qué:** es la pieza que **abre la inscripción**; tiene que dejar la oferta cristalina, posicionar
la Liga Premium como **lanzamiento** (no como "otro prode") y plantar desde el slide 1 los dos datos
que destraban la decisión (**desde 16vos**, **hay tiempo hasta el 28/06**). Activa retargeting +
prospecting (HERO 1).
**Cuidados:** primera persona (**premiamos / repartimos**); premio siempre como **garantizado y
repartido aunque no se llene el cupo** (no es pozo) — **sin** usar el rótulo "lo pone la casa". Link
a B&C sí o sí.

**Regenerar:** `npx tsx scripts/generate-copa-1.ts` (las imágenes van a `out/copa-1/`, gitignored).

---

### 2 · D-4 · miércoles 24/06 (a la mañana) — Cómo entrás a la Liga Premium (en 3 pasos)
**Objetivo:** 🏆🎮 Ambos. **Primer carrusel del día doble (24/06, a la mañana)** — al día siguiente
del lanzamiento: explica **cómo se entra**, no "qué es" (eso ya lo cubre el carrusel **fijado *¿Qué
es?***). El **paso 1 es gratis** (armar el equipo), así que también capta jugador nuevo; el paso 2 es
la inscripción paga. Le habla al que vio el lanzamiento anoche y se pregunta "¿y cómo me sumo?".
**Formato:** carrusel 4 slides (pasos), generado: `scripts/generate-copa-2.ts` → `out/copa-2/copa-2_01..04.png`.
**Diseño:** cada slide lleva una **figura** (sin texto suelto): roadmap de 3 nodos → cancha
real con figuritas (reusa el tooling de `generate-que-es.ts`) → "ticket" de entrada → bracket
16vos→Final + bloque de premio.

**Slides:**
1. **Portada + roadmap:** "¿Cómo entrás?" + los **3 pasos como nodos** (Armá » Entrá » Jugá) y chip
   "¿No sabés cómo se juega? Mirá el carrusel fijado *¿Qué es?*". Íconos **Lucide** (no dibujados a mano).
2. **Paso 1 — Armá tu equipo (gratis):** badge **GRATIS** + **cancha real** (15 figuras + DT,
   presupuesto 700M, 5M–150M) **+ el banco** (4 suplentes + DT) abajo. Equipo distinto al de *¿Qué es?*
   (Kane, Rodríguez, Rodri, Diomande, Kimmich, Perisic…). "Entrás a los11desampa.com. No cuesta nada."
3. **Paso 2 — Entrá a la Copa ($5.000):** figura de **ticket** dorado + stats (entrada $5.000 · cupo
   100 · cierra 28/06). "Desde los11desampa.com/copa asegurás tu lugar."
4. **Paso 3 — Jugá por $400.000:** **bracket** 16vos→Final (rankea toda la ruta) + bloque $400.000
   "se reparte sí o sí". "Quedás rankeado desde 16vos hasta la final. El que mejor dirige, gana."
   **Bonus de inscripción** (chip dorado): al entrar a la Copa, **arrancás los 16vos con 5 cambios
   gratis** para rearmar tu equipo (vs. 1 normal). Pensado para quien ya tiene equipo de grupos; el
   que recién arma ya edita libre.

**Regenerar:** `npx tsx scripts/generate-copa-2.ts` (las imágenes van a `out/copa-2/`, gitignored).

**Caption:** lista para copiar tal cual en el **ANEXO B (#2)** (al final del doc). Incluye la línea
de **bonus de 5 cambios** en 16vos.

**Idea que transmite:** entrar es simple y rápido — armás (gratis), pagás la entrada, jugás por la plata.
**Por qué:** convierte la curiosidad del lanzamiento en acción concreta (mata la fricción del "¿cómo
me anoto?") y aprovecha el primer paso gratis para sumar jugadores nuevos. Va la **mañana del 24/06**
(primer carrusel del día doble), capitalizando el envión de la apertura.
**Cuidados:** dejar claro que el **paso 1 es gratis** y el **2 es pago**; primera persona; link a B&C.

---

### 3 · D-4 · miércoles 24/06 (a la tarde/noche) — Educación/Prueba: la distribución del premio
> **Nota de cadencia:** **segundo carrusel del día doble (24/06)**, ~8 h después del #2, para meter
> las 9 piezas en la ventana comprimida sin descartar ninguna. El 27 y 28/06 vuelven a 1 post/día.

**Objetivo:** 🏆 Liga Premium. Le habla al interesado que duda "¿y cuánto se lleva cada uno?".
**Formato:** carrusel 3 slides, generado: `scripts/generate-copa-3.ts` → `out/copa-3/copa-3_01..03.png`.
**Diseño:** figura por slide: **podio top-3** (portada) → **gráfico de barras del top 10**
(transparencia) → CTA. Montos cableados desde `docs/MONETIZACION.md` (fuente de verdad).

**Slides:**
1. **Portada (podio):** "$400.000 no se lo lleva uno solo. Premiamos al top 10." + podio 1°/2°/3°
   ($120.000 / $72.000 / $48.000).
2. **El gráfico (top 10):** barras proporcionales — 1° $120.000 · 2° $72.000 · 3° $48.000 ·
   4° $36.000 · 5° $28.000 · 6° $24.000 · 7° $21.000 · 8° $19.000 · 9° $17.000 · 10° $15.000
   (total $400.000 / 100%).
3. **CTA:** "Entrar al top 10 ya paga" — premio fijo se reparte sí o sí, entrada $5.000, cupo 100,
   cierra 28/06. los11desampa.com/copa.

**Regenerar:** `npx tsx scripts/generate-copa-3.ts` (las imágenes van a `out/copa-3/`, gitignored).

**Caption:** lista para copiar tal cual en el **ANEXO B (#3)** (al final del doc).

**Idea que transmite:** el premio es real, repartido y transparente — entrar al top 10 (no solo
ganar) ya paga.
**Por qué:** amplía la sensación de "alcanzable" (10 ganadores, no 1) y combate la objeción
"seguro gana siempre el mismo". Material limpio para pauta (HERO "premio").
**Cuidados:** los montos tienen que coincidir EXACTO con `MONETIZACION.md` y las B&C.

---

### 4 · D-3 · jueves 25/06 (a la mañana) — Por qué la Liga Premium (no el prode del grupo)
**Objetivo:** 🏆 Liga Premium. Le habla al que ya está en un prode del laburo/amigos: por qué jugar
esto en serio. **Dos pilares** (NO "premio fijo vs pozo" — ver Cuidados): **(1) es skill** —
estrategia, no adivinar: elegís jugadores con criterio de presupuesto y te medís con los mejores; y
**(2) se paga seguro** — nadie se baja a mitad de camino, premio garantizado con B&C.
**Formato:** carrusel 3 slides, generado: `scripts/generate-copa-4.ts` → `out/copa-4/copa-4_01..03.png`.
**Diseño:** figura por slide: **2 pilares** (portada) → **plantel real + barra de
presupuesto** (estrategia/criterio) → confianza + CTA.

**Slides:**
1. **Portada:** "Es más que un prode" + las **2 razones** como pilares (ES SKILL · SE PAGA).
2. **Razón 1 — es estrategia, no suerte:** chips de plantel (Messi, Haaland, Kane, Rodri, Hakimi) +
   **barra de presupuesto** (usaste 698,2M / tope 700M → "armaste el mejor 11 sin pasarte") + "hay que
   tener criterio" + "te medís con los mejores DT".
3. **Razón 2 — se paga seguro:** "acá nadie se baja" — premio garantizado (se reparte sí o sí, con
   B&C) · nadie se borra (cupo de 100 que pagaron) · entrada $5.000/cupo 100/cierra 28/06 + CTA.

**Regenerar:** `npx tsx scripts/generate-copa-4.ts` (las imágenes van a `out/copa-4/`, gitignored).

**Caption:** lista para copiar tal cual en el **ANEXO B (#4)** (al final del doc).

**Idea que transmite:** la Liga Premium es **más divertida y más seria** que el prode: se gana por
saber (estrategia + presupuesto, no azar) y la plata **está asegurada** (nadie se baja).
**Por qué:** combina los dos motivos reales de elegirla — **skill/diversión** y **seguridad de
cobro** —, sin caer en el ángulo equivocado del "premio fijo".
**Cuidados:** **NO** venderlo como "premio fijo, no pozo": un pozo de 100×$5.000 = $500.000 sería
**mayor** que los $400.000 → es desventaja, no ventaja. El diferencial es **se paga seguro** (nadie se
baja) **+ es skill** (no azar). No usar "lo pone la casa"; primera persona; no insultar al prode.

---

### 5 · D-2 · viernes 26/06 (a la mañana) — Escasez: cupo en vivo
**Objetivo:** 🏆 Liga Premium. Le habla al indeciso ("lo pienso") — la escasez lo empuja.
**Formato:** carrusel 2 slides, generado: `scripts/generate-copa-5.ts` → `out/copa-5/copa-5_01..02.png`.
**Diseño:** figura hero: **grilla de 100 lugares** (ocupados
en dorado / libres en blanco) → el cupo finito se ve de un vistazo.

> ⚠️ **El número es REAL.** Antes de publicar, sacá los anotados de `getCopasStatus` y regenerá con
> `--enrolled <N>`. El default es solo para previsualizar (el script avisa por consola). Nunca inflar.

**Slides:**
1. **Cupo en vivo:** "Quedan **[Y] de 100**" + grilla de 100 (ocupados/libres) + "ya entraron [X]".
2. **CTA:** "El que entra, juega por **$400.000**" — se cierra al llenarse / o el 28/06 / entrada $5.000.

**Regenerar:** `npx tsx scripts/generate-copa-5.ts --enrolled <N>` (real de `getCopasStatus`; `out/copa-5/`, gitignored).

**Caption:** lista para copiar en el **ANEXO B (#5)** (al final del doc). Completar `[Y]` con el
dato real de `getCopasStatus` antes de publicar.

**Idea que transmite:** los lugares son reales y finitos — si lo pensás mucho, te quedás afuera.
**Por qué:** primer empujón de escasez con dato real; el cupo llenándose es la mejor prueba social
y, según el modelo de tramos, dispara la decisión de abrir la copa #2. Acá se chequea el gatillo
del Tramo 2 (`LANZAMIENTO-COPA.md` §8).
**Cuidados:** el número tiene que ser **real** (sacado de `getCopasStatus`), nunca inflado.

---

### 6 · D-3 · jueves 25/06 (a la tarde) — Prueba/General: "jugá gratis con tus amigos"
**Objetivo:** 🎮 General. Le habla al que no quiere pagar pero sí quiere competir con su grupo.
**Formato:** carrusel 3 slides, generado: `scripts/generate-copa-6.ts` → `out/copa-6/copa-6_01..03.png`.
**Diseño:** como es del **modo gratis**, el footer es **general** (`los11desampa.com`,
tag "Jugá gratis"), **no** `/COPA`. Figura por slide: **mockup de chat** del grupo (portada) → **3
pasos + mini-ranking** de liga privada en vivo → puente **gratis vs Premium** + CTA.

**Slides:**
1. **Portada (mockup de chat):** "Tu grupo ya tiene su liga." + chat del grupo ("Los pibes del
   fútbol") con burbuja dorada que comparte el **código de liga** (7K2Q9P). "Sin planillas, sin
   perseguir a nadie. Y es gratis."
2. **Cómo (3 pasos + tabla):** "El prode del grupo, bien hecho." + pasos Creá » Pasá el código »
   Compiten + **mini-ranking** de la liga privada (corona en el 1°, fila "VOS" resaltada).
3. **Puente premium:** dos opciones — **GRATIS** (liga con amigos, $0) vs **$400.000** (Liga
   Premium si suben la apuesta) + CTA "Armá la liga del grupo, gratis · los11desampa.com".

**Regenerar:** `npx tsx scripts/generate-copa-6.ts` (las imágenes van a `out/copa-6/`, gitignored).

**Caption:** lista para copiar tal cual en el **ANEXO B (#6)** (al final del doc).

**Idea que transmite:** el corazón gratis del juego es jugar con tu grupo — sin fricción, mejor que
el prode casero.
**Por qué:** **captación pura de usuario general** (el "etiquetá a 3" es viralidad orgánica), y cada
jugador nuevo es un potencial inscripto de Liga Premium más adelante. Da aire al pitch premium
constante de la semana.
**Cuidados:** ninguno legal (es el modo gratis); cuidar no opacar que la Liga Premium sigue abierta.

---

### 7 · D-2 · viernes 26/06 (a la tarde) — Urgencia: "faltan 2 días"
**Objetivo:** 🏆 Liga Premium. Le habla al interesado tibio que venía postergando.
**Formato:** carrusel 2 slides, generado: `scripts/generate-copa-7.ts` → `out/copa-7/copa-7_01..02.png`.
**Diseño:** figura por slide: **countdown** (numeral gigante
"2 DÍAS" + timeline VIE 26 / SÁB 27 / DOM 28 cierra) → **cupo en vivo (barra)** + recap oferta + CTA.

> ⚠️ **El cupo es REAL.** Igual que la #5: sacá los anotados de `getCopasStatus` y regenerá con
> `--enrolled <N>` antes de publicar (el default es solo para previsualizar; el script avisa). Nunca inflar.

**Slides:**
1. **Portada (countdown):** "Faltan **2 días**." + cuenta regresiva al cierre (timeline de los últimos
   días, 28/06 marcado en dorado). "La inscripción cierra el 28/06, antes de 16vos. No hay repechaje."
2. **Cupo + recap:** "Quedan **[Y]** lugares" + **barra de cupo** (X/100, %) + recap ($400.000 al top
   10 / entrada $5.000 / cierra 28/06) + CTA "Entrá antes del cierre".

**Regenerar:** `npx tsx scripts/generate-copa-7.ts --enrolled <N>` (real de `getCopasStatus`; `out/copa-7/`, gitignored).

**Caption:** lista para copiar en el **ANEXO B (#7)** (al final del doc). Completar `[Y]` con el
dato real de `getCopasStatus` antes de publicar.

**Idea que transmite:** la ventana se cierra; postergar = quedar afuera.
**Por qué:** arranca el empuje final de 48 h (donde se concentra parte de la pauta). Combina deadline
+ cupo para doble urgencia.
**Cuidados:** la fecha de cierre debe ser la real (kickoff de 16vos); link a B&C.

---

### 8 · D-1 · sábado 27/06 — Urgencia: "última chance, cierra mañana"
**Objetivo:** 🏆 Liga Premium. Le habla al que ya decidió pero no se anotó todavía.
**Formato:** carrusel 2 slides, generado: `scripts/generate-copa-8.ts` → `out/copa-8/copa-8_01..02.png`.
**Diseño:** más intensa que la #7 (rojo dominante). Figura por
slide: hero **"1 DÍA"** (anillo gigante dorado + campanita + recap de la oferta) → cupo en vivo (barra) + CTA.

> ⚠️ **El cupo es REAL.** Igual que la #5/#7: sacá los anotados de `getCopasStatus` y regenerá con
> `--enrolled <N>` antes de publicar (el default es solo para previsualizar; el script avisa). Nunca inflar.

**Slides:**
1. **Portada (hero "1 día"):** "Cierra **MAÑANA**." + anillo gigante **1 DÍA** "para entrar" + recap
   ($400.000 al top 10 · [Y] de 100 libres · entrada $5.000). "No se reabre."
2. **Cupo + CTA:** "Entrá hoy, mañana no." + **barra de cupo** (X/100, %) + recap (no se reabre /
   $400.000 / entrada $5.000) + CTA "Último día para anotarte".

**Regenerar:** `npx tsx scripts/generate-copa-8.ts --enrolled <N>` (real de `getCopasStatus`; `out/copa-8/`, gitignored).

**Caption:** lista para copiar en el **ANEXO B (#8)** (al final del doc). Completar `[Y]` con el
dato real de `getCopasStatus` antes de publicar.

**Idea que transmite:** es literalmente el último llamado útil — decidir hoy.
**Por qué:** pico del empuje de 48 h; el "etiquetá al indeciso" suma alcance y trae rezagados. Máxima
escasez antes del cierre.
**Cuidados:** no exagerar el cupo; mantener coherencia con el número real.

---

### 9 · D-0 · domingo 28/06 (a la mañana) — 🔔 Último llamado + rescate al general
**Objetivo:** 🏆🎮 Ambos. Cierra la Liga Premium **a la mañana** y, para los que no llegaron, los
invita a jugar **gratis** igual (no perder el lead).
**Formato:** carrusel 2 slides, generado: `scripts/generate-copa-9.ts` → `out/copa-9/copa-9_01..02.png`.
**Diseño:** cada slide cambia de **footer/acento**: s1 premium
(`/COPA`, rojo/dorado) → s2 general gratis (`los11desampa.com`, "Jugá gratis", verde). El puente lo
arma la barra inferior de la s1 ("¿No llegás a la Premium? Igual jugás gratis").

> ⚠️ **El cupo es REAL.** Igual que la #5/#7/#8: regenerá con `--enrolled <N>` de `getCopasStatus`
> antes de publicar (default solo para previsualizar; el script avisa). Nunca inflar.
>
> ⚠️ **Operativo:** una vez **cerrada la inscripción**, frenar el CTA de pago (slide 1 / footer
> `/COPA`); a partir de ahí dejar solo el de **jugar gratis** (slide 2). Cerrar también la pauta.

**Slides:**
1. **Portada (cierra hoy):** "**CIERRA HOY**." + hero dark "**ÚLTIMAS HORAS** para jugar por $400.000"
   (campanita roja) + recap ($400.000 / [Y] de 100 libres / $5.000). Footer premium `/COPA`.
2. **Rescate (gratis):** "Jugá **gratis** igual." + 3 cards verdes (armá tu 11 gratis / ranking global
   / liga con amigos) + CTA "La pelota no espera · los11desampa.com". Footer general "Jugá gratis".

**Regenerar:** `npx tsx scripts/generate-copa-9.ts --enrolled <N>` (real de `getCopasStatus`; `out/copa-9/`, gitignored).

**Caption:** lista para copiar en el **ANEXO B (#9)** (al final del doc). Una vez cerrada la
inscripción, editar la caption quitando el CTA de pago (dejar solo el de jugar gratis).

**Idea que transmite:** se acabó el tiempo de la Premium — pero el juego (gratis) sigue para todos.
**Por qué:** exprime las últimas horas de inscripción **y** convierte el cierre en captación general,
para que el tráfico del día final no se desperdicie (quien no paga hoy, queda como jugador y futuro
inscripto de la oleada 8vos). Cerrar la pauta al cierre de inscripción.
**Cuidados:** una vez cerrada la inscripción, **frenar** el CTA de pago; dejar solo el de jugar gratis.

---

### Publicación ANCLADA #1 — "¿Qué es Los 11 de Sampa?" (evergreen)
**Diseño:** carrusel **explicativo de 7 placas diseñadas** (sin screenshots) en
`out/que-es/que-es_01..07.png` (1080×1350), creado con `scripts/generate-que-es.ts` (mismo render
que los scoreboards; cancha con el equipo real "Jogo Bonito", chips Panini, banderas de
`flags.json`). Diseño de cada slide: cableado en el propio generador. Guía: [`PLACAS-GUIDELINES.md`](./PLACAS-GUIDELINES.md).

**Objetivo:** 🎮 General (evergreen, sin fecha). Responde **"¿qué es?"** y explica ~80% del juego;
es lo primero que ve un desconocido que cae al perfil. **No vende** la Liga Premium, pero la slide 7
**teasea** que "desde 16vos se vienen premios".

**Las 7 slides:** 1) Portada "¿Qué es?" · 2) La idea ("sos el DT") · 3) Armá tu plantel (cancha +
presupuesto 700M + banco) · 4) Cómo sumás puntos (gol por puesto, valla, figura, lo que resta, DT) ·
5) Capitán (duplica) y banco (auto-sustitución) · 6) 8 fechas + "sumate cuando quieras" · 7) Competí
(ranking + ligas) + teaser de premios + CTA.

**Caption:**
> 🏆 ¿Qué es Los 11 de Sampa? El fantasy del Mundial 2026. Te lo explicamos en 1 minuto 👇
>
> Sos el DT: armás un equipo con 15 figuras reales del Mundial + un técnico, con un presupuesto.
> Elegís formación y capitán, y sumás puntos por lo que tus jugadores hacen DE VERDAD en la cancha
> —goles (valen más si los mete un defensor 👀), asistencias, vallas invictas, la figura—. El capitán
> duplica, y si un titular no juega entra tu suplente solo.
>
> Dura todo el Mundial. Y aunque ya arrancó, **todavía estás a tiempo**: te sumás cuando quieras y
> competís desde la fecha que elijas, en el ranking global y en tu liga privada con amigos. Gratis.
>
> 👀 Y atento: desde los 16vos se vienen sorpresas con premios.
>
> Armá tu 11 en los11desampa.com (link en bio) ⚽ — ¿con qué 9 arrancás? 👇
>
> #Mundial2026 #WorldCup2026 #Los11DeSampa #FantasyFutbol #DT #FutbolArgentina

**Regenerar:** `npx tsx scripts/generate-que-es.ts` (las imágenes van a `out/que-es/`, gitignored).

---

### Notas de uso
- **Reusá el tooling:** las placas siguen `VISUAL-SYSTEM.md`; el gráfico de premio (#3) y el contador
  de cupo (#5, #7, #8) pueden ser plantillas nuevas en `assets/`. Captions con la voz de
  `COPY-VOICE.md`.
- **Apoyate en esquemas/figuras, no solo texto** (referencia: `out/que-es`, `scripts/generate-que-es.ts`):
  cancha con jugadores reales + chips Panini + banderas, barras del reparto del premio, iconos. Cada
  pieza debe "mostrar", no solo "decir". Las 9 placas se regeneran con su `generate-copa-N.ts`.
- **Tono (decidido):** primera persona (**premiamos / repartimos / lanzamos**) y el premio siempre
  como **garantizado y repartido sí o sí, aunque no se llenen los 100** — **nunca** "lo pone la casa".
- **Cupo "[X]/[Y]"**: completar con el dato real de `getCopasStatus` al momento de publicar.
- **Si se abre la copa #2 / oleada 8vos** (`LANZAMIENTO-COPA.md` §1.5, §8): este calendario se
  **reusa comprimido** según los días que queden, manteniendo el mismo orden de ángulos.
- **B&C**: link obligatorio en toda pieza de Liga Premium (#1, #2, #3, #4, #5, #7, #8, #9). El #6 (amigos, modo gratis) no lleva.

---

## ANEXO B — Captions listas para IG (#1 → #9)

> **Para copiar y pegar tal cual** al subir cada carrusel. Bloques limpios (sin `>` ni formato), en
> el orden de publicación. Antes de pegar, repasar: link en bio apunta a `los11desampa.com/copa`
> (posts premium) o `los11desampa.com` (#6, general); **Bases y Condiciones** linkeadas en bio para
> todo lo premium. **No usar "lo pone la casa"**; premio siempre "se reparte sí o sí, aunque no se
> llenen los 100". Primera persona (premiamos / repartimos / lanzamos).

### #1 · 23/06 (noche) — Lanzamiento
```text
🏆 Lanzamos la Liga Premium del Mundial.

Hasta ahora jugabas gratis con tus amigos. Ahora podés competir por premios de verdad y demostrar quién sabe más de fútbol: armás tu equipo, lo dirigís fecha a fecha y jugás por $400.000 repartidos entre los 10 primeros.

💵 Entrada $5.000 · 🎟️ Cupo 100 · 🏁 Rankea desde 16vos · 🛡️ Repartimos el premio sí o sí, aunque no se llenen los 100.

Te sumás hasta el 28/06 (o hasta que se llenen los 100). Link en bio 👉 los11desampa.com/copa

¿Te animás a demostrar que sos el que más sabe? 👇 (Bases y Condiciones en bio.)

#Mundial2026 #WorldCup2026 #Los11DeSampa #FantasyFutbol #LigaPremium
```

### #2 · 24/06 (mañana) — Cómo entrás (en 3 pasos)
```text
🎟️ Te lo simplificamos: entrar a la Liga Premium son 3 pasos.

1️⃣ Armá tu equipo en los11desampa.com (gratis: 15 figuras + DT).
2️⃣ Entrá a la Copa en los11desampa.com/copa y asegurá tu lugar ($5.000, cupo 100).
3️⃣ Listo: quedás rankeado desde 16vos hasta la final, jugando por $400.000 al top 10.

🎁 Bonus: si ya tenés tu equipo, al entrar arrancás los 16vos con 5 cambios gratis para rearmarlo.

¿Todavía no sabés cómo se juega? Mirá el carrusel fijado 📌

Te sumás hasta el 28/06 (o hasta que se llenen los 100). 🔗 bio · los11desampa.com/copa

¿Ya tenés tu equipo armado? 👇 (Bases y Condiciones en bio.)

#LigaPremium #Mundial2026 #Los11DeSampa #FantasyFutbol #16vos
```

### #3 · 24/06 (tarde) — La distribución del premio
```text
💰 Transparencia total: así repartimos los $400.000 de la Liga Premium.

No es "el ganador se lleva todo y listo". Premiamos al top 10: desde $120.000 el 1° hasta $15.000 el 10°. Y es fijo — repartimos los $400.000 completos, aunque no se llenen los 100.

💵 Entrada $5.000 · 🎟️ Cupo 100 · 🏁 Cierra 28/06.

Link en bio 👉 los11desampa.com/copa

Si entrás, ¿a qué puesto apuntás? 👇 (Bases y Condiciones en bio.)

#LigaPremium #Mundial2026 #Los11DeSampa #FantasyFutbol #Premio
```

### #4 · 25/06 (mañana) — Por qué la Liga Premium (no el prode del grupo)
```text
⚽ ¿Por qué jugar la Liga Premium y no quedarte solo con el prode del laburo?

1) Porque es estrategia, no suerte. No marcás resultados al azar: elegís 15 cracks reales, manejás un presupuesto (hay que tener criterio para no pasarte) y dirigís tu equipo fecha a fecha. Te medís contra los mejores DT del país.

2) Porque se paga, siempre. Acá nadie se baja a mitad de camino ni "desaparece" con la plata: el premio de $400.000 está garantizado, se reparte sí o sí y con Bases y Condiciones.

Es la diferencia entre adivinar resultados y jugar en serio. 💵 $5.000 · 🎟️ 100 lugares · 🏁 28/06
🔗 bio · los11desampa.com/copa

¿Te pasó alguna vez que el prode del grupo no se pagó? Contá 👇

#LigaPremium #Prode #Mundial2026 #Los11DeSampa #FantasyFutbol
```

### #5 · 26/06 (mañana) — Cupo en vivo
> ⚠️ Completar `[Y]` con el número real de `getCopasStatus` (lugares libres) antes de publicar. Mismo número que se usó en `--enrolled` al regenerar la placa. **Nunca inflar.**
```text
🎟️ El cupo se mueve: quedan [Y] de 100 lugares en la Liga Premium.

No es marketing de humo — son 100 y nada más. Cuando se llena, se cierra y listo. Los que entran juegan por $400.000 garantizados al top 10.

💵 $5.000 · 🏁 Cierra 28/06 (o antes si se llena) · 🔗 bio · los11desampa.com/copa

¿Entrás o te lo vas a perder? 👇 (Bases y Condiciones en bio.)

#LigaPremium #Mundial2026 #Los11DeSampa #CupoLimitado #FantasyFutbol
```

### #6 · 25/06 (tarde) — Jugá gratis con tus amigos (general)
```text
👯 El grupo de fútbol del celu merece algo mejor que una planilla de Excel.

En Los 11 de Sampa armás tu liga privada gratis: pasás el código, se anotan los pibes y compiten todo el Mundial con sus equipos. Sin cargar resultados a mano ni perseguir a nadie para que pague.

Es el prode del grupo, pero bien hecho. Y si después quieren jugar fuerte, ahí está la Liga Premium por $400.000. 🔗 bio.

Armá la liga gratis en los11desampa.com — etiquetá a los 3 que NO pueden faltar 👇

#Los11DeSampa #FantasyFutbol #Mundial2026 #LigaConAmigos #Prode
```

### #7 · 26/06 (tarde) — Urgencia: faltan 2 días
> ⚠️ Completar `[Y]` con el número real de `getCopasStatus` (lugares libres), igual que en la placa (`--enrolled`). **Nunca inflar.**
```text
⏳ Faltan 2 días. La inscripción a la Liga Premium cierra el 28/06, justo antes del primer partido de 16vos.

Después no hay repechaje: o estás adentro jugando por $400.000, o lo mirás de afuera. Quedan [Y] de 100 lugares.

💵 $5.000 · 🔗 bio · los11desampa.com/copa

¿Lo dejás para último momento otra vez? 👇 (Bases y Condiciones en bio.)

#LigaPremium #Mundial2026 #Los11DeSampa #UltimosDias #FantasyFutbol
```

### #8 · 27/06 — Urgencia: última chance, cierra mañana
> ⚠️ Completar `[Y]` con el número real de `getCopasStatus` (lugares libres), igual que en la placa (`--enrolled`). **Nunca inflar.**
```text
🚨 Última chance. Mañana cierra la inscripción a la Liga Premium y no se reabre.

Si venías pensándolo: es ahora. $400.000 garantizados al top 10, cupo 100, entrada $5.000. Quedan [Y] lugares.

🔗 bio 👉 los11desampa.com/copa

Etiquetá al amigo indeciso antes de que sea tarde 👇 (Bases y Condiciones en bio.)

#LigaPremium #UltimaChance #Mundial2026 #Los11DeSampa #FantasyFutbol
```

### #9 · 28/06 (mañana) — Último llamado + rescate al modo gratis
> ⚠️ Subir **a la mañana**. Una vez cerrada la inscripción, **editar la caption** quitando el CTA de pago y dejando solo el de jugar gratis (la slide 2 ya lo sostiene).
```text
🔔 Hoy cierra la Liga Premium. Antes de que ruede la pelota en 16vos. Últimas horas para entrar y jugar por $400.000. 🔗 bio · los11desampa.com/copa

¿No llegás a tiempo o no es lo tuyo lo de la plata? No pasa nada: el juego sigue gratis. Armá tu equipo, metete en el ranking global y jugá con tus amigos hasta la final.

🎮 los11desampa.com — la pelota no espera 👇

#LigaPremium #Mundial2026 #Los11DeSampa #FantasyFutbol #16vos
```
