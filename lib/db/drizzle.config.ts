import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Render's managed Postgres requires SSL. Render's own connection string
// often omits `?sslmode=require`, and without an explicit ssl option the
// `pg` driver can silently hang during the TLS handshake instead of
// erroring cleanly — surfacing as drizzle-kit hanging on "Pulling schema
// from database..." and then failing with exit code 1 and no message.
// rejectUnauthorized: false is standard here because Render's Postgres
// uses a certificate not in the default trust store; this still encrypts
// the connection, it just skips CA verification.
export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
});
