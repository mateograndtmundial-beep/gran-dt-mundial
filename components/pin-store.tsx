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
  priceUsd: number | null;
  unlimited: boolean;
};

// Precio de referencia ($/pin del pack más chico) contra el que medimos el ahorro de los demás
// (cada moneda contra su propia base — son escalas distintas).
const BASE_PRICE_PER_PIN_ARS = 1500;
const BASE_PRICE_PER_PIN_USD = 1.5;

function formatArs(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function formatUsd(n: number) {
  return `US$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function PinStore({
  balance,
  isPremium,
  detectedCountry,
  dlocalReady,
  products,
}: {
  balance: number;
  isPremium: boolean;
  detectedCountry: string;
  dlocalReady: boolean;
  products: Product[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const country = detectedCountry;

  const isAr = country === "AR";
  // Fuera de AR, mientras dLocal no tenga credenciales no ofrecemos la compra (evita botones rotos).
  const purchaseLocked = !isAr && !dlocalReady;
  const basePricePerPin = isAr ? BASE_PRICE_PER_PIN_ARS : BASE_PRICE_PER_PIN_USD;

  async function buy(sku: string) {
    setBusy(sku);
    setMsg(null);
    const r = await createPinOrder(sku, country);
    if (!r.ok) {
      setBusy(null);
      if (r.error === "auth") return router.push("/sign-in");
      if (r.error === "unavailable") {
        return setMsg("Todavía no podemos procesar pagos en tu país. ¡Pronto vamos a sumarlo!");
      }
      return setMsg("No se pudo iniciar la compra. Probá de nuevo.");
    }
    window.location.assign(r.url); // redirige al checkout del proveedor (Mercado Pago / dLocal)
  }

  const packs = products.filter((p) => !p.unlimited);
  const unlimited = products.find((p) => p.unlimited);

  // Precio + formateo en la moneda activa según el país elegido.
  function priceOf(p: Product) {
    return isAr ? p.priceArs : p.priceUsd;
  }
  function formatPrice(n: number) {
    return isAr ? `${formatArs(n)} ARS` : `${formatUsd(n)} USD`;
  }
  function formatUnit(n: number) {
    return isAr ? formatArs(Math.round(n)) : formatUsd(Math.round(n * 100) / 100);
  }

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

      {purchaseLocked && (
        <p className="rounded-[6px] border border-gold-border bg-gold-bg px-3 py-2 text-sm font-semibold text-gold-ink">
          Todavía no podemos procesar pagos en tu país — ¡pronto vamos a sumarlo!
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {packs.map((p) => {
          const price = priceOf(p);
          const pricePerPin = price != null && p.pins > 0 ? price / p.pins : null;
          const savingsPct =
            pricePerPin != null ? Math.round((1 - pricePerPin / basePricePerPin) * 100) : 0;
          return (
            <Card key={p.sku} className="flex flex-col items-center gap-2 p-4 text-center">
              <span className="jersey-numeral text-4xl text-ink">{p.pins}</span>
              <Eyebrow>{p.pins === 1 ? "pin" : "pines"}</Eyebrow>
              <p className="text-sm font-semibold text-ink-2">{price != null ? formatPrice(price) : "—"}</p>
              {pricePerPin != null && (
                <p className="text-xs text-ink-3">
                  {formatUnit(pricePerPin)} c/u
                  {savingsPct > 0 && (
                    <span className="ml-1.5 inline-flex items-center rounded-[4px] bg-gold-bg px-1.5 py-0.5 font-semibold text-gold-ink">
                      −{savingsPct}%
                    </span>
                  )}
                </p>
              )}
              <PrimaryButton
                onClick={() => buy(p.sku)}
                disabled={busy !== null || price == null || purchaseLocked}
                className="w-full justify-center"
              >
                {busy === p.sku ? "Redirigiendo…" : purchaseLocked ? "PRÓXIMAMENTE" : "COMPRAR"}
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
              {priceOf(unlimited) != null ? formatPrice(priceOf(unlimited)!) : "—"} · pago único
            </p>
          </div>
          {isPremium ? (
            <span className="jersey-numeral shrink-0 text-sm text-gold-ink">Ya lo tenés ✓</span>
          ) : (
            <PrimaryButton
              onClick={() => buy(unlimited.sku)}
              disabled={busy !== null || priceOf(unlimited) == null || purchaseLocked}
              className="w-full shrink-0 justify-center sm:w-auto"
            >
              {busy === unlimited.sku ? "Redirigiendo…" : purchaseLocked ? "PRÓXIMAMENTE" : "COMPRAR"}
            </PrimaryButton>
          )}
        </Card>
      )}

      {msg && <p className="text-sm font-semibold text-danger">{msg}</p>}
      <p className="text-xs text-ink-3">
        {isAr
          ? "Pagos con Mercado Pago (Argentina)."
          : "Pagos con dLocal (LatAm)."}{" "}
        El saldo se acredita al confirmarse el pago.
      </p>
    </div>
  );
}
