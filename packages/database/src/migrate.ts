import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "./client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const { db, pool } = createDatabase(databaseUrl);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.info("Database migrations completed.");
} finally {
  await pool.end();
}
