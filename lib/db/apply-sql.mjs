import pg from "pg";
import fs from "fs";
const { Client } = pg;

const files = [
  "drizzle/0000_clammy_living_tribunal.sql",
  "drizzle/0001_strong_sheva_callister.sql",
];

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected.");

for (const file of files) {
  console.log(`\n--- Applying ${file} ---`);
  const sql = fs.readFileSync(file, "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(Boolean);

  for (const [i, stmt] of statements.entries()) {
    try {
      await client.query(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] FAILED: ${err.message}`);
    }
  }
}

console.log("\nDone.");
await client.end();