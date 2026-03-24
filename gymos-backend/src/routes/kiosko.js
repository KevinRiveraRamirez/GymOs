const express = require("express");
const pool    = require("../db/pool");

const router = express.Router();

// ── GET /api/kiosko/search?q=...&gymId=... ────────────────────────────────────
// Búsqueda en tiempo real por nombre o cédula
router.get("/search", async (req, res) => {
  const { q, gymId } = req.query;
  if (!q || !gymId || q.trim().length < 2)
    return res.json([]);

  try {
    const search = `%${q.trim().toLowerCase()}%`;
    const result = await pool.query(`
      SELECT id, name, cedula, plan, status, blocked,
             TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at
      FROM members
      WHERE gym_id = $1
        AND (LOWER(name) LIKE $2 OR cedula LIKE $3)
      ORDER BY name ASC
      LIMIT 8
    `, [parseInt(gymId), search, `%${q.trim()}%`]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ── GET /api/kiosko/member?cedula=...&gymId=... ───────────────────────────────
router.get("/member", async (req, res) => {
  const { cedula, gymId } = req.query;
  if (!cedula || !gymId)
    return res.status(400).json({ error: "Cedula y gymId requeridos" });

  try {
    const memberRes = await pool.query(`
      SELECT id, name, cedula, plan, status, blocked, blacklist_reason,
             TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at
      FROM members
      WHERE cedula = $1 AND gym_id = $2
    `, [cedula.trim(), parseInt(gymId)]);

    if (!memberRes.rows[0])
      return res.status(404).json({ error: "Miembro no encontrado" });

    const member = memberRes.rows[0];
    const today = new Date().toISOString().split("T")[0];
    const attRes = await pool.query(`
      SELECT id FROM attendance
      WHERE member_id = $1 AND gym_id = $2 AND date = $3 AND exit_at IS NULL
    `, [member.id, parseInt(gymId), today]);

    res.json({ ...member, alreadyIn: attRes.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ── POST /api/kiosko/attendance ───────────────────────────────────────────────
router.post("/attendance", async (req, res) => {
  const { gymId, memberId, memberName, cedula, plan } = req.body;
  if (!gymId || !memberId)
    return res.status(400).json({ error: "Datos incompletos" });

  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await pool.query(`
      SELECT id FROM attendance
      WHERE member_id = $1 AND gym_id = $2 AND date = $3 AND exit_at IS NULL
    `, [memberId, parseInt(gymId), today]);

    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Este miembro ya esta dentro del gimnasio" });

    await pool.query(`
      INSERT INTO attendance (gym_id, member_id, member_name, cedula, plan, type, created_by)
      VALUES ($1, $2, $3, $4, $5, 'member', NULL)
    `, [parseInt(gymId), memberId, memberName, cedula || null, plan]);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

module.exports = router;
