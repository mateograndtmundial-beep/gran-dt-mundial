# Plan de comunicación en redes — Lanzamiento Copa GOLDEN TICKET

> Estrategia de redes para llenar la **Copa GOLDEN TICKET** (cupo 100, entrada $5.000,
> premio fijo $400.000 al top 10) antes del **cierre = kickoff de 16vos (28/06)**.
> Budget asumido: **$300.000 ARS**. Hoy es **19/06** → la inscripción abre con la 1ra
> publicación (arrancamos **mañana 20/06**, quedan 8 días de campaña + el día del cierre).
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

## 0. Insight que cambia toda la estrategia
**Solo necesitás 100 inscriptos, y ya tenés una audiencia caliente** (la gente que recibe tus
2 carruseles diarios y que YA juega). Llenar 100 lugares desde un público que ya te sigue **no
requiere $300.000 de pauta**. La conversión más barata y probable sale de:
- Tu **alcance orgánico diario** (los scoreboards) con el CTA de la Copa integrado.
- **Retargeting** de quienes ya entraron al sitio / interactuaron / juegan.

→ **Recomendación central: orgánico primero, pauta sobre todo de retargeting, y reservá budget.**
Gastar los $300k completos para conseguir 100 entradas de $5.000 (recauda $500k, margen casa
$100k) **no cierra** salvo que lo midas como **inversión de adquisición del juego entero** (el
negocio real son los pines, no la entrada). Por eso abajo separo dos filosofías de gasto.

---

## 1. ¿Cuántas publicaciones por día?
Ya subís **2 carruseles de puntajes/día** (uno por grupo). **No los toques como motor de
contenido** — son tu alcance orgánico gratis. La Copa se monta encima así:

| Tipo | Cadencia | Para qué |
|---|---|---|
| **Scoreboards (ya existen)** | 2/día | Mantener el alcance. **Agregar CTA de la Copa** en el caption + 1 slide final "Sumate a la Copa". |
| **Post dedicado de la Copa (feed)** | **1/día** | Una pieza por día con un ángulo distinto (calendario abajo). |
| **Stories** | **3–5/día** (ramp a 6 en las últimas 48 h) | Recordatorio, cupo en vivo, countdown, redirección al post. |

**No más de 1 post dedicado/día en feed**: más que eso fatiga al feed y compite con tus propios
scoreboards. La frecuencia alta va por **stories**, que es donde el público caliente convierte.

---

## 2. Stories: ¿solo redirección o contenido propio?
**Ambas, pero el grueso es contenido propio.** Las stories son tu mejor superficie para un
público que ya te sigue (link sticker + countdown + encuestas). Mezcla diaria sugerida:
- **1 redirección** al post del día ("mirá esto 👆 / deslizá").
- **1 countdown sticker** a 28/06 (urgencia automática).
- **1 de cupo en vivo** ("quedan X de 100" — `getCopasStatus` da el dato).
- **1 de engagement** (encuesta/quiz: "¿te animás?", "¿a quién ponés de capitán?").
- **1 con link sticker directo a `/copa`** (la de conversión pura).

Solo-redirección sería desperdiciar el formato: las stories standalone con countdown/cupo
**generan urgencia** que un post no puede.

---

## 3. ¿Promocionar? ¿Cuánto $$?
**Sí, pero poco y quirúrgico.** El objetivo (100) es chico; la pauta sirve más para **acelerar
el ritmo** y **retargetear** que para alcance masivo. Propuesta de reparto de los $300.000:

| Partida | $ | % | Por qué |
|---|---|---|---|
| **Reserva / contingencia** | $60.000 | 20% | Para escalar el empuje final si el ritmo va atrasado. No se gasta si llenás antes. |
| **Retargeting Meta** (visitantes del sitio, engagers IG/FB, lista de jugadores) | $120.000 | 40% | **El mejor ROI**: público que ya te conoce. Acá va la plata. |
| **Prospecting Meta** (lookalike de jugadores + interés fútbol/fantasy AR) | $80.000 | 27% | Llena la Copa **y** suma jugadores nuevos al juego (LTV de pines). |
| **Empuje final 48 h** (Meta, conversión) | $30.000 | 10% | Front-load de la reserva en la recta final (la escasez convierte). |
| **Test X/Twitter (opcional)** | $10.000 | 3% | Solo si querés medir; X orgánico es el plan real (ver §6). |

