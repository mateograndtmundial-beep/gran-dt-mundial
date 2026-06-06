"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { getMyPins } from "@/lib/payment-actions";

/** Chip de saldo de pines en el header, linkeado a la tienda. Solo si está logueado. */
export function PinBalance() {
  const { isLoaded, isSignedIn } = useAuth();
  const [pins, setPins] = useState<number | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) getMyPins().then(setPins).catch(() => {});
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn || pins === null) return null;

  return (
    <Link
      href="/pines"
      aria-label={`Tenés ${pins} pines — comprar más`}
      className="flex items-center gap-1 rounded-[6px] border border-gold-border bg-gold-bg px-2 py-1 text-xs font-semibold text-gold-ink hover:bg-gold hover:text-white transition-colors"
    >
      <span className="jersey-numeral text-sm">{pins}</span> pines
    </Link>
  );
}
