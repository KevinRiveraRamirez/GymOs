require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./pool");

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log("⏳ Creando datos de prueba...");
    await client.query("BEGIN");

    // Crear gimnasio demo
    const gymRes = await client.query(`
      INSERT INTO gyms (name, slug, owner_name, owner_email, phone, country_code)
      VALUES ('GymOS Demo', 'gymos-demo', 'Admin Demo', 'admin@gymos.com', '8888-0000', '506')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const gymId = gymRes.rows[0].id;

    // Crear usuario admin
    const hash = await bcrypt.hash("admin123", 12);
    const userRes = await client.query(`
      INSERT INTO users (gym_id, name, email, password, role)
      VALUES ($1, 'Administrador', 'admin@gymos.com', $2, 'admin')
      ON CONFLICT (gym_id, email) DO UPDATE SET password = EXCLUDED.password
      RETURNING id;
    `, [gymId, hash]);
    const userId = userRes.rows[0].id;

    // Crear miembros de prueba
    const members = [
      { cedula:"101230456", name:"Carlos Mendoza Arias",  phone:"8888-1234", plan:"Mensual",  expires: daysFromNow(30) },
      { cedula:"205670123", name:"Ana Rodríguez Mora",    phone:"7777-5678", plan:"Mensual",  expires: daysFromNow(10) },
      { cedula:"312340789", name:"Jorge Vásquez León",    phone:"6666-9012", plan:"Semanal",  expires: daysFromNow(-5) },
      { cedula:"401110345", name:"María Jiménez Castro",  phone:"8811-3456", plan:"Mensual",  expires: daysFromNow(40) },
      { cedula:"504450678", name:"Luis Pérez Salas",      phone:"7722-7890", plan:"Mensual",  expires: daysFromNow(-10) },
    ];

    for (const m of members) {
      const status = new Date(m.expires) < new Date() ? "overdue" : "active";
      await client.query(`
        INSERT INTO members (gym_id, cedula, name, phone, plan, status, expires_at, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (gym_id, cedula) DO NOTHING;
      `, [gymId, m.cedula, m.name, m.phone, m.plan, status, m.expires, userId]);
    }

    await client.query("COMMIT");
    console.log("✅ Seed completado.");
    console.log("─────────────────────────────────");
    console.log("   Gimnasio: GymOS Demo");
    console.log("   Email:    admin@gymos.com");
    console.log("   Password: admin123");
    console.log("─────────────────────────────────");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en seed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

seed().catch(() => process.exit(1));
