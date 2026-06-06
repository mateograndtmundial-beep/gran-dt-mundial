import "dotenv/config";
import { db } from "../lib/db";
import { products } from "../lib/db/schema";

// Packs de pines (precios placeholder — ajustá a gusto).
const PRODUCTS = [
  { sku: "pin_1", name: "1 pin", pins: 1, priceArs: 1500, priceUsd: 1.5 },
  { sku: "pin_5", name: "5 pines", pins: 5, priceArs: 6000, priceUsd: 5 },
  { sku: "pin_10", name: "10 pines", pins: 10, priceArs: 10000, priceUsd: 9 },
];

async function main() {
  for (const p of PRODUCTS) {
    await db.insert(products).values(p).onConflictDoNothing();
  }
  console.log("✅ Productos (packs de pines) seedeados.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
