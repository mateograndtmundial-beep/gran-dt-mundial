# Índice de `/docs` — Los 11 de Sampa

> La app está **en producción** (https://www.los11desampa.com). Esta carpeta es la
> documentación operativa; el diseño completo del juego vive en [`../SPEC.md`](../SPEC.md).

| Doc | Para qué sirve | Leelo si... |
|---|---|---|
| [`../SPEC.md`](../SPEC.md) | Diseño original del juego completo: mecánicas, puntaje, modelo de datos, roadmap. Fuente de verdad de diseño. | Necesitás entender **por qué** el juego funciona así (reglas, scoring, formaciones). |
| [`PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) | **Handoff completo para agentes/devs nuevos**: stack, rutas, modelo de datos, lógica de negocio, mapa de archivos, gotchas. | Sos nuevo en el repo y necesitás contexto sin re-descubrirlo. **Empezá acá.** |
| [`PRODUCCION.md`](./PRODUCCION.md) | **Runbook de producción y seguridad**: qué está live, comandos peligrosos contra la DB compartida, deploy, scoring irreversible, datos de usuarios que no se tocan, checklist pre-push. | Vas a tocar algo que pueda impactar lo que ya está live (DB, deploy, scoring, pagos). **Léelo antes de correr cualquier script o migración.** |
| [`PINES-API.md`](./PINES-API.md) | Contrato del backend de pines/pagos para el frontend (server actions, flujo de compra). | Vas a tocar `/pines` o algo que consuma pines/pagos desde el front. |
| [`TODO.md`](./TODO.md) | Pendientes técnicos concretos (post Fase 2): fotos a hosting propio, cadencia del cron, edge cases de fechas, hardening de pagos. | Buscás en qué seguir o querés saber qué riesgos conocidos quedan abiertos. |
| [`MONETIZACION.md`](./MONETIZACION.md) | Liga Premium (ligas premium): propuesta, decisiones de negocio, modelo económico, riesgos. El cobro en Mercado Pago aparece como "GOLDEN TICKET". | Vas a tocar la feature de ligas premium / monetización por copas. |
| [`COPA-CHECKLIST.md`](./COPA-CHECKLIST.md) | **Archivo guía de la Liga Premium**: estado, decisiones cerradas y checklist de lo que falta (legal, fiscal, técnico, marketing) para salir live. | Querés saber qué falta para activar la Liga Premium o en qué seguir. |
| [`COPA-UI-INSCRIPCION-PLAN.md`](./COPA-UI-INSCRIPCION-PLAN.md) | Plan de la UI de inscripción a la Liga Premium (scaffold sin construir): superficies, componentes, datos ya disponibles. | Vas a implementar el front de la Liga Premium. |
| [`ui/UI-DIRECTION.md`](./ui/UI-DIRECTION.md) | Dirección de diseño/UI: sistema editorial, paleta, componentes, reglas de responsive. | Vas a tocar cualquier UI — recordá que **todo tiene que andar en mobile y desktop**. |
| [`social/`](./social/README.md) | **Dirección estética de redes** (fuente de la verdad): sistema visual de las placas (carrusel/story), formatos por plataforma + cómo generarlas, y voz/copy/estrategia (IG/FB/X). | Vas a generar contenido para redes (placas o captions). |

## Orden sugerido para alguien nuevo
1. `PROJECT-CONTEXT.md` — contexto general.
2. `PRODUCCION.md` — antes de tocar nada que impacte lo live.
3. El doc específico de lo que vas a hacer (`PINES-API.md`, `ui/UI-DIRECTION.md`, `SPEC.md`).
