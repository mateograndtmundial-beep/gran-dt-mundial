import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { db } from "../lib/db";
import { players } from "../lib/db/schema";
import { normalizeName } from "../lib/pricing/normalize";
import { streamCsv } from "./lib/csv";

/*
 * Paso 2 del pricing. Ingesta los valores de mercado de Transfermarkt desde el
 * dataset público dcaribou/transfermarkt-datasets (tabla `players`).
 *
 *   npm run prices:fetch        # auto-descarga data/players.csv si no existe
 *   npm run prices:fetch -- /otra/ruta/players.csv   # usar otro CSV
 *
 * Filtra a los jugadores que existen en la DB y emite data/market-values.json.
 * Requiere haber corrido `npm run seed` antes (para tener el plantel).
 */

// dataset público (Cloudflare R2). Ver https://github.com/dcaribou/transfermarkt-datasets
const CSV_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz";
const DEFAULT_CSV = resolve(process.cwd(), "data/players.csv");
const OUT_PATH = resolve(process.cwd(), "data/market-values.json");

// Nombres de columna del dataset dcaribou (players.csv).
const COL_NAME = "name";
const COL_FIRST = "first_name";
const COL_LAST = "last_name";
const COL_COUNTRY = "country_of_citizenship";
const COL_DOB = "date_of_birth";
const COL_CLUB = "current_club_name";
const COL_MV = "market_value_in_eur";
const COL_MV_HIGH = "highest_market_value_in_eur";

type Entry = {
  name: string;
  firstName: string;
  lastName: string;
  country: string;
  club: string;
  birthYear: number | null;
  marketValueEur: number;
};

function parseBirthYear(dob: string): number | null {
  if (!dob) return null;
  const y = Number(dob.slice(0, 4));
  return Number.isFinite(y) && y > 1950 && y < 2020 ? y : null;
}

/** Devuelve el path del CSV: el pasado por arg, o data/players.csv (descargándolo si falta). */
async function ensureCsv(): Promise<string> {
  const arg = process.argv[2] || process.env.TM_PLAYERS_CSV;
  if (arg) {
    if (!existsSync(arg)) throw new Error(`No existe el archivo: ${arg}`);
    return arg;
  }
  if (existsSync(DEFAULT_CSV)) return DEFAULT_CSV;

  console.log(`→ Descargando dataset de Transfermarkt...\n   ${CSV_URL}`);
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`No se pudo descargar el CSV: ${res.status} ${res.statusText}`);
  const gz = Buffer.from(await res.arrayBuffer());
  if (!existsSync(dirname(DEFAULT_CSV))) mkdirSync(dirname(DEFAULT_CSV), { recursive: true });
  writeFileSync(DEFAULT_CSV, gunzipSync(gz));
  console.log(`   ✓ ${DEFAULT_CSV}`);
  return DEFAULT_CSV;
}

async function main() {
  const csvPath = await ensureCsv();

  console.log("→ Cargando jugadores de la DB para filtrar...");
  const dbPlayers = await db.select({ name: players.name }).from(players);
  const dbNames = new Set(dbPlayers.map((p) => normalizeName(p.name)));
  // Indexamos por TODOS los tokens de apellido (≥3 letras) de cada jugador, no
  // solo el último: así no perdemos filas TM con apellido distinto (compuestos,
  // abreviados). El match fino lo resuelve price-players.ts.
  const dbTokens = new Set<string>();
  for (const p of dbPlayers) {
    for (const t of normalizeName(p.name).split(" ")) if (t.length >= 3) dbTokens.add(t);
  }
  console.log(`  ${dbPlayers.length} jugadores en DB (${dbNames.size} nombres únicos).`);
  if (dbNames.size === 0) {
    console.warn("  ⚠ No hay jugadores en DB. Corré `npm run seed` primero.");
  }

  console.log(`→ Leyendo ${csvPath} ...`);
  // dedup por nombre+país normalizado, quedándonos con el valor más alto visto.
  const best = new Map<string, Entry>();
  let withMv = 0;

  const total = await streamCsv(csvPath, (row) => {
    const name = (row[COL_NAME] ?? "").trim();
    if (!name) return;
    const norm = normalizeName(name);
    // incluir si el nombre completo coincide, o si CUALQUIER token (nombre o
    // apellido) de TM coincide con un token de la DB.
    const toks = norm.split(" ").concat(normalizeName(row[COL_LAST] ?? "").split(" "));
    if (!dbNames.has(norm) && !toks.some((t) => t.length >= 3 && dbTokens.has(t))) return;
    const mvRaw = row[COL_MV] || row[COL_MV_HIGH] || "";
    const mv = Number(mvRaw);
    if (!Number.isFinite(mv) || mv <= 0) return;
    withMv++;
    const country = (row[COL_COUNTRY] ?? "").trim();
    const firstName = (row[COL_FIRST] ?? "").trim();
    const lastName = (row[COL_LAST] ?? "").trim();
    const club = (row[COL_CLUB] ?? "").trim();
    const birthYear = parseBirthYear((row[COL_DOB] ?? "").trim());
    const key = `${norm}|${normalizeName(country)}`;
    const prev = best.get(key);
    if (!prev || mv > prev.marketValueEur) {
      best.set(key, { name, firstName, lastName, country, club, birthYear, marketValueEur: mv });
    }
  });

  const entries = [...best.values()].sort((a, b) => b.marketValueEur - a.marketValueEur);

  if (!existsSync(dirname(OUT_PATH))) mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2));

  console.log(`✅ ${total} filas leídas · ${withMv} con valor y match en DB · ${entries.length} entradas únicas.`);
  console.log(`   Escrito: ${OUT_PATH}`);
  if (entries.length) {
    const top = entries[0];
    console.log(`   Top: ${top.name} (${top.country}) — €${(top.marketValueEur / 1e6).toFixed(1)}M`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ fetch-market-values falló:", e);
    process.exit(1);
  });
