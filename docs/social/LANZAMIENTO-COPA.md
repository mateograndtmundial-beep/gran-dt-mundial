# Plan de comunicación en redes — Lanzamiento Liga Premium

> **Nombre público de la feature: Liga Premium** (las copas se llaman **"Liga Premium I"** y
> **"Liga Premium II"**). El marketing **no** gira en torno a "GOLDEN TICKET": ese nombre
> aparece **solo** en el checkout de Mercado Pago (rótulo del cobro), para no explicitar que
> es una liga premium paga. En este doc "copa" se usa como sinónimo casual de cada Liga Premium.
>
> Estrategia de redes para llenar las **Ligas Premium** (cupo 100 c/u, entrada $5.000,
> premio fijo $400.000 al top 10) antes del **cierre = kickoff de 16vos (28/06)**.
> Modelo de presupuesto: **escalonado por demanda** — **$100.000 por copa**, se libera el
> siguiente tramo solo cuando la copa anterior se llena. Hoy es **19/06** → la inscripción abre
> con la 1ra publicación (arrancamos **mañana 20/06**, quedan 8 días + el día del cierre).
>
> Contexto del producto, estado/pendientes y UI: [`../MONETIZACION.md`](../MONETIZACION.md) ·
> voz y formatos: [`COPY-VOICE.md`](./COPY-VOICE.md), [`FORMATS.md`](./FORMATS.md),
> [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md).

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
| **Tramo 1** | **$100.000** | Al lanzar (20/06) | Promoción de la **Copa #1**. |
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

## 1.5 Tamaño de liga y escalado por oleadas (DECIDIDO)
**Ligas de 100, premio fijo $400.000.** Se descartó balancear la demanda en N ligas parejas (ej.
220 → 3 de ~73): con premio fijo, **cada liga por debajo de ~80 pagos pierde plata** (break-even
80), así que 3 ligas de 73 darían **−$100.000**. Ligas de 100 dejan **+$100.000** cada una. Como
el tamaño es fijo, **no hace falta** el "pool"/reparto al cierre: se llena una liga, se abre la
siguiente (es lo que ya hace el backend).

**Escalado por oleadas (según round de arranque):**

| Oleada | Copas | Arranca / rankea desde | Inscripción cierra | Cuándo se abre |
|---|---|---|---|---|
| **1 (16vos)** | #1, #2, … | **16vos** (order 4) | **kickoff de 16vos = 28/06** | Se abre la siguiente cuando la anterior llega a 100. |
| **2 (8vos)** | nuevas | **8vos de Final** (order 5) | **kickoff de 8vos** (unos días después) | **Si al cerrar la oleada 1 quedan muchos interesados.** |

- **Por qué oleadas:** una liga que arranca en 8vos **cierra en el kickoff de 8vos** → da **más días
  para llenarla**. Resuelve el caso "quedan interesados pero ya no hay tiempo antes del 28/06".
- **Cierre de inscripciones = manual/discrecional.** El cupo de 100 frena cada liga sola; **abrir
  una nueva (misma oleada u oleada siguiente) lo decidís vos** mirando demanda y días restantes.
- **Hook de marketing** que cae redondo y respeta el break-even: **"cada 100 que entran, se abre
  otra copa de $400.000"**.
- **El usuario ve a sus rivales recién al kickoff** → no le molesta en qué liga puntual quedó
  mientras tanto; la inscripción es a "la Copa", la liga concreta es detalle interno.

> **Dependencia técnica para la oleada 8vos:** el seed hoy crea 2 copas que arrancan en **16vos**
> (`scoringStartRoundId = r16`). Una copa de **oleada 8vos** necesita `scoringStartRoundId = 8vos`
> (order 5) y su deadline en el kickoff de 8vos → **seedear copas nuevas con ese parámetro**.
> Anotado en el checklist.

---

## 1.6 Ángulo central de comunicación: surfear el furor de los prodes (DECIDIDO)
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
| Premio | Lo que junta el grupo, **a veces no se paga** | **$400.000 FIJO, lo garantiza la casa** |
| Confianza | "¿el que organiza va a pagar?" | Premio garantizado + **Bases y Condiciones** |
| Duración | Se define rápido / se pincha | **Hasta la final** |
| Entrada | Informal | **$5.000**, transparente |

