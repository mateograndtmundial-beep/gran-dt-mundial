import { SignUp } from "@clerk/nextjs";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function Page() {
  if (!clerkEnabled) {
    return (
      <div className="py-16 text-center text-white/60">
        Configurá Clerk (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) para habilitar el registro.
      </div>
    );
  }
  return (
    <div className="flex justify-center py-10">
      <SignUp />
    </div>
  );
}
