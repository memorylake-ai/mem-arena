import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local (Next.js convention) and .env so drizzle-kit can read DATABASE_URL
// when run via `bun run db:migrate` etc. Next.js only loads these for dev/build.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/memorylake",
  },
});
