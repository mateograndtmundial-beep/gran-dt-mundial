import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

// Uso: npm run make-admin <username>
// Requiere un username explícito: marcar admin a TODOS de un comando es peligroso.
async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Falta el username. Uso: npm run make-admin <username>");
    process.exit(1);
  }

  const before = await db.select({ id: users.id, username: users.username, isAdmin: users.isAdmin }).from(users);
  console.log("Usuarios antes:", before);

  const updated = await db
    .update(users)
    .set({ isAdmin: true })
    .where(eq(users.username, username))
    .returning({ id: users.id });
  if (!updated.length) {
    console.error(`No se encontró el usuario "${username}".`);
    process.exit(1);
  }

  const after = await db.select({ id: users.id, username: users.username, isAdmin: users.isAdmin }).from(users);
  console.log("Usuarios después:", after);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
