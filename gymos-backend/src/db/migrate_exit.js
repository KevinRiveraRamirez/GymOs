require("dotenv").config();
const pool = require("./pool");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("⏳ Agregando columna exit_at a attendance...");
    await client.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_at TIMESTAMP DEFAULT NULL;
    `);
    console.log("✅ Columna exit_at agregada exitosamente.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