**Mensajes-rampa (usar en HERO y stories):**
- *"En el prode adivinás resultados. Acá armás y dirigís tu equipo."*
- *"Cansado de que el del prode después no aparezca? Acá el premio lo pone la casa: $400.000 asegurados."*
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
> Condiciones**; el premio se comunica siempre como **garantizado por la casa** (no pozo de los
> inscriptos), que es justo lo que nos diferencia del prode. Ver checklist (legal).

---

## 2. ¿Cuántas publicaciones por día?
Ya subís **2 carruseles de puntajes/día** (uno por grupo). **No los toques como motor de
contenido** — son tu alcance orgánico gratis. La Copa se monta encima así:

| Tipo | Cadencia | Para qué |
|---|---|---|
| **Scoreboards (ya existen)** | 2/día | Mantener el alcance. **Agregar CTA de la Copa** en el caption + 1 slide final "Sumate a la Copa". |
| **Post dedicado de la Copa (feed)** | **1/día** | Una pieza por día con un ángulo distinto (calendario §7). |
| **Stories** | **3–5/día** (ramp a 6 en las últimas 48 h) | Recordatorio, cupo en vivo, countdown, redirección al post. |

**No más de 1 post dedicado/día en feed**: más que eso fatiga y compite con tus propios
scoreboards. La frecuencia alta va por **stories**, donde el público caliente convierte.

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
1. **La oferta clara**: premio **FIJO $400.000 garantizado** al **top 10** (no es pozo, lo pone la casa).
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

