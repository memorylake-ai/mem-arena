import path from "node:path";

/**
 * Run Drizzle migrations at startup. Only import this in Node runtime (e.g. from instrumentation).
 */
export async function runMigrations() {
  const envPath = path.join(process.cwd(), ".env");
  try {
    const { config } = await import("dotenv");
    config({ path: envPath });
  } catch {
    // dotenv optional
  }

  const { sql } = await import("./db/client");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");

  const db = drizzle(sql);
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
}
