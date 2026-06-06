# Scripts de datos

Cargar el torneo y poner precios a los jugadores son **3 pasos**, cada uno con una sola fuente:

```bash
npm run seed           # 1. API-Football  → torneo + planteles completos
npm run prices:fetch   # 2. Transfermarkt → valores de mercado
npm run prices:apply   # 3. cruce         → precio de cada jugador
```

Requisitos en `.env`: `DATABASE_URL` (Neon) y `API_FOOTBALL_KEY`.

---

## 1. `npm run seed` — API-Football

Trae **toda** la data del torneo de API-Football (api-sports.io, `league=1 season=2026`):
selecciones, fixture, técnicos y el plantel de cada selección.

Para cada jugador guarda el **nombre completo**, **club** y **año de nacimiento**
(el endpoint de planteles solo da el nombre abreviado tipo "T. Courtois", así que
por cada jugador se consulta `/players?id=&season=` — por eso tarda algunos minutos).
La lógica de nombre/club/nacimiento está en `lib/api-football/enrich.ts`.

Es **idempotente** (`onConflictDoUpdate`) y **no pisa el `price`** (lo fija el paso 3
o el admin). Re-correrlo refresca nombres y clubes (p.ej. tras el mercado de pases).

## 2. `npm run prices:fetch` — Transfermarkt

Baja el dataset público de valores de mercado de
[dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets)
(**se descarga solo** a `data/players.csv` si no está), lo filtra a los jugadores
que están en la DB y emite `data/market-values.json`.

```bash
npm run prices:fetch                          # auto-descarga el CSV
npm run prices:fetch -- /otra/ruta/players.csv  # usar otro CSV
```

## 3. `npm run prices:apply` — cruce y precios

Cruza el plantel con los valores de mercado y escribe el precio (continuo, 5,0–60,0M,
1 decimal). Imprime una **calibración** (distribución, XI de ensueño vs presupuesto,
top-10, y los jugadores sin match que quedan en el piso para ajustar en `/admin/precios`).

```bash
npm run prices:apply           # escribe
npm run prices:apply -- --dry  # solo calcula y muestra calibración
```

El cruce (TM no comparte ID con API-Football) usa tiers de nombre/apellido + país +
**año de nacimiento** (la señal más fuerte). Detalle en `scripts/price-players.ts`.

> **Precios manuales (`priceManual`)**: los precios fijados a mano desde `/admin/precios`
> marcan la columna `players.price_manual = true`, y `prices:apply` **los respeta** (no los
> recalcula ni los pisa). Así los ajustes manuales sobreviven a cualquier re-corrida. `seed`
> tampoco toca `price`. El único modo de resetear un precio manual es ponerlo de nuevo en el admin.

### Calibración

Todo se tunea en `lib/game/config.ts` → `PRICING` (y `BUDGET`):

- `MIN` / `MAX`: piso y techo del precio (5 / 60).
- `MV_REF_PERCENTILE`: qué percentil del valor de mercado mapea al techo. Más alto =
  menos jugadores pegados en 60M, elite más diferenciada (y precios medios más bajos).
- `GAMMA`: curvatura (`<1` levanta los medios, `>1` los aplana).

Después de tunear, re-corré `npm run prices:apply` (es idempotente).

> `data/players.csv` y `data/market-values.json` están gitignoreados (se regeneran).
