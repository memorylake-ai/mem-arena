import path from "node:path";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Load /app/.env so DATABASE_URL is available before db client (e.g. in Docker/Helm)
  const envPath = path.join(process.cwd(), ".env");
  try {
    const { config } = await import("dotenv");
    config({ path: envPath });
  } catch {
    // dotenv optional; skip if not installed or no .env
  }

  const { sql } = await import("./lib/db/client");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");

  const db = drizzle(sql);
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
}
