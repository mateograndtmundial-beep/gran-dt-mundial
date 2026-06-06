"use client";

import { useEffect, useState } from "react";

function Box({ v, l }: { v: number; l: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl font-extrabold tabular-nums md:text-5xl">
        {String(v).padStart(2, "0")}
      </span>
      <span className="text-xs uppercase tracking-wide text-white/50">{l}</span>
    </div>
  );
}

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) {
    return <div className="text-4xl font-extrabold tabular-nums md:text-5xl">··:··:··</div>;
  }

  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex gap-4">
      <Box v={d} l="días" />
      <Box v={h} l="hs" />
      <Box v={m} l="min" />
      <Box v={s} l="seg" />
    </div>
  );
}
