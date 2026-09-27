import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

console.log("Connecting...");
try {
  const res = await pool.query("select 1 as ok");
  console.log("Connected successfully:", res.rows);
} catch (err) {
  console.error("Connection failed:");
  console.error("  message:", err.message);
  console.error("  code:", err.code);
} finally {
  await pool.end();
}