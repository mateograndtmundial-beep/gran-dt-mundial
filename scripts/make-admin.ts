import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

// Uso: npm run make-admin [username]
// Sin argumento, marca como admin a TODOS los usuarios (útil en dev con un solo usuario).
async function main() {
  const username = process.argv[2];

  const before = await db.select({ id: users.id, username: users.username, isAdmin: users.isAdmin }).from(users);
  console.log("Usuarios antes:", before);

  if (username) {
    await db.update(users).set({ isAdmin: true }).where(eq(users.username, username));
  } else {
    await db.update(users).set({ isAdmin: true });
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
