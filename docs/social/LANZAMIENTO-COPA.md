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
- **El deadline 28/06 acota todo**: una copa abierta a horas del cierre **no se llena** → por eso la
  regla "días + confianza, nunca horas". Copas más allá de lo que entra antes del 28/06
  **necesitarían arrancar más tarde** (octavos en vez de 16vos → otro `scoringStartRoundId` y otro
  deadline). **Decisión de producto pendiente** (ver checklist) antes de prometer copas tardías.

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

## 1.5 Asignación dinámica de ligas (balancear el cupo) — evaluación
**Premisa que lo habilita:** el usuario **recién ve a sus competidores al kickoff (28/06)**.
Entonces no hace falta meterlo en una liga puntual al pagar: podés **juntar todas las
inscripciones y repartirlas al cierre** en la cantidad de ligas que convenga.

**La idea (tu ejemplo):** con 220 anotados, hacer **3 ligas de ~73** en vez de **2 de 100 + 1 de 20**
(evitar la liga "fea" de 20). El **balanceo parejo** es bueno para la sensación competitiva y la
óptica. **Pero la economía decide el tamaño, no la prolijidad:**

- Premio **FIJO $400.000 por liga**. **Break-even = 80 pagos/liga** (80 × $5.000 = $400.000).
- **220 en 3 ligas de ~73** → las tres quedan **por debajo de 80** → **las tres pierden plata**:
  ingreso 220 × $5.000 = **$1.100.000** vs premio 3 × $400.000 = **$1.200.000** = **−$100.000**.
  Es *peor* que el problema que querías evitar.
- **220 en 2 ligas de 100 + 20 afuera**: premio 2 × $400.000 = $800.000, ingreso de los 200 =
  $1.000.000 → **+$200.000**. Queda resolver qué hacés con los 20 (lista de espera / próxima copa / reembolso).

**Regla sana:** balanceá parejo **pero nunca bajes de ~80–100 pagos por liga** (si no, cada liga
nueva es plata perdida).

| Con 220 anotados | Resultado casa | Veredicto |
|---|---|---|
| 3 ligas de ~73 ($400k c/u) | −$100.000 | ❌ tres ligas en pérdida |
| 2 ligas de 100 + 20 en espera | +$200.000 | ✅ recomendado (resolver los 20) |
| 2 ligas de ~110 (subir capacity) | +$300.000 | ✅ si aceptás ligas de 110 |
| 3 ligas de ~73 con **premio que escala al tamaño** | ~equilibra | ⚠️ cambia lo prometido ($400k) → B&C + comunicación |

→ **Recomendación:** mantené **$400k fijo + ligas de ~100 (mínimo ~80)** y repartí los inscriptos
en **múltiplos cómodos de eso**. Hook de marketing que cae redondo: **"cada 100 que entran, se
abre otra copa de $400.000"** (coincide con el break-even). Si querés ligas de tamaño libre (73),
**tenés que pasar a premio que escala con el tamaño** — decisión de producto + legal + marketing,
no solo de reparto.

> **Dependencia técnica (no es lo que hay hoy):** el backend actual **inscribe en una liga FIJA al
> pagar** (con chequeo de cupo). El balanceo al kickoff = inscribir en un **"pool" y repartir al
> cierre** → **cambio de ingeniería** + define el desempate/asignación. Anotado en el checklist.

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

> Como hay plata real, cuidá el "sin reembolso" y el encuadre del premio → que coincida con las
> **Bases y Condiciones** (riesgo legal, ver checklist).

---

## 7. Calendario día por día (20/06 → 28/06) — Copa #1
Fases: **Lanzamiento → Educación/Prueba → Escasez → Último llamado.** Cada día = scoreboards de
siempre (con CTA Copa) + 1 post dedicado + stories. **El tramo 2 (Copa #2) reusa este mismo
calendario comprimido** según los días que queden cuando se libere.

| Día | Fecha | Fase | Post dedicado (ángulo) | Stories | Pauta (Tramo 1) |
|---|---|---|---|---|---|
| **D-8** | 20/06 | 🚀 Lanzamiento | **HERO 1 — "Llega la Copa GOLDEN TICKET"**: premio $400k garantizado, cupo 100, entrada $5.000, abre HOY. | Anuncio + countdown + link a `/copa` | **Activar retargeting + prospecting** (HERO 1) |
| **D-7** | 21/06 | Educación | **¿Cómo funciona?** Jugás con tu equipo, rankea desde 16vos, 5 cambios gratis para inscriptos. | Tutorial 3 frames + encuesta | HERO 2 (cómo funciona) a retargeting |
| **D-6** | 22/06 | Educación/Prueba | **La distribución del premio** (gráfico top 10: 1°=$120k…). | Desglose del premio + link | Sigue HERO 1+2 |
| **D-5** | 23/06 | Prueba/Confianza | **"El premio lo pone la casa, se reparte sí o sí"** (anti-objeción "¿es real?"). | Q&A / FAQ | Cortar el creativo que peor convierte |
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
- **Objetivo**: llenar **1 copa de 100**. Abrir más es **discrecional** (días + confianza, **nunca con horas**).
- **Budget**: **escalonado, $100k por copa**, liberado por demanda (no $300k de entrada). Sobra → no se gasta / financia la copa siguiente.
- **Tamaño de liga**: con premio fijo $400k, **mínimo ~80–100 pagos por liga** (break-even 80). Balancear inscriptos parejo **sin** bajar de ahí; ligas chicas (73) solo con **premio que escale al tamaño**. Hook: "cada 100 → otra copa de $400k".
- **Asignación**: como el usuario ve rivales recién al kickoff, se puede **repartir al cierre** (requiere cambio de backend; hoy asigna a liga fija al pagar).
- **Posts/día**: 2 scoreboards (con CTA Copa) + **1 post dedicado** + **3–5 stories**.
- **Stories**: contenido propio (countdown, **cupo en vivo**, engagement) **+** algo de redirección.
- **Pauta**: por tramo de $100k → **retargeting (45%) > prospecting (35%) > empuje final (15%) > X test (5%)**.
- **Pocas vs muchas**: **híbrido** — 2–3 creativos HERO pauteados + orgánico variado gratis.
- **Red**: **~90% Meta (IG+FB) / 10% X opcional**; X sobre todo **orgánico**. **No 50/50.**
- **Todo gateado** a que B&C + `/copa` + MP estén live antes del primer post.
