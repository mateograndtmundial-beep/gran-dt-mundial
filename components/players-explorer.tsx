"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { POSITIONS, type Position } from "@/lib/game/config";
import { PlayerCard } from "@/components/player-card";
import { cn, formatPrice } from "@/lib/utils";
import { normalizeName } from "@/lib/pricing/normalize";

type P = {
  id: number;
  name: string;
  position: Position;
  price: number;
  club: string | null;
  countryName: string;
  flagUrl: string | null;
  eliminatedRound: number | null;
};

const POS_LABELS: Record<Position | "ALL", string> = {
  ALL: "Todos",
  GK:  "Arq",
  DEF: "Def",
  MID: "Vol",
  FWD: "Del",
};

type SortKey = "price-desc" | "price-asc" | "name-asc";
const SORT_LABELS: Record<SortKey, string> = {
  "price-desc": "Precio: mayor a menor",
  "price-asc":  "Precio: menor a mayor",
  "name-asc":   "Nombre: A → Z",
};

/* Render incremental: pintamos PAGE tarjetas y crecemos con "Mostrar más".
   Evita montar cientos de PlayerCard de una (el primer paint era pesado). */
const PAGE = 48;

/* Select nativo estilizado */
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none rounded-[6px] border border-border bg-surface pl-3 pr-8 py-1.5 text-xs font-semibold text-ink-2 outline-none hover:border-border-strong focus:border-blue focus:ring-1 focus:ring-blue transition-colors cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </label>
  );
}

