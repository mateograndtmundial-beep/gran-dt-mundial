"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { syncRoundAction, publishRoundAction, unpublishRound, generateRecapsAction, generateScoreboardsAction } from "@/lib/admin-actions";
import { Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type R = { id: number; name: string; status: string };
type ActionResult = { ok: true; info: string } | { ok: false; error: string };

// Frase exacta que el admin tiene que tipear para confirmar la publicación
// (acción importante e irreversible-ish, estilo confirmación de AWS).
const CONFIRM_PHRASE = "publicar la fecha";

// Coincide con el enum real de rounds.status: open | locked | published.
const STATUS_LABEL: Record<string, string> = {
  open:      "Abierta",
  locked:    "Cerrada",
  published: "Publicada",
};

export function AdminControls({ rounds }: { rounds: R[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [log,  setLog]  = useState<Record<number, { ok: boolean; msg: string }>>({});
  // Fecha que el admin quiere publicar (abre el diálogo de confirmación) + lo que tipeó.
  const [confirm, setConfirm] = useState<R | null>(null);
  const [confirmText, setConfirmText] = useState("");
  // Generación manual de stories → #SOCIAL (mismo resultado que el cron).
  const [recapBusy, setRecapBusy] = useState(false);
  const [recapMsg, setRecapMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  async function runRecaps() {
    setRecapBusy(true);
    const r = await generateRecapsAction();
    setRecapBusy(false);
    setRecapMsg({ ok: r.ok, msg: r.ok ? r.info : `Error: ${r.error}` });
    if (r.ok) router.refresh();
  }

  // Generación manual del carrusel de puntajes → #SOCIAL (mismo resultado que el cron).
  const [sbBusy, setSbBusy] = useState(false);
  const [sbMsg, setSbMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  async function runScoreboards() {
    setSbBusy(true);
    const r = await generateScoreboardsAction();
    setSbBusy(false);
    setSbMsg({ ok: r.ok, msg: r.ok ? r.info : `Error: ${r.error}` });
    if (r.ok) router.refresh();
  }

  async function run(id: number, fn: (id: number) => Promise<ActionResult>, label: string) {
    setBusy(id);
    const r = await fn(id);
    setBusy(null);
    setLog((p) => ({
      ...p,
      [id]: { ok: r.ok, msg: r.ok ? `${label}: ${r.info}` : `Error: ${r.error}` },
    }));
    if (r.ok) router.refresh();
  }

  function openConfirm(r: R) {
    setConfirmText("");
    setConfirm(r);
  }

  async function confirmPublish() {
    if (!confirm) return;
    const id = confirm.id;
    setConfirm(null);
    await run(id, publishRoundAction, "Publicado");
  }

  const phraseOk = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  return (
    <>
    {/* Generación de stories de partidos → #SOCIAL. Mismo flujo que el cron, a mano. */}
    <Card className="mb-2 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Stories de partidos → #SOCIAL</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <Eyebrow>Postea las imágenes de los partidos terminados (idempotente)</Eyebrow>
            {recapMsg && (
              <span className={cn("text-[11px] font-medium", recapMsg.ok ? "text-success" : "text-danger")}>
                · {recapMsg.msg}
              </span>
            )}
          </div>
        </div>
        <button
          disabled={recapBusy}
          onClick={runRecaps}
          className="rounded-[6px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all disabled:opacity-50"
        >
          {recapBusy ? "Generando…" : "Generar stories pendientes"}
        </button>
      </div>
    </Card>

    {/* Carrusel de puntajes por grupo/fecha → #SOCIAL. Mismo flujo que el cron, a mano. */}
    <Card className="mb-2 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Carrusel de puntajes → #SOCIAL</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <Eyebrow>Portada + tabla por equipo + leyenda, por grupo/fecha (idempotente)</Eyebrow>
            {sbMsg && (
              <span className={cn("text-[11px] font-medium", sbMsg.ok ? "text-success" : "text-danger")}>
                · {sbMsg.msg}
              </span>
            )}
          </div>
        </div>
        <button
          disabled={sbBusy}
          onClick={runScoreboards}
          className="rounded-[6px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all disabled:opacity-50"
        >
          {sbBusy ? "Generando…" : "Generar carruseles pendientes"}
        </button>
      </div>
    </Card>
    <div className="space-y-2">
      {rounds.map((r) => {
        const isBusy = busy === r.id;
        const result = log[r.id];
        const statusLabel = STATUS_LABEL[r.status] ?? r.status;
        const published = r.status === "published";

        return (
          <Card key={r.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0 sm:flex-1">
                <div className="font-semibold text-ink text-sm">{r.name}</div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <Eyebrow>{statusLabel}</Eyebrow>
                  {result && (
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        result.ok ? "text-success" : "text-danger",
                      )}
                    >
                      · {result.msg}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch">
                <Link
                  href={`/admin/fecha/${r.id}`}
                  className="flex items-center justify-center rounded-[6px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all"
                >
                  Revisar →
                </Link>
                <button
                  disabled={isBusy}
                  onClick={() => run(r.id, syncRoundAction, "Sync")}
                  className="rounded-[6px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-border-strong transition-all disabled:opacity-50"
                >
                  {isBusy ? "Sincronizando…" : "Sincronizar"}
                </button>
                {published && (
                  <button
                    disabled={isBusy}
                    onClick={() => run(r.id, unpublishRound, "Despublicado")}
                    className="rounded-[6px] border border-warning/60 bg-surface px-3 py-2 text-sm font-semibold text-warning hover:bg-surface-2 transition-all disabled:opacity-50"
                  >
                    Despublicar
                  </button>
                )}
                <button
                  disabled={isBusy || published}
                  onClick={() => openConfirm(r)}
                  className={cn(
                    "col-span-2 flex items-center justify-center rounded-[6px] px-4 py-2 font-display text-base text-white transition-colors disabled:opacity-50 sm:col-span-1",
                    published ? "bg-success" : "bg-blue hover:bg-blue-hover",
                  )}
                >
                  {published ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check size={16} strokeWidth={1.5} aria-hidden />
                      PUBLICADA
                    </span>
                  ) : (
                    "PUBLICAR FECHA"
                  )}
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>

      {/* Confirmación estilo AWS: hay que tipear la frase exacta para publicar.
          Publicar recalcula puntos, marca eliminados y abre los puntajes a todos. */}
      <Dialog open={confirm != null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que querés publicar?</DialogTitle>
            <DialogDescription>
              Vas a publicar <strong>{confirm?.name}</strong>. Esto recalcula y congela los
              puntos de todos los equipos, marca selecciones eliminadas y hace visibles los
              puntajes a todos los usuarios. Es una acción importante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-2">
              Para confirmar, escribí <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-ink">{CONFIRM_PHRASE}</code>
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phraseOk) confirmPublish();
              }}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={CONFIRM_PHRASE}
              className="w-full rounded-[6px] border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-border-strong focus:outline-none"
            />
          </div>

          <DialogFooter>
            <button
              onClick={() => setConfirm(null)}
              className="rounded-[6px] border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={confirmPublish}
              disabled={!phraseOk}
              className="rounded-[6px] bg-blue px-4 py-2 font-display text-base text-white hover:bg-blue-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              PUBLICAR FECHA
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
