import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { players } from "../lib/db/schema";
import { getPlayersWithCountry } from "../lib/queries";
import { normalizeName, normalizeCountry, normalizeClub } from "../lib/pricing/normalize";
import { computePrice, percentile, round1 } from "../lib/pricing/map";
import { PRICING, BUDGET, SQUAD } from "../lib/game/config";

/*
 * Paso 3 del pricing. Cruza el plantel (DB) con los valores de mercado
 * (data/market-values.json, generado por `prices:fetch`) y escribe el precio.
 *
 *   npm run prices:apply           # aplica los precios
 *   npm run prices:apply -- --dry  # solo calcula y muestra calibración, sin escribir
 *
 * Idempotente: re-correr recalcula desde cero. Tunear PRICING en lib/game/config.ts.
 */

const DRY = process.argv.includes("--dry");
const MV_PATH = resolve(process.cwd(), "data/market-values.json");

type Entry = {
  name: string;
  firstName?: string;
  lastName?: string;
  country: string;
  club?: string;
  birthYear?: number | null;
  marketValueEur: number;
};

function lastToken(norm: string): string {
  return norm.split(" ").filter(Boolean).pop() ?? "";
}
function firstInitial(norm: string): string {
  return (norm.split(" ").filter(Boolean)[0] ?? "")[0] ?? "";
}
// Partículas/conectores que no sirven como apellido por sí solos.
const PARTICLES = new Set(["de", "del", "la", "le", "el", "da", "do", "dos", "das", "van", "von", "der", "den", "di", "bin", "al", "san", "santo", "santa"]);
/** Tokens "apellido-able": ≥4 letras y no partícula. Para el tier de recuperación. */
function surnameTokens(norm: string): string[] {
  return norm.split(" ").filter((t) => t.length >= 4 && !PARTICLES.has(t));
}

async function main() {
  if (!existsSync(MV_PATH)) {
    throw new Error(`No existe ${MV_PATH}. Corré primero: npm run prices:fetch`);
  }
  const entries: Entry[] = JSON.parse(readFileSync(MV_PATH, "utf8"));
  console.log(`→ ${entries.length} valores de mercado cargados.`);

  // Índices de match (de más a menos específico). El año de nacimiento es la
  // señal más fuerte y NO depende del país (que entre fuentes suele diferir).
  //   lastYear         apellido + año nacimiento        (global; desambigua sin país)
  //   fullCountry      nombre completo + país            (exacto)
  //   lastFirstCountry apellido + inicial nombre + país  (desambigua hermanos, p.ej. Hernández)
  //   full             nombre completo único
  //   lastCountry      apellido + país único
  //   tokenYear        cualquier apellido + año (recupera apellidos compuestos)
  //   clubYearLast     club + año + apellido (resuelve nombres distintos entre
  //                    fuentes, p.ej. API "Damián Martínez" ↔ TM "Emiliano Martínez")
  const clubYearLast = new Map<string, { mv: number; count: number }>();
  const lastYear = new Map<string, { mv: number; count: number }>();
  const fullCountry = new Map<string, number>();
  const lastFirstCountry = new Map<string, number>();
  const full = new Map<string, { mv: number; count: number }>();
  const lastCountry = new Map<string, { mv: number; count: number }>();
  const tokenYear = new Map<string, { mv: number; count: number }>();

  const bump = (m: Map<string, { mv: number; count: number }>, k: string, mv: number) => {
    const e = m.get(k);
    if (e) { e.mv = Math.max(e.mv, mv); e.count++; } else m.set(k, { mv, count: 1 });
  };

  for (const e of entries) {
    const norm = normalizeName(e.name);
    const nc = normalizeCountry(e.country);
    // apellido e inicial: preferimos las columnas de TM; si faltan, derivamos del nombre.
    const last = lastToken(normalizeName(e.lastName || e.name));
    const init = firstInitial(normalizeName(e.firstName || e.name));
    const mv = e.marketValueEur;

    if (last && e.birthYear) bump(lastYear, `${last}|${e.birthYear}`, mv);

    const club = normalizeClub(e.club || "");
    if (club && last && e.birthYear) bump(clubYearLast, `${club}|${e.birthYear}|${last}`, mv);

    const fcKey = `${norm}|${nc}`;
    fullCountry.set(fcKey, Math.max(fullCountry.get(fcKey) ?? 0, mv));

    if (last && init) {
      const lfKey = `${last}|${init}|${nc}`;
      lastFirstCountry.set(lfKey, Math.max(lastFirstCountry.get(lfKey) ?? 0, mv));
    }

    bump(full, norm, mv);
    if (last) bump(lastCountry, `${last}|${nc}`, mv);

    if (e.birthYear) {
      // indexamos por cada apellido-able del nombre Y del lastName de TM.
      const toks = new Set([...surnameTokens(norm), ...surnameTokens(normalizeName(e.lastName || ""))]);
      for (const t of toks) bump(tokenYear, `${t}|${e.birthYear}`, mv);
    }
  }

  function matchMv(name: string, country: string, birthYear: number | null, clubRaw: string | null): number | null {
    const norm = normalizeName(name);
    const nc = normalizeCountry(country);
    const last = lastToken(norm);
    const init = firstInitial(norm);

    // 0) club + año + apellido: resuelve aun cuando el nombre difiere entre fuentes
    const club = normalizeClub(clubRaw || "");
    if (club && birthYear) {
      const cy = clubYearLast.get(`${club}|${birthYear}|${last}`);
      if (cy && cy.count === 1) return cy.mv;
    }
    // 1) apellido + año (precisión alta, independiente del país)
    if (birthYear) {
      const ly = lastYear.get(`${last}|${birthYear}`);
      if (ly && ly.count === 1) return ly.mv;
    }
    // 2) nombre completo + país (exacto)
    const fc = fullCountry.get(`${norm}|${nc}`);
    if (fc != null) return fc;
    // 3) apellido + inicial + país
    const lf = lastFirstCountry.get(`${last}|${init}|${nc}`);
    if (lf != null) return lf;
    // 4) nombre completo único (global)
    const f = full.get(norm);
    if (f && f.count === 1) return f.mv;
    // 5) apellido + país único
    const lc = lastCountry.get(`${last}|${nc}`);
    if (lc && lc.count === 1) return lc.mv;
    // 6) recuperación: cualquier apellido + año, único global (apellidos compuestos)
    if (birthYear) {
      for (const t of surnameTokens(norm)) {
        const ty = tokenYear.get(`${t}|${birthYear}`);
        if (ty && ty.count === 1) return ty.mv;
      }
    }
    return null;
  }

  const dbPlayers = await getPlayersWithCountry();
  console.log(`→ ${dbPlayers.length} jugadores en DB.`);

  // 1ª pasada: matchear y juntar valores de mercado para calcular mvRef.
  const rows = dbPlayers.map((p) => ({ p, mv: matchMv(p.name, p.countryName, p.birthYear, p.club) }));
  const matchedMv = rows.filter((r) => r.mv != null).map((r) => r.mv as number);
  const unmatched = rows.filter((r) => r.mv == null);
  const mvRef = percentile(matchedMv, PRICING.MV_REF_PERCENTILE);

  console.log(
    `→ Match: ${matchedMv.length}/${dbPlayers.length} con valor · ${unmatched.length} sin match (→ piso ${PRICING.MIN}M).`,
  );
  console.log(
    `→ mvRef (p${PRICING.MV_REF_PERCENTILE}) = €${(mvRef / 1e6).toFixed(1)}M → mapea a ~${PRICING.MAX}M.`,
  );

  // 2ª pasada: precio por jugador. Los precios fijados a mano (priceManual) NO se
  // recalculan: conservan su valor actual y no se reescriben.
  const priced = rows.map((r) => ({
    id: r.p.id,
    name: r.p.name,
    country: r.p.countryName,
    position: r.p.position,
    manual: r.p.priceManual,
    price: r.p.priceManual ? r.p.price : r.mv != null ? computePrice(r.mv, mvRef) : PRICING.MIN,
  }));
  const manualCount = priced.filter((p) => p.manual).length;

  // ── Escritura ──
  if (DRY) {
    console.log(`\n(--dry: no se escribió nada · ${manualCount} manuales se respetarían)`);
  } else {
    let written = 0;
    for (const row of priced) {
      if (row.manual) continue; // respetamos los precios fijados a mano
      await db.update(players).set({ price: row.price }).where(eq(players.id, row.id));
      written++;
    }
    console.log(`\n✅ ${written} precios actualizados · ${manualCount} manuales respetados.`);
  }

  // ── Calibración ──
  printCalibration(priced);

  if (unmatched.length) {
    console.log(`\n⚠ ${unmatched.length} jugadores sin match (precio piso ${PRICING.MIN}M) — ajustá en /admin/precios:`);
    for (const r of unmatched.slice(0, 30)) console.log(`   · ${r.p.name} (${r.p.countryName})`);
    if (unmatched.length > 30) console.log(`   … y ${unmatched.length - 30} más.`);
  }
}

