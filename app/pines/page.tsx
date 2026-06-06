import { PageTitle, EmptyState } from "@/components/ui";
import { ValidationCallout } from "@/components/editorial";
import { getCurrentUser } from "@/lib/auth";
import { getActiveProducts } from "@/lib/queries";
import { getPinBalance } from "@/lib/pins";
import { PinStore } from "@/components/pin-store";

export const dynamic = "force-dynamic";

export default async function PinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let products: Awaited<ReturnType<typeof getActiveProducts>> = [];
  let balance = 0;
  try {
    user = await getCurrentUser();
    products = await getActiveProducts();
    if (user) balance = await getPinBalance(user.id);
  } catch {
    // sin DB / sin auth
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Pines" subtitle="Comprá pines para hacer cambios extra en tu equipo cada fecha." />

      {status === "success" && (
        <ValidationCallout type="success">
          ¡Pago recibido! Tu saldo se actualiza solo cuando se confirma el pago (puede tardar unos segundos).
        </ValidationCallout>
      )}
      {status === "failure" && (
        <ValidationCallout type="danger">El pago no se completó. Podés intentar de nuevo.</ValidationCallout>
      )}

      {!user ? (
        <EmptyState title="Ingresá para comprar pines" hint="Necesitás iniciar sesión." />
      ) : products.length === 0 ? (
        <EmptyState title="No hay productos disponibles." hint="Corré: npm run seed:products" />
      ) : (
        <PinStore
          balance={balance}
          products={products.map((p) => ({ sku: p.sku, name: p.name, pins: p.pins, priceArs: p.priceArs }))}
        />
      )}
    </div>
  );
}