export function PlayersExplorer({ players }: { players: P[] }) {
  const [q, setQ]           = useState("");
  const [pos, setPos]       = useState<Position | "ALL">("ALL");
  const [country, setCountry] = useState<string>("ALL");
  const [sort, setSort]     = useState<SortKey>("price-desc");
  const [hideElim, setHideElim] = useState(false);

  /* Bounds de precio derivados de la data */
  const [minPrice, maxPrice] = useMemo(() => {
    if (players.length === 0) return [0, 0];
    let lo = Infinity, hi = -Infinity;
    for (const p of players) {
      if (p.price < lo) lo = p.price;
      if (p.price > hi) hi = p.price;
    }
    return [lo, hi];
  }, [players]);
  const hasPriceRange = maxPrice > minPrice;
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const effectiveCap = priceCap ?? maxPrice;

  /* Lista de países única y ordenada */
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) set.add(p.countryName);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filtered = useMemo(() => {
    const nq = normalizeName(q); // sin tildes ni mayúsculas
    const out = players.filter(
      (p) =>
        (pos === "ALL" || p.position === pos) &&
        (country === "ALL" || p.countryName === country) &&
        (!hideElim || p.eliminatedRound == null) &&
        p.price <= effectiveCap &&
        (nq === "" ||
          normalizeName(p.name).includes(nq) ||
          normalizeName(p.countryName).includes(nq) ||
          normalizeName(p.club ?? "").includes(nq)),
    );
    out.sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "price-asc") return a.price - b.price || a.name.localeCompare(b.name);
      return b.price - a.price || a.name.localeCompare(b.name);
    });
    return out;
  }, [players, pos, country, hideElim, effectiveCap, q, sort]);

  // Cada vez que cambian los filtros, volvemos a la primera "página". Ajuste de
  // estado durante el render (sin useEffect) según recomienda React.
  const filterKey = `${q}|${pos}|${country}|${hideElim}|${effectiveCap}|${sort}`;
  const [shown, setShown] = useState(PAGE);
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setShown(PAGE);
  }
  const visible = filtered.slice(0, shown);

  const filtersActive =
    q !== "" ||
    pos !== "ALL" ||
    country !== "ALL" ||
    sort !== "price-desc" ||
    hideElim ||
    (priceCap != null && priceCap < maxPrice);

  function resetFilters() {
    setQ("");
    setPos("ALL");
    setCountry("ALL");
    setSort("price-desc");
    setHideElim(false);
    setPriceCap(null);
  }

  return (
    <div className="space-y-4">
      {/* Filtros sticky */}
      <div className="sticky top-[57px] z-30 bg-canvas/80 backdrop-blur-sm border-b border-border pb-3 space-y-3">
        {/* Búsqueda */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar jugador…"
            className="w-full rounded-[8px] border border-border bg-surface pl-9 pr-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
          />
        </div>

        {/* Filtro de posición + selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pills de posición */}
          <div className="flex gap-1.5">
            {(["ALL", ...POSITIONS] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPos(p)}
                className={cn(
                  "rounded-[4px] px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                  pos === p
                    ? "bg-blue text-white"
                    : "bg-surface border border-border text-ink-2 hover:border-border-strong",
                )}
              >
                {POS_LABELS[p]}
              </button>
            ))}
          </div>

          <span className="hidden sm:block h-5 w-px bg-border" aria-hidden />

          {/* País */}
          <FilterSelect label="Filtrar por país" value={country} onChange={setCountry}>
            <option value="ALL">Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FilterSelect>

          {/* Orden */}
          <FilterSelect
            label="Ordenar"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </FilterSelect>

          {/* Ocultar eliminados */}
          <button
            onClick={() => setHideElim((v) => !v)}
            aria-pressed={hideElim}
            className={cn(
              "rounded-[6px] border px-3 py-1.5 text-xs font-semibold transition-colors",
              hideElim
                ? "border-blue bg-blue-light text-blue"
                : "border-border bg-surface text-ink-2 hover:border-border-strong",
            )}
          >
            Ocultar eliminados
          </button>

          {/* Limpiar */}
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold text-ink-3 hover:text-blue hover:bg-blue-light transition-colors"
            >
              <X size={13} aria-hidden />
              Limpiar
            </button>
          )}
        </div>

        {/* Rango de precio */}
        {hasPriceRange && (
          <div className="flex items-center gap-3">
            <span className="eyebrow shrink-0">Precio hasta</span>
            <input
              type="range"
              min={Math.floor(minPrice)}
              max={Math.ceil(maxPrice)}
              step={0.5}
              value={effectiveCap}
              onChange={(e) => setPriceCap(Number(e.target.value))}
              aria-label="Precio máximo"
              className="h-1.5 flex-1 cursor-pointer accent-blue"
            />
            <span className="jersey-numeral text-sm text-blue shrink-0 w-14 text-right">
              {formatPrice(effectiveCap)}M
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <p className="eyebrow">
          {filtered.length} {filtered.length === 1 ? "jugador" : "jugadores"}
        </p>
        {!hasPriceRange && players.length > 0 && (
          <p className="text-[11px] text-ink-faint">
            Todos valen {formatPrice(minPrice)}M por ahora
          </p>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-border-strong/50 p-10 text-center">
          <p className="font-semibold text-ink-3">No hay jugadores que coincidan.</p>
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="mt-2 text-sm font-semibold text-blue hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p, i) => (
            <PlayerCard
              key={p.id}
              name={p.name}
              position={p.position}
              price={p.price}
              club={p.club}
              countryName={p.countryName}
              flagUrl={p.flagUrl}
              eliminated={p.eliminatedRound != null}
              className={cn(
                "animate-fade-in",
                `stagger-${(i % 6) + 1}` as string,
              )}
            />
          ))}
        </div>
      )}

      {filtered.length > shown && (
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <button
            onClick={() => setShown((s) => s + PAGE)}
            className="rounded-[6px] border border-border bg-surface px-5 py-2 text-sm font-semibold text-ink-2 hover:border-blue hover:text-blue transition-colors"
          >
            Mostrar más
          </button>
          <p className="eyebrow text-center">
            Mostrando {visible.length} de {filtered.length}
          </p>
        </div>
      )}
    </div>
  );
}
