const bcrypt = require("bcryptjs");
const { Client } = require("pg");

// ---- EDIT THESE THREE VALUES ----
const NAME = "Super Admin";
const EMAIL = "kanu08288@gmail.com";
const PASSWORD = "madhav";
// ----------------------------------

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/punjab-blood-connect";

  const hash = bcrypt.hashSync(PASSWORD, 12);
  console.log("Generated hash:", hash);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  await client.query("DELETE FROM admins WHERE email = $1", [EMAIL]);

  const result = await client.query(
    "INSERT INTO admins (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
    [NAME, EMAIL, hash, "admin"]
  );

  console.log("Inserted admin:", result.rows[0]);

  const check = await client.query("SELECT password_hash FROM admins WHERE email = $1", [EMAIL]);
  const storedHash = check.rows[0].password_hash;
  const matches = bcrypt.compareSync(PASSWORD, storedHash);
  console.log("Stored hash matches password:", matches);

  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});