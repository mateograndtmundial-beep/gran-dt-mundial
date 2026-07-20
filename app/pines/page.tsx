import Link from "next/link";
import { headers } from "next/headers";
import { PageTitle, EmptyState } from "@/components/ui";
import { ValidationCallout } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getActiveProducts, isTournamentFinished } from "@/lib/queries";
import { getPinBalance } from "@/lib/pins";
import { isProviderConfigured } from "@/lib/payments";
import { PinStore } from "@/components/pin-store";

export const dynamic = "force-dynamic";

export default async function PinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  // País detectado por geo (header de Vercel) — el front lo usa como default del selector.
  const h = await headers();
  const detectedCountry = (h.get("x-vercel-ip-country") ?? "AR").toUpperCase();
  const dlocalReady = isProviderConfigured("dlocal");

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let products: Awaited<ReturnType<typeof getActiveProducts>> = [];
  let balance = 0;
  // Torneo terminado → se cierra la VENTA (los productos siguen `active` en la DB:
  // el cierre es de UI y se revierte solo si hiciera falta reabrirla).
  let finished = false;
  try {
    user = await getCurrentUser();
    [products, finished] = await Promise.all([getActiveProducts(), isTournamentFinished()]);
    if (user) balance = await getPinBalance(user.id);
  } catch {
    // sin DB / sin auth
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Pines"
        subtitle={
          finished
            ? "Tu saldo de pines. El Mundial terminó, así que ya no se usan para hacer cambios."
            : "Comprá pines para hacer cambios extra en tu equipo cada fecha."
        }
      />

      {status === "success" && (
        <ValidationCallout type="success">
          ¡Pago recibido! Tu saldo se actualiza solo cuando se confirma el pago (puede tardar unos segundos).
        </ValidationCallout>
      )}
      {status === "failure" && (
        <ValidationCallout type="danger">El pago no se completó. Podés intentar de nuevo.</ValidationCallout>
      )}

      {!user ? (
        <EmptyState
          title={finished ? "Ingresá para ver tu saldo" : "Ingresá para comprar pines"}
          hint="Necesitás iniciar sesión."
        />
      ) : finished ? (
        <PinStore
          saleClosed
          balance={balance}
          isPremium={user.isPremium ?? false}
          detectedCountry={detectedCountry}
          dlocalReady={dlocalReady}
          products={[]}
        />
      ) : products.length === 0 ? (
        <EmptyState title="No hay productos disponibles." hint="Volvé a entrar más tarde." />
      ) : (
        <PinStore
          balance={balance}
          isPremium={user?.isPremium ?? false}
          detectedCountry={detectedCountry}
          dlocalReady={dlocalReady}
          products={products.map((p) => ({
            sku: p.sku,
            name: p.name,
            pins: p.pins,
            priceArs: p.priceArs,
            priceUsd: p.priceUsd,
            unlimited: p.unlimited,
          }))}
        />
      )}

      <p className="text-sm text-ink-3">
        Los pines no son dinero: no se convierten a efectivo ni se transfieren a otra cuenta, y no
        vencen mientras tu cuenta esté activa. Podés pedir el reembolso del saldo no usado dentro de
        los 10 días de la compra. Más detalle en las{" "}
        <Link href="/bases#pines" className="font-semibold text-blue hover:underline">
          Bases y Condiciones
        </Link>
        .
      </p>
    </div>
  );
}
