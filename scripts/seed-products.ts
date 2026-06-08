import "dotenv/config";
import { db } from "../lib/db";
import { products } from "../lib/db/schema";

// Packs de pines. priceUsd es placeholder (dLocal pendiente).
const PRODUCTS = [
  { sku: "pin_1", name: "1 pin", pins: 1, priceArs: 1500, priceUsd: 1.5, unlimited: false },
  { sku: "pin_3", name: "3 pines", pins: 3, priceArs: 4000, priceUsd: 4, unlimited: false },
  { sku: "pin_5", name: "5 pines", pins: 5, priceArs: 6000, priceUsd: 5, unlimited: false },
  { sku: "pin_10", name: "10 pines", pins: 10, priceArs: 10000, priceUsd: 9, unlimited: false },
  {
    sku: "pin_unlimited",
    name: "Pines ilimitados",
    pins: 0,
    priceArs: 25000,
    priceUsd: 20,
    unlimited: true,
  },
];

async function main() {
  for (const p of PRODUCTS) {
    await db
      .insert(products)
      .values(p)
      .onConflictDoUpdate({ target: products.sku, set: p });
  }
  console.log("✅ Productos (packs de pines) seedeados.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
