# Plan de comunicación en redes — Lanzamiento Copa GOLDEN TICKET

> Estrategia de redes para llenar las **Copas GOLDEN TICKET** (cupo 100 c/u, entrada $5.000,
> premio fijo $400.000 al top 10) antes del **cierre = kickoff de 16vos (28/06)**.
> Modelo de presupuesto: **escalonado por demanda** — **$100.000 por copa**, se libera el
> siguiente tramo solo cuando la copa anterior se llena. Hoy es **19/06** → la inscripción abre
> con la 1ra publicación (arrancamos **mañana 20/06**, quedan 8 días + el día del cierre).
>
> Contexto del producto: [`../MONETIZACION.md`](../MONETIZACION.md) · estado/pendientes:
> [`../COPA-CHECKLIST.md`](../COPA-CHECKLIST.md) · voz y formatos: [`COPY-VOICE.md`](./COPY-VOICE.md),
> [`FORMATS.md`](./FORMATS.md), [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md).

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

**El gancho:** *"El prode se te termina en fase de grupos. Esto recién empieza."*

| | **Prode / quiniela típica** | **Copa GOLDEN TICKET** |
|---|---|---|
| Cómo ganás | Adivinar resultados (**suerte**) | Armás y dirigís tu equipo (**skill**, dura todo el Mundial) |
| Premio | Lo que junta el grupo, **a veces no se paga** | **$400.000 FIJO, lo garantiza la casa** |
| Confianza | "¿el que organiza va a pagar?" | Premio garantizado + **Bases y Condiciones** |
| Duración | Se define rápido / se pincha | **Hasta la final** |
| Entrada | Informal | **$5.000**, transparente |

**Mensajes-rampa (usar en HERO y stories):**
- *"¿Cuántos prodes llenaste ya? Te queda el que importa."*
- *"Cansado de que el del prode después no aparezca? Acá el premio lo pone la casa: $400.000 asegurados."*
- *"El prode es de suerte. Esto es de los que saben de fútbol."*
- *"Tu prode ya está liquidado. Armá tu equipo y jugá por $400.000 hasta la final."*

**Cómo se aplica sin friccionar:**
- **Posiciona, no insulta:** el que está en un prode es nuestro público ideal, no el enemigo. Tono
  cómplice ("vos que ya estás jugando…"), nunca despectivo con el prode del grupo de amigos.
- **Aprovechá el momento de dolor:** cuando los prodes se empiezan a definir/pinchar en la fase de
  grupos (y la gente queda eliminada), es **el mejor momento** para decir "esto recién arranca, y el
  premio está garantizado". El calendario (§7) lo explota en la fase de Educación/Prueba.
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
| **D-8** | 20/06 | 🚀 Lanzamiento | **HERO 1 — "El prode se te termina en fase de grupos. Esto recién empieza."** (§1.6): presenta la Copa, premio $400k garantizado, cupo 100, entrada $5.000, abre HOY. | Anuncio + countdown + link a `/copa` | **Activar retargeting + prospecting** (HERO 1) |
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
