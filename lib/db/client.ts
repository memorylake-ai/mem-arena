import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { arenaSessionUsers, messages, sessions } from "./schema";

const connectionString = process.env.DATABASE_URL;
const isProductionEnvoriment = process.env.NODE_ENV === "production";
const connectionTimeout = isProductionEnvoriment ? 30_000 : 5000; // 5 seconds for tests, 30 for production

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/** Postgres client for query execution (e.g. migrations). Use db for Drizzle queries. */
export const sql = postgres(connectionString, {
  max: 6,
  idle_timeout: connectionTimeout,
  connect_timeout: connectionTimeout,
});

/** Drizzle DB instance with schema for typed queries. */
export const db = drizzle(sql, {
  schema: { arenaSessionUsers, messages, sessions },
});
