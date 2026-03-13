require("dotenv").config();
const pool = require("./pool");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("⏳ Ejecutando migraciones...");
    await client.query("BEGIN");

    // ─── GYMS (tenants) ──────────────────────────────────────────────────────
    // Cada gimnasio es un tenant independiente. Sus datos están completamente
    // separados. Un gym_id en cada tabla garantiza el aislamiento.
    await client.query(`
      CREATE TABLE IF NOT EXISTS gyms (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(100) NOT NULL,
        slug         VARCHAR(60)  UNIQUE NOT NULL, -- ej: "gym-los-reyes" (para URL)
        owner_name   VARCHAR(100),
        owner_email  VARCHAR(100),
        phone        VARCHAR(30),
        address      TEXT,
        country_code VARCHAR(5) DEFAULT '506',     -- prefijo WhatsApp
        plan         VARCHAR(20) DEFAULT 'basic',  -- 'basic' | 'pro' (tu plan SaaS)
        active       BOOLEAN DEFAULT true,
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── USERS (staff por gimnasio) ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        gym_id      INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(100) NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) DEFAULT 'staff',   -- 'admin' | 'staff'
        active      BOOLEAN DEFAULT true,
        last_login  TIMESTAMP,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(gym_id, email)
      );
    `);

    // ─── MEMBERS ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id               SERIAL PRIMARY KEY,
        gym_id           INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        cedula           VARCHAR(30) NOT NULL,
        name             VARCHAR(100) NOT NULL,
        phone            VARCHAR(30),
        plan             VARCHAR(20) NOT NULL,     -- 'Mensual' | 'Semanal' | 'Día'
        status           VARCHAR(20) DEFAULT 'active',
        joined_at        DATE DEFAULT CURRENT_DATE,
        expires_at       DATE NOT NULL,
        family_group     VARCHAR(100),
        notes            TEXT,
        blocked          BOOLEAN DEFAULT false,
        blacklist_reason TEXT,
        created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE(gym_id, cedula)                     -- cédula única POR gimnasio
      );
    `);

    // ─── PAYMENTS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id          SERIAL PRIMARY KEY,
        gym_id      INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        member_id   INTEGER REFERENCES members(id) ON DELETE SET NULL,
        member_name VARCHAR(100) NOT NULL,
        cedula      VARCHAR(30),
        plan        VARCHAR(20) NOT NULL,
        amount      INTEGER NOT NULL,              -- en colones enteros
        method      VARCHAR(20) NOT NULL,          -- 'SINPE' | 'Efectivo'
        discount    INTEGER DEFAULT 0,
        type        VARCHAR(20) DEFAULT 'member',  -- 'member' | 'visitor'
        paid_at     DATE DEFAULT CURRENT_DATE,
        created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── ATTENDANCE ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id          SERIAL PRIMARY KEY,
        gym_id      INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        member_id   INTEGER REFERENCES members(id) ON DELETE SET NULL,
        member_name VARCHAR(100) NOT NULL,
        cedula      VARCHAR(30),
        plan        VARCHAR(20),
        type        VARCHAR(20) DEFAULT 'member',
        date        DATE DEFAULT CURRENT_DATE,
        attended_at TIMESTAMP DEFAULT NOW(),
        created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // ─── ÍNDICES ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_members_gym      ON members(gym_id);
      CREATE INDEX IF NOT EXISTS idx_members_cedula   ON members(gym_id, cedula);
      CREATE INDEX IF NOT EXISTS idx_members_name     ON members(gym_id, name);
      CREATE INDEX IF NOT EXISTS idx_members_status   ON members(gym_id, status);
      CREATE INDEX IF NOT EXISTS idx_members_expires  ON members(gym_id, expires_at);
      CREATE INDEX IF NOT EXISTS idx_payments_gym     ON payments(gym_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date    ON payments(gym_id, paid_at);
      CREATE INDEX IF NOT EXISTS idx_attendance_gym   ON attendance(gym_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date  ON attendance(gym_id, date);
    `);

    await client.query("COMMIT");
    console.log("✅ Migraciones completadas exitosamente.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en migración:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