> **Mi recomendación honesta:** arrancá gastando **~$120–150k** (retargeting + algo de
> prospecting) y **mantené el resto como reserva**. Si a mitad de campaña vas holgado para los
> 100, **no quemes el resto** — reservalo para la **2da copa** o para adquisición general del
> juego. Gastar $300k completos solo se justifica si lo encuadrás como **campaña de crecimiento
> del juego** (más jugadores → más pines), no como "costo de llenar 100 lugares".

---

## 4. ¿Pocas muy promocionadas o varias poco promocionadas?
**Pocas piezas HERO muy respaldadas + muchas piezas orgánicas (gratis).** No es uno u otro:
- **Pauta** concentrada en **2–3 creativos HERO** (el de premio garantizado, el de "cómo
  funciona", el de escasez/cupo). Concentrar presupuesto en pocos creativos da **datos más
  limpios** y evita diluir.
- **Orgánico** variado y diario (calendario §7): muchos ángulos, costo $0, mantienen el tema vivo.

| Alternativa | Ventajas | Desventajas |
|---|---|---|
| **Pocas muy promocionadas** | Aprendizaje rápido del algoritmo, mensaje claro, fácil de medir. | **Riesgo de fatiga** en una audiencia chica (ven el mismo aviso muchas veces). |
| **Muchas poco promocionadas** | Variedad, menos fatiga, cubre más ángulos. | Presupuesto diluido, el algoritmo nunca optimiza bien, difícil leer qué funciona. |
| **Híbrido (recomendado)** | Pauta enfocada (hero) + variedad orgánica gratis. Lo mejor de los dos. | Requiere disciplina: no caer en promocionar todo "un poco". |

**Mitigación de fatiga** (clave porque tu público es chico): rotá 2–3 creativos en el mismo
conjunto de anuncios y **capá la frecuencia** (~2–3 impresiones/persona/semana).

---

## 5. Instagram vs Twitter (X): ¿y la pauta 50/50?
**No 50/50.** Para **pauta de conversión**, la decisión real es **Meta (IG+FB) vs X**, y **Meta
gana claro** para este público (fantasy fútbol AR/LatAm): mejor targeting, retargeting, objetivo
de conversión y placement de Stories. X Ads en Argentina rinde flojo para respuesta directa.

| Red | Rol | % de pauta | Por qué |
|---|---|---|---|
| **Meta (Instagram + Facebook)** | **Motor de conversión** (feed + stories + reels) | **~90%** | Donde está tu audiencia y tus herramientas (carruseles, stories, link). IG y FB comparten Ads Manager → corrés ambos placements de una. |
| **X / Twitter** | **Amplificador orgánico en tiempo real** | **~0–10%** (casi todo orgánico) | Hilos durante los partidos + **tweet fijado** con el link de la Copa. Pauta solo como test chico, no como pilar. |

→ **Instagram es el pilar; Twitter acompaña orgánico.** Si querés un número: **90% Meta / 10% X
(y ese 10% es opcional)**. 50/50 sería regalar plata a la red que peor convierte acá.

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
9. **Un gancho de engagement** (pregunta/encuesta) — más comentarios = más alcance.
10. **Marca consistente** (paleta dorada premium, Archivo Black — ver `VISUAL-SYSTEM.md`).

> Disclaimer de mensaje: como hay plata real, cuidá el "sin reembolso" y el encuadre del premio
> → que coincida con las **Bases y Condiciones** (riesgo legal, ver checklist).

---

## 7. Calendario día por día (20/06 → 28/06)
Fases: **Lanzamiento → Educación/Prueba → Escasez → Último llamado.** Cada día = scoreboards de
siempre (con CTA Copa) + 1 post dedicado + stories.

| Día | Fecha | Fase | Post dedicado (ángulo) | Stories | Pauta |
|---|---|---|---|---|---|
| **D-8** | 20/06 | 🚀 Lanzamiento | **HERO 1 — "Llega la Copa GOLDEN TICKET"**: premio $400k garantizado, cupo 100, entrada $5.000, abre HOY. | Anuncio + countdown sticker + link a `/copa` | **Activar retargeting + prospecting** (creativo HERO 1) |
| **D-7** | 21/06 | Educación | **¿Cómo funciona?** Jugás con tu equipo, rankea desde 16vos, 5 cambios gratis para inscriptos. | Tutorial 3 frames + encuesta "¿te animás?" | HERO 2 (cómo funciona) a retargeting |
| **D-6** | 22/06 | Educación/Prueba | **La distribución del premio** (gráfico top 10: 1°=$120k…). | Desglose del premio + link | Sigue HERO 1+2 |
| **D-5** | 23/06 | Prueba/Confianza | **"El premio lo pone la casa, se reparte sí o sí"** (anti-objeción "¿es real?"). | Q&A / "preguntas frecuentes" | Optimizar: cortar el creativo que peor convierte |
| **D-4** | 24/06 | Escasez (arranca) | **Cupo en vivo**: "Ya se anotaron X. Quedan Y de 100." | Cupo en vivo (actualizar el número) | Subir presupuesto al mejor creativo |
| **D-3** | 25/06 | Escasez | **Testimonios / social proof** o "los equipos que ya están adentro". | Cupo + countdown + encuesta | Empezar a usar la reserva si vas atrasado |
| **D-2** | 26/06 | Urgencia | **"Faltan 2 días"** — recordatorio fuerte con deadline. | Countdown intensivo (varias) + link | Empuje final (HERO escasez) |
| **D-1** | 27/06 | Urgencia | **"Última chance, cierra mañana"**. | Cupo + countdown + "no te quedes afuera" | Máximo gasto del empuje 48 h |
| **D-0** | 28/06 | 🔔 Último llamado | **"CIERRA HOY antes del primer partido"** (a la mañana). | Cuenta regresiva por horas hasta el kickoff | Última pauta corta; cortar al cerrar |

**Reusá tu tooling**: las placas de la Copa siguen `VISUAL-SYSTEM.md`; el gráfico de premio y el
contador pueden ser plantillas nuevas en `assets/`. Captions con la voz de `COPY-VOICE.md`.

---

## 8. Métricas y regla de decisión (importante con target chico)
- **Ritmo objetivo**: 100 inscriptos en ~8 días ≈ **12–13/día**. Es tu termómetro.
- **Si vas ADELANTADO** (p. ej. D-4 con 70+): **frená la pauta**, dejá correr el orgánico + escasez. Reservá la plata.
- **Si vas ATRASADO**: subí escasez (cupo en vivo), activá la reserva, reforzá retargeting.
- **KPIs a mirar**: lugares ocupados/día, costo por inscripto (CPA), link taps en stories, % de inscriptos que vienen de retargeting vs prospecting.
- **CPA techo**: si encuadrás la entrada sola ($5.000), un CPA > $5.000 pierde plata **en la entrada** (pero podés justificarlo por el LTV de pines). Decidí de antemano cuál es tu techo.

---

## 9. Resumen de decisiones recomendadas
- **Posts/día**: 2 scoreboards (con CTA Copa) + **1 post dedicado** + **3–5 stories**.
- **Stories**: contenido propio (countdown, cupo en vivo, engagement) **+** algo de redirección.
- **Pauta**: **sí, ~$120–150k** efectivos (resto reserva); **retargeting > prospecting > frío**.
- **Pocas vs muchas**: **híbrido** — 2–3 creativos HERO pauteados + orgánico variado gratis.
- **Red**: **~90% Meta (IG+FB) / 10% X opcional**; X sobre todo **orgánico**. **No 50/50.**
- **Filosofía de gasto**: orgánico primero (audiencia caliente); la pauta acelera y retargetea;
  el budget completo solo se justifica como **adquisición del juego entero**, no para llenar 100 lugares.
- **Todo gateado** a que B&C + `/copa` + MP estén live antes del primer post.
