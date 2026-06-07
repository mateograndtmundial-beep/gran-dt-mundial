"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { setUsername, checkUsername } from "@/lib/user-actions";
import {
  USERNAME_ERRORS,
  USERNAME_MAX,
  validateUsernameFormat,
  type UsernameError,
} from "@/lib/username";
import { PrimaryButton } from "@/components/editorial";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "error"; error: UsernameError };

export function OnboardingForm({ suggestion }: { suggestion?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(suggestion ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  // Chequeo de disponibilidad con debounce. seq evita que una respuesta lenta
  // pise a una más nueva (carrera de typing).
  useEffect(() => {
    const v = value.trim();
    if (!v) return setStatus({ kind: "idle" });
    const fmt = validateUsernameFormat(v);
    if (fmt) return setStatus({ kind: "error", error: fmt });

    const mine = ++seq.current;
    setStatus({ kind: "checking" });
    const t = setTimeout(async () => {
      const res = await checkUsername(v);
      if (mine !== seq.current) return; // llegó una respuesta más nueva
      setStatus(res.ok ? { kind: "ok" } : { kind: "error", error: res.error });
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  async function submit() {
    if (saving) return;
    setSaving(true);
    const res = await setUsername(value);
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setStatus({ kind: "error", error: res.error });
    setSaving(false);
  }

  const canSubmit = status.kind === "ok" && !saving;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint font-mono text-sm">
          @
        </span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
          placeholder="tunombre"
          maxLength={USERNAME_MAX}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Nombre de DT"
          className={cn(
            "w-full rounded-[8px] border bg-canvas pl-7 pr-9 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint focus:ring-1 transition-colors",
            status.kind === "error"
              ? "border-danger focus:border-danger focus:ring-danger"
              : status.kind === "ok"
              ? "border-blue focus:border-blue focus:ring-blue"
              : "border-border focus:border-blue focus:ring-blue",
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {status.kind === "checking" && <Loader2 size={16} className="animate-spin text-ink-faint" />}
          {status.kind === "ok" && <Check size={16} className="text-blue" />}
          {status.kind === "error" && <X size={16} className="text-danger" />}
        </span>
      </div>

      <p className={cn("text-xs min-h-4", status.kind === "error" ? "text-danger font-semibold" : "text-ink-3")}>
        {status.kind === "error"
          ? USERNAME_ERRORS[status.error]
          : status.kind === "ok"
          ? "¡Disponible!"
          : "Así te van a ver en el ranking y en las ligas."}
      </p>

      <PrimaryButton type="submit" disabled={!canSubmit} className="w-full justify-center">
        {saving ? "Guardando…" : "EMPEZAR A JUGAR →"}
      </PrimaryButton>
    </form>
  );
}
