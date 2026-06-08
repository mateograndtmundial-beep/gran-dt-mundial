"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { createPinOrder } from "@/lib/payment-actions";
import { Card } from "@/components/ui";
import { Eyebrow, PrimaryButton } from "@/components/editorial";

type Product = {
  sku: string;
  name: string;
  pins: number;
  priceArs: number | null;
  unlimited: boolean;
};

// Precio de referencia ($/pin del pack más chico) contra el que medimos el ahorro de los demás.
const BASE_PRICE_PER_PIN = 1500;

function formatArs(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

export function PinStore({
  balance,
  isPremium,
  products,
}: {
  balance: number;
  isPremium: boolean;
  products: Product[];
}) {
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

  const packs = products.filter((p) => !p.unlimited);
  const unlimited = products.find((p) => p.unlimited);

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-4">
        <Eyebrow>Tu saldo</Eyebrow>
        {isPremium ? (
          <span className="flex items-center gap-1.5 jersey-numeral text-2xl text-gold-ink">
            <Crown size={20} className="text-gold" aria-hidden />
            ilimitado
          </span>
        ) : (
          <span className="jersey-numeral text-2xl text-blue">
            {balance} <span className="text-sm text-ink-3">pines</span>
          </span>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {packs.map((p) => {
          const pricePerPin = p.priceArs != null && p.pins > 0 ? p.priceArs / p.pins : null;
          const savingsPct =
            pricePerPin != null ? Math.round((1 - pricePerPin / BASE_PRICE_PER_PIN) * 100) : 0;
          return (
            <Card key={p.sku} className="flex flex-col items-center gap-2 p-4 text-center">
              <span className="jersey-numeral text-4xl text-ink">{p.pins}</span>
              <Eyebrow>{p.pins === 1 ? "pin" : "pines"}</Eyebrow>
              <p className="text-sm font-semibold text-ink-2">
                {p.priceArs != null ? `${formatArs(p.priceArs)} ARS` : "—"}
              </p>
              {pricePerPin != null && (
                <p className="text-xs text-ink-3">
                  {formatArs(Math.round(pricePerPin))} c/u
                  {savingsPct > 0 && (
                    <span className="ml-1.5 inline-flex items-center rounded-[4px] bg-gold-bg px-1.5 py-0.5 font-semibold text-gold-ink">
                      −{savingsPct}%
                    </span>
                  )}
                </p>
              )}
              <PrimaryButton
                onClick={() => buy(p.sku)}
                disabled={busy !== null || p.priceArs == null}
                className="w-full justify-center"
              >
                {busy === p.sku ? "Redirigiendo…" : "COMPRAR"}
              </PrimaryButton>
            </Card>
          );
        })}
      </div>

      {unlimited && (
        <Card className="flex flex-col items-center gap-2 border-gold-border bg-gold-bg p-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="flex items-center gap-1.5">
              <Crown size={18} className="text-gold" aria-hidden />
              <Eyebrow className="text-gold-ink">{unlimited.name}</Eyebrow>
            </span>
            <p className="text-sm font-semibold text-ink">
              Cambios ilimitados durante todo el Mundial — nunca más te quedás sin pines.
            </p>
            <p className="text-sm text-ink-3">
              {unlimited.priceArs != null ? `${formatArs(unlimited.priceArs)} ARS` : "—"} · pago único
            </p>
          </div>
          {isPremium ? (
            <span className="jersey-numeral shrink-0 text-sm text-gold-ink">Ya lo tenés ✓</span>
          ) : (
            <PrimaryButton
              onClick={() => buy(unlimited.sku)}
              disabled={busy !== null || unlimited.priceArs == null}
              className="w-full shrink-0 justify-center sm:w-auto"
            >
              {busy === unlimited.sku ? "Redirigiendo…" : "COMPRAR"}
            </PrimaryButton>
          )}
        </Card>
      )}

      {msg && <p className="text-sm font-semibold text-danger">{msg}</p>}
      <p className="text-xs text-ink-3">
        Pagos con Mercado Pago (Argentina). El saldo se acredita al confirmarse el pago.
      </p>
    </div>
  );
}
