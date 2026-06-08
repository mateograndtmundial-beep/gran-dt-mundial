# Pines — contrato de backend para el frontend

> 🟢 `/pines` ya está **en producción** (Mercado Pago activo para Argentina; dLocal
> feature-flaggeado, "próximamente" para el resto de LatAm hasta tener credenciales —
> ver `docs/PRODUCCION.md` §1 y §6). Este doc describe el contrato **vigente** que expone
> el backend — no hay que recrear `/pines`, sino consumir/extender lo que ya existe.

Todo lo que el front necesita para la tienda de pines y los cambios. **No hay que tocar el backend de pagos** — solo llamar a estas funciones. Si vas a tocar algo que mueve plata o pines reales, primero leé `docs/PRODUCCION.md` §6 (riesgos abiertos de pagos).

## Server actions / queries (importar desde el server)

| Función | Import | Devuelve |
|---|---|---|
| `getActiveProducts()` | `@/lib/queries` | `{ id, sku, name, pins, priceArs, priceUsd, active }[]` — packs de pines a mostrar |
| `getMyPins()` | `@/lib/payment-actions` | `number` — saldo de pines del usuario logueado |
| `createPinOrder(sku, country?)` | `@/lib/payment-actions` | `{ ok: true, url, orderId }` o `{ ok: false, error }` |
| `getOrderStatus(orderId)` | `@/lib/payment-actions` | `{ status, pins }` o `null` |

### Precios
Cada producto trae `priceArs` (pesos, para Mercado Pago/Argentina) y `priceUsd` (para dLocal/resto de LatAm). Mostrá el que corresponda al país del usuario.

### `createPinOrder(sku, country?)`
- `country` es **opcional**: si no lo pasás, se autodetecta por geo (header de Vercel) y cae en `AR` por defecto. Pasalo (ISO-2, ej. `"PY"`) si tenés un selector de país.
- Elige el proveedor solo: **AR → Mercado Pago**, resto → **dLocal**.
- Si `ok: true`, **redirigí al usuario a `url`** (checkout del proveedor).
- Errores posibles: `auth` (no logueado → mandar a /sign-in), `product`, `price`.

## Flujo de compra
1. Usuario toca "Comprar pack X" → `createPinOrder(sku)` → `window.location = url`.
2. Paga en el proveedor → vuelve a **`/pines?status=success&order=<orderId>`** (o `?status=failure`).
3. Esa página muestra "procesando…" y hace **polling** de `getOrderStatus(orderId)` cada ~2s.
4. Cuando `status === "paid"`, los pines ya están acreditados → mostrás el nuevo saldo (`getMyPins()`). ✅

> La acreditación de pines la hace el **webhook** (`/api/payments/webhook/[provider]`) de forma asíncrona e idempotente. Por eso la página de retorno hace polling en vez de confiar en el redirect.

## La página `/pines` (ya existe, en producción)
- **Tienda**: lista `getActiveProducts()`, muestra `getMyPins()`, botones de compra.
- **Retorno**: lee `?status` y `?order` del query. Si `success`, poleá `getOrderStatus(order)` hasta `paid` y refrescá el saldo. Si `failure`, muestra "el pago no se completó".
- Si vas a extenderla (nuevo país, nuevo flujo, etc.), seguí el mismo contrato de abajo — no inventes un camino paralelo a `createPinOrder`/`creditOrder`.

## Cómo se usan los pines (ya está en el backend)
- En **`/equipo`** (armador), al guardar: el **1er cambio de la fecha es gratis**; los extra **descuentan pines**.
- Si faltan pines, `saveLineup` devuelve `{ ok: false, error: "pins", needed, balance }` (el `FieldBuilder` ya muestra el mensaje). Ahí es donde conviene linkear a `/pines` para comprar.

## Webhooks (ya configurados, no tocar)
- Endpoint: `POST/GET /api/payments/webhook/mercadopago` y `/dlocal`.
- Mercado Pago y dLocal arman su `notification_url` solos a partir de `NEXT_PUBLIC_APP_URL`.
