require("dotenv").config();
const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

p.query("SELECT id, member_id, member_name, exit_at FROM attendance WHERE date = CURRENT_DATE")
  .then(r => {
    console.log("Registros de hoy:", r.rows.length);
    console.log(JSON.stringify(r.rows, null, 2));
  })
  .catch(e => console.error("Error:", e.message))
  .finally(() => p.end());