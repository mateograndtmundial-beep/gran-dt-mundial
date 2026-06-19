"use client";

import { PrimaryButton } from "@/components/editorial";

/**
 * CTA de inscripción a la Copa GOLDEN TICKET.
 *
 * ⚠️ PAGO PENDIENTE (TODO): por ahora el botón queda DESHABILITADO ("Próximamente").
 * El backend ya tiene `createEntryOrder(entrySku)` listo (devuelve `{ ok, url }`); cuando
 * se destrabe lo legal/fiscal, conectar acá:
 *
 *   import { createEntryOrder } from "@/lib/payment-actions";
 *   const r = await createEntryOrder(entrySku);
 *   if (r.ok) window.location.assign(r.url);   // redirige al checkout de Mercado Pago
 *   else { ...manejar "closed" | "full" | "already" | "unavailable" | "auth"... }
 *
 * El `entrySku` ya viene cableado por props para no tener que tocar el render después.
 */
export function EnrollButton({ entrySku }: { entrySku: string | null }) {
  return (
    <PrimaryButton
      disabled
      // TODO: pago — onClick={() => createEntryOrder(entrySku).then(r => r.ok && window.location.assign(r.url))}
      data-entry-sku={entrySku ?? undefined}
      className="w-full justify-center bg-gold-ink hover:bg-gold-ink"
    >
      PRÓXIMAMENTE
    </PrimaryButton>
  );
}
