import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const res = await pool.query(`
  select table_name from information_schema.tables
  where table_schema = 'public'
  order by table_name;
`);
console.log("Tables in database:");
console.log(res.rows.map(r => r.table_name));
await pool.end();