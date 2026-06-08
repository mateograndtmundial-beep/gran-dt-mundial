import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, suggestedUsername, clerkEnabled } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";
import { validateUsernameFormat } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function BienvenidaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!clerkEnabled) redirect("/");

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  // Ya tiene nickname: no hay nada que hacer acá.
  if (user.username) redirect("/");

  // Pre-cargamos el nombre de Clerk como sugerencia sólo si es un formato válido.
  const raw = await suggestedUsername();
  const suggestion = validateUsernameFormat(raw) ? "" : raw;

  // Destino post-onboarding. Sólo rutas internas (evita open-redirect).
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <div className="flex flex-col items-center py-10 gap-6">
      <Image
        src="/images/logo/logo-badge-192.png"
        alt="Los 11 de Sampa"
        width={72}
        height={72}
        className="rounded-full"
        priority
      />

      <div className="w-full max-w-sm rounded-[8px] border border-border bg-surface card-shadow p-6">
        <h1 className="font-display text-2xl text-ink leading-none">¡BIENVENIDO, DT!</h1>
        <p className="mt-1.5 text-sm text-ink-3">
          Elegí tu nombre de DT. Es único y te identifica en el ranking y las ligas.
        </p>
        <div className="mt-5">
          <OnboardingForm suggestion={suggestion} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
