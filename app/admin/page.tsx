import Link from "next/link";
import { PageTitle, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getAllRounds, getCopasForAdmin, getOrphanedEntryOrders } from "@/lib/queries";
import { AdminControls } from "@/components/admin-controls";
import { AdminCopaControls } from "@/components/admin-copa-controls";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let rounds: Awaited<ReturnType<typeof getAllRounds>> = [];
  let copas: Awaited<ReturnType<typeof getCopasForAdmin>> = [];
  let orphans: Awaited<ReturnType<typeof getOrphanedEntryOrders>> = [];
  try {
    user = await getCurrentUser();
    rounds = await getAllRounds();
    copas = await getCopasForAdmin();
    orphans = await getOrphanedEntryOrders();
  } catch {
    // sin DB / sin auth -> acceso restringido
  }

  if (!user || !user.isAdmin) {
    return (
      <div>
        <PageTitle title="Panel de administración" />
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
        title="Panel de administración"
        subtitle="Sincronizá las stats de cada fecha y publicá los puntos (una sola vez por fecha)."
      />
      <Link
        href="/admin/precios"
        className="inline-block rounded-[6px] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all"
      >
        Editar precios de jugadores →
      </Link>
      {rounds.length === 0 ? (
        <EmptyState title="No hay fechas cargadas." hint="Corré: npm run seed" />
      ) : (
        <AdminControls rounds={rounds.map((r) => ({ id: r.id, name: r.name, status: r.status }))} />
      )}
      <AdminCopaControls copas={copas} orphans={orphans} />
    </div>
  );
}
