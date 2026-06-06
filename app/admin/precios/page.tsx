import { PageTitle, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getPlayersWithCountry } from "@/lib/queries";
import { PriceEditor } from "@/components/price-editor";

export const dynamic = "force-dynamic";

export default async function AdminPreciosPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let players: Awaited<ReturnType<typeof getPlayersWithCountry>> = [];
  try {
    user = await getCurrentUser();
    players = await getPlayersWithCountry();
  } catch {
    // sin DB / sin auth -> acceso restringido
  }

  if (!user || !user.isAdmin) {
    return (
      <div>
        <PageTitle title="Precios de jugadores" />
        <EmptyState
          title="Acceso restringido"
          hint="Necesitás ser administrador (poné users.is_admin = true en la base)."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Precios de jugadores"
        subtitle="Carga inicial: npm run prices:apply. Acá ajustás a mano (5,0–60,0M, con 1 decimal)."
      />
      {players.length === 0 ? (
        <EmptyState title="No hay jugadores cargados." hint="Corré: npm run seed" />
      ) : (
        <PriceEditor
          players={players.map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            price: p.price,
            countryName: p.countryName,
            flagUrl: p.flagUrl,
          }))}
        />
      )}
    </div>
  );
}