## 7. Calendario día por día (20/06 → 28/06) — Copa #1
Fases: **Lanzamiento → Educación/Prueba → Escasez → Último llamado.** Cada día = scoreboards de
siempre (con CTA Copa) + 1 post dedicado + stories. **El tramo 2 (Copa #2) reusa este mismo
calendario comprimido** según los días que queden cuando se libere.

| Día | Fecha | Fase | Post dedicado (ángulo) | Stories | Pauta (Tramo 1) |
|---|---|---|---|---|---|
| **D-8** | 20/06 | 🚀 Lanzamiento | **HERO 1 — "El prode lo gana la suerte. Esto, los que saben de fútbol."** (§1.6): presenta la Liga Premium, premio $400k garantizado, cupo 100, entrada $5.000, abre HOY. | Anuncio + countdown + link a `/copa` | **Activar retargeting + prospecting** (HERO 1) |
| **D-7** | 21/06 | Educación | **¿Cómo funciona?** Jugás con tu equipo (no es adivinar resultados como el prode), rankea desde 16vos, 5 cambios gratis para inscriptos. | Tutorial 3 frames + encuesta ("¿en cuántos prodes estás?") | HERO 2 (cómo funciona) a retargeting |
| **D-6** | 22/06 | Educación/Prueba | **La distribución del premio** (gráfico top 10: 1°=$120k…). | Desglose del premio + link | Sigue HERO 1+2 |
| **D-5** | 23/06 | Prueba/Confianza | **"El premio lo pone la casa, se reparte sí o sí"** (anti-objeción "¿es real?" + "a diferencia del prode que no paga"). | Q&A / FAQ | Cortar el creativo que peor convierte |
| **D-4** | 24/06 | Escasez | **Cupo en vivo**: "Ya se anotaron X. Quedan Y de 100." | Cupo en vivo | Subir al mejor creativo · **chequear gatillo Tramo 2** |
| **D-3** | 25/06 | Escasez | **Social proof** / "los equipos que ya están adentro". | Cupo + countdown + encuesta | Empuje si vas atrasado |
| **D-2** | 26/06 | Urgencia | **"Faltan 2 días"** — recordatorio fuerte con deadline. | Countdown intensivo + link | Empuje final (HERO escasez) |
| **D-1** | 27/06 | Urgencia | **"Última chance, cierra mañana"**. | Cupo + countdown | Máximo del empuje 48 h |
| **D-0** | 28/06 | 🔔 Último llamado | **"CIERRA HOY antes del primer partido"** (a la mañana). | Cuenta regresiva por horas | Última pauta corta; cortar al cerrar |

**Reusá tu tooling**: las placas de la Copa siguen `VISUAL-SYSTEM.md`; el gráfico de premio y el
contador de cupo pueden ser plantillas nuevas en `assets/`. Captions con la voz de `COPY-VOICE.md`.

---

## 8. Métricas y la regla que dispara el tramo siguiente
- **Ritmo objetivo por copa**: 100 inscriptos en los días disponibles. Para la #1 (~8 días) ≈ **12–13/día**.
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
- **Ángulo central**: **surfear el furor de los prodes** (§1.6) — "el prode pero en serio": skill vs. suerte, dura todo el Mundial, premio **garantizado por la casa** (no el prode que no paga). Rampa de entrada, no rival.
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

## ANEXO — Las 9 publicaciones de IG, una por una

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
| 1 | D-8 · 20/06 | 🚀 Lanzamiento | "El prode lo gana la suerte. Esto, los que saben de fútbol." | 🏆 Liga Premium | Sumate: los11desampa.com/copa |
| 2 | D-7 · 21/06 | Educación | ¿Cómo se juega? (gratis) → subí a la Liga Premium | 🏆🎮 Ambos | Armá tu 11 gratis / Subí a la Liga Premium |
| 3 | D-6 · 22/06 | Educación/Prueba | La distribución del premio (top 10, transparente) | 🏆 Liga Premium | Anotate antes que se llene |
| 4 | D-5 · 23/06 | Confianza | "El premio lo pone la casa, se reparte sí o sí" | 🏆 Liga Premium | Sumate con confianza |
| 5 | D-4 · 24/06 | Escasez | Cupo en vivo: quedan Y de 100 | 🏆 Liga Premium | Asegurá tu lugar |
| 6 | D-3 · 25/06 | Prueba/General | "Jugá gratis con tus amigos" (el prode del grupo, bien hecho) | 🎮 General | Creá tu liga con amigos |
| 7 | D-2 · 26/06 | Urgencia | "Faltan 2 días" | 🏆 Liga Premium | Entrá antes del cierre |
| 8 | D-1 · 27/06 | Urgencia | "Última chance, cierra mañana" | 🏆 Liga Premium | Último día para anotarte |
| 9 | D-0 · 28/06 | 🔔 Último llamado | "Cierra HOY" + jugá gratis igual | 🏆🎮 Ambos | Cierra hoy / Jugá gratis igual |

> **Reparto de objetivos:** posts **2, 6 y 9** abren a usuario general (jugar gratis); el resto
> sostiene el foco premium. Posts **1 y 4** explotan el prode de lleno; **2, 3 y 6** lo usan como
> contraste suave. La idea: que la campaña **también** deje jugadores nuevos gratis (LTV de pines),
> no solo inscriptos.

---

### 1 · D-8 · viernes 20/06 — 🚀 Lanzamiento (HERO 1)
**Objetivo:** 🏆 Liga Premium. Le habla a todo el público futbolero que ya está en algún prode.
**Formato:** carrusel 4 slides.

**Slides (idea de cada uno):**
1. **Portada / hook:** "El prode lo gana la suerte. **Esto, los que saben de fútbol.**" Fondo
   dorado premium, Archivo Black.
2. **La oferta:** "$400.000 garantizados al top 10. Entrada $5.000. Cupo 100. Abre HOY."
3. **Cómo funciona en 1 línea:** "No adivinás resultados: armás y dirigís tu equipo. Rankea desde
   16vos, hasta la final."
4. **CTA + confianza:** "El premio lo pone la casa, se reparte sí o sí. Sumate: los11desampa.com/copa.
   Cierra el 28/06 o al llenar los 100. *Bases y Condiciones en bio.*"

**Qué dice (caption):**
> 🏆 Arrancó la **Liga Premium** del Mundial.
>
> En el prode adivinás resultados y rezás. Acá **ganás por saber de fútbol**: armás tu equipo, lo
> dirigís todo el Mundial y jugás por **$400.000 garantizados** repartidos entre los 10 primeros.
>
> 💵 Entrada $5.000 · 🎟️ Cupo 100 · 🏁 Rankea desde 16vos · 🛡️ El premio lo pone la casa, **se
> reparte sí o sí**.
>
> Cierra el **28/06** o cuando se llenen los 100. Link en bio 👉 los11desampa.com/copa
>
> ¿En cuántos prodes estás este Mundial? 👇 *(Bases y Condiciones en bio.)*
>
> #Mundial2026 #WorldCup2026 #Los11DeSampa #FantasyFutbol #LigaPremium #Prode

**Idea que transmite:** llegó algo serio y distinto al prode — se gana por **skill** (no por suerte),
con premio grande y garantizado.
**Por qué:** es la pieza que **abre la inscripción**; tiene que dejar la oferta cristalina y plantar
el ángulo prode que se va a repetir toda la semana. Activa retargeting + prospecting (HERO 1).
**Cuidados:** premio siempre como "garantizado por la casa" (no pozo); link a B&C sí o sí.

---

### 2 · D-7 · sábado 21/06 — Educación: ¿cómo se juega?
**Objetivo:** 🏆🎮 Ambos. Capta jugador nuevo **gratis** y, arriba de eso, presenta la Liga Premium
como "subir de nivel". Le habla al curioso que vio el post 1 pero no sabe cómo funciona.
**Formato:** carrusel 5 slides (tutorial).

**Slides:**
1. **Portada:** "Cómo se juega Los 11 de Sampa (y no es adivinar resultados como el prode)."
2. **Armá tu 11:** "Elegís 15 jugadores + DT con un presupuesto. Tu equipo, tu estrategia."
3. **Sumás puntos reales:** "Cada jugador suma según su **rendimiento real** en el Mundial. Gol,
   asistencia, valla invicta, figura…"
4. **Competís:** "Ranking global + ligas privadas con tus amigos. **Gratis.**"
5. **Subí de nivel:** "¿Querés jugar por plata? La **Liga Premium**: $400.000 al top 10, entrada
   $5.000, cupo 100. los11desampa.com/copa"

**Qué dice (caption):**
> 🎮 ¿Nunca jugaste un fantasy? Va el manual en 30 segundos 👇
>
> No es adivinar resultados (eso es el prode). Acá **armás tu equipo** de 15 + DT con presupuesto,
> y sumás puntos por lo que **de verdad** hacen los jugadores en la cancha. Gol, asistencia, valla
> invicta, figura del partido.
>
> Jugás **gratis**, competís en el ranking global y armás tu liga privada con amigos.
>
> ¿Y si querés jugar fuerte? Está la **Liga Premium**: $400.000 garantizados al top 10. 🔗 bio.
>
> Armá tu 11 gratis en los11desampa.com — ¿con qué 9 arrancás el equipo? 👇
>
> #Mundial2026 #FantasyFutbol #Los11DeSampa #ComoSeJuega #LigaPremium

**Idea que transmite:** es fácil, es gratis para empezar, y se gana por saber de fútbol — con la
Liga Premium como techo aspiracional.
**Por qué:** baja la barrera de entrada (mucha gente no sabe qué es un fantasy) y **agranda el
público** que después puede pagar la Liga Premium. Encuesta para alcance.
**Cuidados:** no prometer ganancias; el premium se menciona como opción.

---

### 3 · D-6 · domingo 22/06 — Educación/Prueba: la distribución del premio
**Objetivo:** 🏆 Liga Premium. Le habla al interesado que duda "¿y cuánto se lleva cada uno?".
**Formato:** carrusel 3 slides (con el gráfico del reparto).

**Slides:**
1. **Portada:** "$400.000. Así se reparten entre los 10 primeros."
2. **El gráfico (top 10):** 1° $120.000 · 2° $72.000 · 3° $48.000 · 4° $36.000 · 5° $28.000 ·
   6° $24.000 · 7° $20.000 · 8° $20.000 · 9° $16.000 · 10° $16.000.
3. **CTA:** "Premio FIJO, lo pone la casa. Entrada $5.000, cupo 100. los11desampa.com/copa"

**Qué dice (caption):**
> 💰 Transparencia total: así se reparten los **$400.000** de la Liga Premium.
>
> No es "el ganador se lleva todo y listo". **Premian al top 10**: desde $120.000 el 1° hasta
> $16.000 el 10°. Y es **fijo** — lo pone la casa, no depende de cuántos se anoten.
>
> 💵 Entrada $5.000 · 🎟️ Cupo 100 · 🏁 Cierra 28/06.
>
> Link en bio 👉 los11desampa.com/copa
>
> Si entrás, ¿a qué puesto apuntás? 👇 *(Bases y Condiciones en bio.)*
>
> #LigaPremium #Mundial2026 #Los11DeSampa #FantasyFutbol #Premio

**Idea que transmite:** el premio es real, repartido y transparente — entrar al top 10 (no solo
ganar) ya paga.
**Por qué:** amplía la sensación de "alcanzable" (10 ganadores, no 1) y combate la objeción
"seguro gana siempre el mismo". Material limpio para pauta (HERO "premio").
**Cuidados:** los montos tienen que coincidir EXACTO con `MONETIZACION.md` y las B&C.

---

### 4 · D-5 · lunes 23/06 — Confianza: "el premio lo pone la casa"
**Objetivo:** 🏆 Liga Premium. Le habla al desconfiado quemado por el prode que no paga.
**Formato:** carrusel 3 slides (anti-objeción).

**Slides:**
1. **Portada:** "'¿Y esto lo pagan de verdad?' Sí. Y te explicamos por qué."
2. **El contraste:** "El prode del grupo: el premio sale de lo que junten… y a veces el que
   organiza no aparece. **Acá el premio lo pone la casa.**"
3. **CTA:** "$400.000 garantizados, se reparten sí o sí. Con Bases y Condiciones. los11desampa.com/copa"

**Qué dice (caption):**
> 🛡️ La pregunta que todos se hacen: *"¿esto se paga de verdad?"*
>
> En el prode del grupo, el pozo sale de lo que juntan entre todos… y siempre hay un "che, el que
> organizaba desapareció". **Acá no.** El premio de la Liga Premium **lo pone la casa**: $400.000
> que se reparten **sí o sí**, esté lleno o no el cupo. Con **Bases y Condiciones** publicadas.
>
> Esa es la diferencia entre una quiniela de oficina y jugar en serio.
>
> 💵 $5.000 · 🎟️ 100 lugares · 🏁 28/06 · 🔗 bio · los11desampa.com/copa
>
> ¿Te pasó alguna vez que el prode no se pagó? Contá 👇
>
> #LigaPremium #Prode #Mundial2026 #Los11DeSampa #FantasyFutbol

**Idea que transmite:** confianza — el premio está garantizado y documentado, a diferencia del prode
informal.
**Por qué:** ataca el bloqueante #1 de una compra con plata real (¿es confiable?). Usa el prode como
espejo del problema que la Liga Premium resuelve. Engagement con anécdota = mucho comentario.
**Cuidados:** el encuadre "garantizado por la casa" debe coincidir con B&C; no insultar al prode.

---

### 5 · D-4 · martes 24/06 — Escasez: cupo en vivo
**Objetivo:** 🏆 Liga Premium. Le habla al indeciso ("lo pienso") — la escasez lo empuja.
**Formato:** placa única (o carrusel 2) con el número de cupo grande.

**Slides:**
1. **Portada:** "Ya se anotaron **[X]**. Quedan **[Y] de 100**." (número en vivo, `getCopasStatus`).
2. *(opcional)* "Cuando se llena, se cierra. El que entra, juega por $400.000. los11desampa.com/copa"

**Qué dice (caption):**
> 🎟️ El cupo se mueve: **quedan [Y] de 100** lugares en la Liga Premium.
>
> No es marketing de humo — son **100 y nada más**. Cuando se llena, se cierra y listo. Los que
> entran juegan por **$400.000** garantizados al top 10.
>
> 💵 $5.000 · 🏁 Cierra 28/06 (o antes si se llena) · 🔗 bio · los11desampa.com/copa
>
> ¿Entrás o te lo vas a perder? 👇 *(Bases y Condiciones en bio.)*
>
> #LigaPremium #Mundial2026 #Los11DeSampa #CupoLimitado #FantasyFutbol

**Idea que transmite:** los lugares son reales y finitos — si lo pensás mucho, te quedás afuera.
**Por qué:** primer empujón de escasez con dato real; el cupo llenándose es la mejor prueba social
y, según el modelo de tramos, dispara la decisión de abrir la copa #2. Acá se chequea el gatillo
del Tramo 2 (`LANZAMIENTO-COPA.md` §8).
**Cuidados:** el número tiene que ser **real** (sacado de `getCopasStatus`), nunca inflado.

---

### 6 · D-3 · miércoles 25/06 — Prueba/General: "jugá gratis con tus amigos"
**Objetivo:** 🎮 General. Le habla al que no quiere pagar pero sí quiere competir con su grupo.
**Formato:** carrusel 3 slides.

**Slides:**
1. **Portada:** "¿Tenés un grupo de fútbol en WhatsApp? Ya tenés tu liga."
2. **Cómo:** "Creás una liga privada **gratis**, pasás el código y compiten entre ustedes todo el
   Mundial. El prode del grupo, pero bien hecho."
3. **Puente premium:** "¿Y si suben la apuesta? La **Liga Premium** los espera. Pero jugar con los
   pibes es gratis. los11desampa.com"

**Qué dice (caption):**
> 👯 El grupo de fútbol de WhatsApp merece algo mejor que una planilla de Excel.
>
> En Los 11 de Sampa armás tu **liga privada gratis**: pasás el código, se anotan los pibes y
> compiten **todo el Mundial** con sus equipos. Sin que nadie tenga que cargar resultados a mano ni
> perseguir a nadie para que pague.
>
> Es el prode del grupo, pero **bien hecho**. Y si después quieren jugar fuerte, ahí está la **Liga
> Premium** por $400.000. 🔗 bio.
>
> Armá la liga gratis en los11desampa.com — etiquetá a los 3 que NO pueden faltar 👇
>
> #Los11DeSampa #FantasyFutbol #Mundial2026 #LigaConAmigos #Prode

**Idea que transmite:** el corazón gratis del juego es jugar con tu grupo — sin fricción, mejor que
el prode casero.
**Por qué:** **captación pura de usuario general** (el "etiquetá a 3" es viralidad orgánica), y cada
jugador nuevo es un potencial inscripto de Liga Premium más adelante. Da aire al pitch premium
constante de la semana.
**Cuidados:** ninguno legal (es el modo gratis); cuidar no opacar que la Liga Premium sigue abierta.

---

### 7 · D-2 · jueves 26/06 — Urgencia: "faltan 2 días"
**Objetivo:** 🏆 Liga Premium. Le habla al interesado tibio que venía postergando.
**Formato:** placa única (countdown) o carrusel 2.

**Slides:**
1. **Portada:** "Faltan **2 días**. La Liga Premium cierra el 28/06."
2. *(opcional)* "Quedan [Y] de 100. $400.000 al top 10. los11desampa.com/copa"

**Qué dice (caption):**
> ⏳ **Faltan 2 días.** La inscripción a la Liga Premium cierra el **28/06**, justo antes del primer
> partido de 16vos.
>
> Después no hay repechaje: o estás adentro jugando por **$400.000**, o lo mirás de afuera. Quedan
> **[Y] de 100** lugares.
>
> 💵 $5.000 · 🔗 bio · los11desampa.com/copa
>
> ¿Lo dejás para último momento otra vez? 👇 *(Bases y Condiciones en bio.)*
>
> #LigaPremium #Mundial2026 #Los11DeSampa #UltimosDias #FantasyFutbol

**Idea que transmite:** la ventana se cierra; postergar = quedar afuera.
**Por qué:** arranca el empuje final de 48 h (donde se concentra parte de la pauta). Combina deadline
+ cupo para doble urgencia.
**Cuidados:** la fecha de cierre debe ser la real (kickoff de 16vos); link a B&C.

---

### 8 · D-1 · viernes 27/06 — Urgencia: "última chance, cierra mañana"
**Objetivo:** 🏆 Liga Premium. Le habla al que ya decidió pero no se anotó todavía.
**Formato:** placa única (countdown fuerte).

**Slides:**
1. **Portada:** "Última chance. **Cierra MAÑANA.**"
2. *(opcional)* "Quedan [Y] lugares. $400.000 al top 10. los11desampa.com/copa"

**Qué dice (caption):**
> 🚨 **Última chance.** Mañana cierra la inscripción a la Liga Premium y no se reabre.
>
> Si venías pensándolo: es **ahora**. $400.000 garantizados al top 10, cupo 100, entrada $5.000.
> Quedan **[Y]** lugares.
>
> 🔗 bio 👉 los11desampa.com/copa
>
> Etiquetá al amigo indeciso antes de que sea tarde 👇 *(Bases y Condiciones en bio.)*
>
> #LigaPremium #UltimaChance #Mundial2026 #Los11DeSampa #FantasyFutbol

**Idea que transmite:** es literalmente el último llamado útil — decidir hoy.
**Por qué:** pico del empuje de 48 h; el "etiquetá al indeciso" suma alcance y trae rezagados. Máxima
escasez antes del cierre.
**Cuidados:** no exagerar el cupo; mantener coherencia con el número real.

---

### 9 · D-0 · sábado 28/06 — 🔔 Último llamado + rescate al general
**Objetivo:** 🏆🎮 Ambos. Cierra la Liga Premium **a la mañana** y, para los que no llegaron, los
invita a jugar **gratis** igual (no perder el lead).
**Formato:** carrusel 2 slides.

**Slides:**
1. **Portada (mañana):** "**CIERRA HOY.** Antes del primer partido de 16vos."
2. **Rescate:** "¿No llegaste a la Premium? Igual podés jugar **gratis** todo lo que queda del
   Mundial. Armá tu 11 en los11desampa.com"

**Qué dice (caption):**
> 🔔 **Hoy cierra la Liga Premium.** Antes de que ruede la pelota en 16vos. Últimas horas para entrar
> y jugar por **$400.000**. 🔗 bio · los11desampa.com/copa
>
> ¿No llegás a tiempo o no es lo tuyo lo de la plata? **No pasa nada**: el juego sigue **gratis**.
> Armá tu equipo, metete en el ranking global y jugá con tus amigos hasta la final.
>
> 🎮 los11desampa.com — la pelota no espera 👇
>
> #LigaPremium #Mundial2026 #Los11DeSampa #FantasyFutbol #16vos

**Idea que transmite:** se acabó el tiempo de la Premium — pero el juego (gratis) sigue para todos.
**Por qué:** exprime las últimas horas de inscripción **y** convierte el cierre en captación general,
para que el tráfico del día final no se desperdicie (quien no paga hoy, queda como jugador y futuro
inscripto de la oleada 8vos). Cerrar la pauta al cierre de inscripción.
**Cuidados:** una vez cerrada la inscripción, **frenar** el CTA de pago; dejar solo el de jugar gratis.

---

### Publicación ANCLADA #1 — "¿Qué es Los 11 de Sampa?" (evergreen)
**Estado:** GENERADA. Carrusel **explicativo de 7 placas diseñadas** (sin screenshots) en
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

**Caption (borrador):**
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
- **Cupo "[X]/[Y]"**: completar con el dato real de `getCopasStatus` al momento de publicar.
- **Si se abre la copa #2 / oleada 8vos** (`LANZAMIENTO-COPA.md` §1.5, §8): este calendario se
  **reusa comprimido** según los días que queden, manteniendo el mismo orden de ángulos.
- **B&C**: link obligatorio en toda pieza de Liga Premium (#1, #3, #4, #5, #7, #8, #9).
