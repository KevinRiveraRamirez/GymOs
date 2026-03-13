const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const pool    = require("../db/pool");
const { auth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña requeridos" });

  try {
    const result = await pool.query(
      `SELECT u.*, g.name AS gym_name, g.slug AS gym_slug, g.country_code
       FROM users u
       JOIN gyms g ON g.id = u.gym_id
       WHERE LOWER(u.email) = LOWER($1) AND u.active = true AND g.active = true`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Credenciales incorrectas" });

    // Actualizar último login
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = jwt.sign(
      { userId: user.id, gymId: user.gym_id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        gym: { id: user.gym_id, name: user.gym_name, slug: user.gym_slug, countryCode: user.country_code }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// GET /api/auth/me  — valida token y devuelve perfil actual
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
              g.id AS gym_id, g.name AS gym_name, g.slug, g.country_code
       FROM users u JOIN gyms g ON g.id = u.gym_id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Usuario no encontrado" });
    const u = result.rows[0];
    res.json({
      id: u.id, name: u.name, email: u.email, role: u.role,
      gym: { id: u.gym_id, name: u.gym_name, slug: u.slug, countryCode: u.country_code }
    });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// PUT /api/auth/password — cambiar contraseña propia
router.put("/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "Contraseña nueva debe tener al menos 6 caracteres" });

  try {
    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.userId]);
    if (!(await bcrypt.compare(currentPassword, result.rows[0].password)))
      return res.status(401).json({ error: "Contraseña actual incorrecta" });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hash, req.user.userId]);
    res.json({ message: "Contraseña actualizada" });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
