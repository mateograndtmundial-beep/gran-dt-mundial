<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Reglas de UI (LEER si tocás UI)

**Toda la UI debe ser 100% responsive.** Se tiene que ver bien en **mobile y desktop** (≈320px → 1920px+), **sin scroll horizontal**. La mayoría de los usuarios entra desde el **celular**, así que un cambio que solo anda en desktop está roto. Si tocás UI, **verificá el render en mobile** (no lo des por hecho). Más detalle en `docs/PROJECT-CONTEXT.md` (§ Cómo trabajar, regla 9) y `docs/ui/UI-DIRECTION.md`.
