"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { GhostButton } from "@/components/editorial";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Botón de copiar/compartir el código de invitación de una liga privada.
 * Es el mecanismo central del loop viral (invitar amigos), por eso necesita
 * feedback claro y, en mobile (donde entra la mayoría), el share nativo del
 * sistema con el link ya armado.
 */
export function LeagueShare({
  code,
  leagueName,
  href,
  message: messageOverride,
}: {
  code: string;
  leagueName: string;
  /** Ruta a compartir (default `/ligas/{code}`). Para la Liga Premium se pasa `/copa`,
   *  que lleva directo a la interfaz de inscripción (pago + aceptación de Bases). */
  href?: string;
  /** Texto a compartir (default invita con el código). Las copas premium no comparten
   *  código: se pasa un mensaje sin código que invita a inscribirse. */
  message?: string;
}) {
  const [copied, setCopied] = useState(false);
  // Se detecta en el cliente (post-mount) para no divergir del render del
  // servidor — `navigator` no existe ahí y causaría un mismatch de hidratación.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const link = `${SITE.url}${href ?? `/ligas/${code}`}`;
  // El mensaje NO incluye el link: el link va aparte en `url`. Si va en los dos,
  // WhatsApp (y otras apps) lo pegan al texto y el link aparece DUPLICADO.
  const message =
    messageOverride ?? `Unite a mi liga "${leagueName}" en Los 11 de Sampa con el código ${code}`;

  async function handleShare() {
    if (canShare) {
      try {
        await navigator.share({ title: "Los 11 de Sampa", text: message, url: link });
        return;
      } catch {
        // El usuario canceló el share nativo o no está disponible — caemos al copiado.
      }
    }
    try {
      // En el clipboard va el link completo (no hay campo `url` aparte).
      await navigator.clipboard.writeText(`${message}: ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin acceso al clipboard (permiso denegado, contexto no seguro, etc.) — no hacemos nada.
    }
  }

  return (
    <GhostButton onClick={handleShare} className={cn("shrink-0", copied && "text-pitch")}>
      {copied ? (
        <>
          <Check size={16} aria-hidden /> ¡Copiado!
        </>
      ) : (
        <>
          {canShare ? <Share2 size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          Compartir
        </>
      )}
    </GhostButton>
  );
}
