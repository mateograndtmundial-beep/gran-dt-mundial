# Entornos: Local · Preview · Producción

Objetivo: poder **probar en Preview (con datos y pagos de prueba) antes de ir live a
producción**. Tres entornos, cada uno con su base, su auth y su pasarela de pago.

## Resumen

| | **Local** (`.env`) | **Vercel Preview** | **Vercel Producción** |
|---|---|---|---|
| Cuándo | dev en tu compu | cada push a una rama / PR | push a `main` |
| Base (Neon) | branch `dev` | branch `dev` | branch `main` (prod) |
| Auth (Clerk) | dev (`pk_test`) | dev (`pk_test`) | live (`pk_live`) |
| Pagos (MP) | sandbox (`TEST-`) | sandbox (`TEST-`) | producción (`APP_USR-`) |
| URL | `localhost:3000` | `…-git-<rama>.vercel.app` | `los11desampa.com` |

## Cómo funciona el deploy a Preview
Vercel ya auto-deploya `main` → producción. **Cada push a una rama distinta de `main`
(y cada PR) genera automáticamente un deploy de Preview** — no hay que configurar nada
extra para que exista. Lo único necesario es **cargar las env con scope `Preview`** (abajo)
para que ese deploy use base `dev`, Clerk dev y MP sandbox, y **no toque producción**.

La URL del preview la da Vercel (una por deploy + una estable por rama). El código ya
resuelve la base correcta en preview (`getAppBaseUrl()` en `lib/site.ts`), así que el
**retorno del pago y el webhook de MP vuelven al deploy de preview**, no a prod.

## Variables de entorno por scope
En **Vercel → Project → Settings → Environment Variables**, cada variable se asigna a uno
o más scopes (Production / Preview / Development).

### Cambian por entorno (cargar valores DISTINTOS en Production vs Preview)

| Variable | Production | Preview | De dónde se saca |
|---|---|---|---|
| `DATABASE_URL` | conn. branch `main` | conn. branch `dev` | Neon → Branch → Connection string (pooled) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | `pk_test_…` | Clerk → API Keys (instancia prod vs dev) |
| `CLERK_SECRET_KEY` | `sk_live_…` | `sk_test_…` | Clerk → API Keys |
| `MP_ACCESS_TOKEN` | `APP_USR-…` (prod) | `TEST-…` (sandbox) | MP → Tu app → Credenciales (producción vs prueba) |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | `APP_USR-…` (prod) | `TEST-…` (sandbox) | MP → Credenciales |
| `MP_WEBHOOK_SECRET` | secreto webhook prod | secreto webhook test | MP → Webhooks |
| `NEXT_PUBLIC_APP_URL` | `https://www.los11desampa.com` | **NO setear** (se deriva sola) | — |

> **`NEXT_PUBLIC_APP_URL` en Preview:** dejala **sin definir** en el scope Preview. Si no
> está, `getAppBaseUrl()` usa `VERCEL_BRANCH_URL` y los pagos vuelven al preview correcto.
> Si la seteás al dominio de prod, MP redirigiría a producción desde el preview.

### Van IGUAL en todos los scopes
`API_FOOTBALL_KEY`, `API_FOOTBALL_BASE_URL`, `API_FOOTBALL_LEAGUE_ID`, `API_FOOTBALL_SEASON`,
`NEXT_PUBLIC_TOURNAMENT_START`, las `NEXT_PUBLIC_CLERK_SIGN_*_URL`, `SLACK_*`, `CRON_SECRET`,
`DLOCAL_GO_*` (cuando exista la cuenta).

> Tips: en Preview podés poner `SLACK_NOTIFY_DEV=1` para ver las notis de prueba (van con
> tag `[preview]`). Los **cron jobs de Vercel solo corren en producción**, así que el preview
> nunca dispara `/api/cron/*`.

## Obtener cada credencial de prueba

### Neon — branch `dev`
1. Neon → tu proyecto → **Branches → Create branch** → nombre `dev`, *from* `main`.
2. Copiá su **connection string (pooled)** → es el `DATABASE_URL` de **Preview y Local**.
3. La branch `dev` nace con **copia de los datos de prod** (incluida la migración `0014`).
   Si querés datos limpios, reseteá la branch o seedeá aparte. **No expongas datos reales de
   usuarios** si vas a compartir el preview.

### Clerk — instancia Development
1. Clerk → selector de instancia → **Development** (las `pk_test`/`sk_test`).
2. Copiá `pk_test_…` y `sk_test_…`.
3. En esa instancia agregá `localhost:3000` y los dominios de preview a los orígenes permitidos.

### Mercado Pago — Sandbox
1. MP → **Tus integraciones → tu app → Credenciales de prueba**.
2. Copiá **Access Token** (`TEST-…`) y **Public Key** (`TEST-…`).
3. Pagá con **usuarios de prueba** (comprador/vendedor) — **no mezclar credencial de prueba
   con tarjeta real** (da *"una de las partes es de prueba"*).
4. Para probar el **webhook** en preview, cargá la URL de notificación del preview en la app
   de MP (el webhook **no llega a `localhost`**).

## Flujo de trabajo (rama → preview → prod)
1. Trabajás en una rama (`feat/…`) → push → Vercel crea el **Preview** (dev + sandbox).
2. Probás en el preview, incluido el flujo de pago real con MP sandbox (pago → webhook →
   inscripción/acreditación).
3. **Migraciones:** aplicá primero en la branch `dev` (`npm run db:migrate` apuntando a `dev`),
   verificá ahí, y recién después en `main`.
4. Cuando está OK → **merge a `main`** → deploy a producción (envs prod). La migración a `main`
   se aplica como paso del go-live.

## Local
Copiá `.env.example` a `.env` y completá con los valores **DEV** (Neon `dev`, Clerk `pk_test`,
MP sandbox). Así `npm run dev` pega contra `dev` y nunca contra los datos reales de prod.
