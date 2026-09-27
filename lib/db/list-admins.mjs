import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const res = await client.query("SELECT id, name, email, role, created_at FROM admins ORDER BY id");
console.log(res.rows);

await client.end();