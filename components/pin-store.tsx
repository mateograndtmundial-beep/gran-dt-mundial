"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPinOrder } from "@/lib/payment-actions";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";

type Product = { sku: string; name: string; pins: number; priceArs: number | null };

export function PinStore({ balance, products }: { balance: number; products: Product[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function buy(sku: string) {
    setBusy(sku);
    setMsg(null);
    const r = await createPinOrder(sku, "AR"); // Argentina / ARS (Mercado Pago)
    if (!r.ok) {
      setBusy(null);
      if (r.error === "auth") return router.push("/sign-in");
      return setMsg("No se pudo iniciar la compra. Probá de nuevo.");
    }
    window.location.assign(r.url); // redirige al checkout de Mercado Pago
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-4">
        <Eyebrow>Tu saldo</Eyebrow>
        <span className="jersey-numeral text-2xl text-blue">
          {balance} <span className="text-sm text-ink-3">pines</span>
        </span>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {products.map((p) => (
          <Card key={p.sku} className="flex flex-col items-center gap-2 p-4 text-center">
            <span className="jersey-numeral text-4xl text-ink">{p.pins}</span>
            <Eyebrow>{p.pins === 1 ? "pin" : "pines"}</Eyebrow>
            <p className="text-sm font-semibold text-ink-2">
              {p.priceArs != null ? `$${p.priceArs.toLocaleString("es-AR")} ARS` : "—"}
            </p>
            <PrimaryButton
              onClick={() => buy(p.sku)}
              disabled={busy !== null || p.priceArs == null}
              className="w-full justify-center"
            >
              {busy === p.sku ? "Redirigiendo…" : "COMPRAR"}
            </PrimaryButton>
          </Card>
        ))}
      </div>

      {msg && <p className="text-sm font-semibold text-danger">{msg}</p>}
      <p className="text-xs text-ink-faint">
        Pagos con Mercado Pago (Argentina). El saldo se acredita al confirmarse el pago.
      </p>
    </div>
  );
}
