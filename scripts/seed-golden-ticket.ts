import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { leagues, products, rounds, users } from "../lib/db/schema";

// Crea (idempotente) las 2 copas GOLDEN TICKET y sus productos de entrada.
// Ver docs/MONETIZACION.md. ⚠️ Corre contra la DB de producción (no hay staging):
// leé docs/PRODUCCION.md §2 antes de ejecutarlo, y NO lo corras hasta tener el visto
// legal para cobrar (el producto de entrada se cobra por Mercado Pago).

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 ambiguos (igual que genCode)
function genCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

// Parámetros de las copas (a cupo lleno: 100 × $5.000 = $500k; premio fijo $400k).
const CAPACITY = 100;
const ENTRY_FEE_ARS = 5000;
const PRIZE_ARS = 400000;
const R16_ORDER = 4; // 16vos de Final en ROUNDS (lib/game/config.ts)

// La 1ra copa arranca 'open' (admite inscripciones); la 2da queda 'draft' (inactiva)
// y se habilita a mano si la 1ra llena los 100.
const COPAS = [
  { name: "Copa GOLDEN TICKET", sku: "golden_ticket_1", status: "open" },
  { name: "Copa GOLDEN TICKET #2", sku: "golden_ticket_2", status: "draft" },
];

async function main() {
  // Owner = la casa (primer admin). No se suma como miembro: no juega ni ocupa cupo.
  const admin = (
    await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)).limit(1)
  )[0];
  if (!admin) throw new Error("No hay usuario admin. Corré: npm run make-admin <username>");

  // Las copas puntúan desde 16vos en adelante (getLeagueRanking usa scoringStartRoundId).
  const r16 = (
    await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.order, R16_ORDER)).limit(1)
  )[0];
  if (!r16) throw new Error(`No existe la ronda order=${R16_ORDER} (16vos). ¿Está seedeado el torneo?`);

  for (const copa of COPAS) {
    // Idempotencia: la copa se identifica por el sku de su producto de entrada. Si ya
    // existe y apunta a una liga, reusamos esa liga (re-correr no duplica copas).
    const existingProduct = (
      await db
        .select({ entryLeagueId: products.entryLeagueId })
        .from(products)
        .where(eq(products.sku, copa.sku))
        .limit(1)
    )[0];

    let leagueId = existingProduct?.entryLeagueId ?? null;

    if (leagueId == null) {
      const created = (
        await db
          .insert(leagues)
          .values({
            name: copa.name,
            code: genCode(),
            ownerId: admin.id,
            isPublic: true,
            kind: "golden_ticket",
            status: copa.status,
            capacity: CAPACITY,
            entryFeeArs: ENTRY_FEE_ARS,
            prizeArs: PRIZE_ARS,
            scoringStartRoundId: r16.id,
          })
          .returning({ id: leagues.id })
      )[0];
      leagueId = created.id;
      console.log(`✅ Copa creada: ${copa.name} (league ${leagueId}, status=${copa.status})`);
    } else {
      // Ya existía: refrescamos parámetros por si cambiaron (no toca status para no
      // pisar una habilitación manual de la copa de reserva).
      await db
        .update(leagues)
        .set({
          kind: "golden_ticket",
          capacity: CAPACITY,
          entryFeeArs: ENTRY_FEE_ARS,
          prizeArs: PRIZE_ARS,
          scoringStartRoundId: r16.id,
        })
        .where(eq(leagues.id, leagueId));
      console.log(`↻ Copa ya existía: ${copa.name} (league ${leagueId}) — parámetros actualizados`);
    }

    // ⚠️ Producto de entrada creado INACTIVO (active=false) a propósito. Mientras la
    // rama no esté deployada, prod corre `main`, cuyo getActiveProducts NO filtra los
    // productos de entrada → si estuviera activo, aparecería como un pack raro de "0
    // pines · $5.000" en /pines para todos los usuarios. Inactivo, main no lo devuelve
    // (filtra active=true) y queda invisible. Al go-live (rama deployada + visto legal),
    // activarlo a mano. createEntryOrder exige active=true, así que esto también gatea la
    // inscripción hasta la activación explícita.
    await db
      .insert(products)
      .values({
        sku: copa.sku,
        name: copa.name,
        pins: 0,
        priceArs: ENTRY_FEE_ARS,
        priceUsd: null,
        active: false,
        unlimited: false,
        entryLeagueId: leagueId,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: { name: copa.name, priceArs: ENTRY_FEE_ARS, entryLeagueId: leagueId },
      });
    console.log(`✅ Producto de entrada: ${copa.sku} → league ${leagueId}`);
  }

  console.log("✅ Copas GOLDEN TICKET seedeadas.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