function printCalibration(priced: { name: string; country: string; price: number }[]) {
  const prices = priced.map((p) => p.price).sort((a, b) => b - a);
  const n = prices.length;
  if (!n) return;

  // Histograma por tramos.
  const buckets = [
    [PRICING.MIN, 10],
    [10, 25],
    [25, 40],
    [40, 55],
    [55, PRICING.MAX + 0.01],
  ] as const;
  console.log("\n── Distribución de precios ──");
  for (const [lo, hi] of buckets) {
    const c = prices.filter((p) => p >= lo && p < hi).length;
    const bar = "█".repeat(Math.round((c / n) * 40));
    console.log(`  ${String(lo).padStart(4)}–${String(Math.floor(hi)).padEnd(3)}M: ${String(c).padStart(4)} ${bar}`);
  }

  const avg = round1(prices.reduce((s, p) => s + p, 0) / n);
  const median = prices[Math.floor(n / 2)];
  console.log(`\n  promedio ${avg}M · mediana ${median}M · min ${prices[n - 1]}M · max ${prices[0]}M`);

  // XI de ensueño: top 15 (11 titulares + 4 suplentes) — cota superior, ignora cap de país.
  const dream = round1(prices.slice(0, SQUAD.TOTAL).reduce((s, p) => s + p, 0));
  const avgSquad = round1(avg * SQUAD.TOTAL);
  console.log(`\n── Calibración de budget (BUDGET = ${BUDGET}M, plantel = ${SQUAD.TOTAL}) ──`);
  console.log(`  XI de ensueño (top ${SQUAD.TOTAL}): ${dream}M  → ${dream > BUDGET ? "OK, supera el budget (fuerza trade-offs)" : "⚠ NO supera el budget: subí MAX o bajá BUDGET"}`);
  console.log(`  Plantel promedio: ${avgSquad}M  → ${avgSquad < BUDGET ? "OK, entra en el budget" : "⚠ NO entra: bajá precios o subí BUDGET"}`);

  console.log("\n  Top 10 más caros:");
  for (const p of priced.slice().sort((a, b) => b.price - a.price).slice(0, 10)) {
    console.log(`   ${String(p.price).padStart(5)}M  ${p.name} (${p.country})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ price-players falló:", e);
    process.exit(1);
  });
