import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Render's managed Postgres requires SSL, and Render's connection string
// doesn't always include `?sslmode=require`. Without an explicit ssl
// option here, connections from the deployed api-server to Render
// Postgres can fail or hang. Only enabled outside local dev, since local
// Postgres instances typically aren't configured for TLS at all.
// rejectUnauthorized: false is standard for Render's managed Postgres —
// it encrypts the connection, it just skips CA verification against the
// default trust store.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
