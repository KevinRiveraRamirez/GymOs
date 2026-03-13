const express = require("express");
const bcrypt  = require("bcryptjs");
const pool    = require("../db/pool");
const { auth } = require("../middleware/auth");

const router  = express.Router();

// ── POST /api/gyms/register ──────────────────────────────────────────────────
// Registro público: crea un nuevo gimnasio + su primer usuario admin
// Esta ruta NO requiere auth (es para nuevos clientes que se registran)
router.post("/register", async (req, res) => {
  const { gymName, ownerName, ownerEmail, password, phone, countryCode = "506" } = req.body;

  if (!gymName || !ownerEmail || !password || password.length < 6)
    return res.status(400).json({ error: "Datos incompletos. La contraseña debe tener al menos 6 caracteres." });

  // Generar slug único a partir del nombre
  const slug = gymName
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55) + "-" + Date.now().toString().slice(-4);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const gymRes = await client.query(`
      INSERT INTO gyms (name, slug, owner_name, owner_email, phone, country_code)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, slug
    `, [gymName, slug, ownerName || ownerEmail, ownerEmail, phone || null, countryCode]);

    const gym = gymRes.rows[0];
    const hash = await bcrypt.hash(password, 12);

    await client.query(`
      INSERT INTO users (gym_id, name, email, password, role)
      VALUES ($1,$2,$3,$4,'admin')
    `, [gym.id, ownerName || "Administrador", ownerEmail, hash]);

    await client.query("COMMIT");
    res.status(201).json({
      message: "Gimnasio registrado exitosamente",
      gym: { id: gym.id, name: gym.name, slug: gym.slug }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    console.error(err);
    res.status(500).json({ error: "Error al registrar gimnasio" });
  } finally {
    client.release();
  }
});

// ── GET /api/gyms/me ─────────────────────────────────────────────────────────
// Info del gimnasio del usuario autenticado
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, slug, owner_name, owner_email, phone, country_code, plan, created_at FROM gyms WHERE id=$1",
      [req.user.gymId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener datos del gimnasio" });
  }
});

// ── GET /api/gyms/me/users ───────────────────────────────────────────────────
// Lista de usuarios/staff del gimnasio (solo admin)
router.get("/me/users", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Solo administradores" });
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, active, last_login, created_at FROM users WHERE gym_id=$1 ORDER BY name",
      [req.user.gymId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// ── POST /api/gyms/me/users ──────────────────────────────────────────────────
// Crear usuario staff (solo admin)
router.post("/me/users", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Solo administradores" });

  const { name, email, password, role = "staff" } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Nombre, email y contraseña requeridos" });

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(`
      INSERT INTO users (gym_id, name, email, password, role)
      VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, active
    `, [req.user.gymId, name, email, hash, role]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un usuario con ese email en este gimnasio" });
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

module.exports = router;
