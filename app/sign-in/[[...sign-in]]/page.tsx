import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function Page() {
  return (
    <div className="flex flex-col items-center py-10 gap-6">
      {/* Logo badge */}
      <Image
        src="/images/logo/logo-badge-192.png"
        alt="Los 11 de Sampa"
        width={80}
        height={80}
        className="rounded-full"
        priority
      />

      {clerkEnabled ? (
        <SignIn />
      ) : (
        <div className="rounded-[8px] border border-border bg-surface card-shadow p-8 text-center max-w-sm">
          <p className="font-semibold text-ink">Autenticación no configurada</p>
          <p className="mt-1 text-sm text-ink-3">
            Configurá{" "}
            <code className="font-mono text-xs bg-surface-2 px-1 rounded">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            para habilitar el login.
          </p>
        </div>
      )}
    </div>
  );
}
