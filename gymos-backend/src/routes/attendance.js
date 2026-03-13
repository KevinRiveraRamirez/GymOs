const express = require("express");
const pool    = require("../db/pool");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// ── GET /api/attendance ──────────────────────────────────────────────────────
// ?date=YYYY-MM-DD (default: hoy)
router.get("/", async (req, res) => {
  const gymId = req.user.gymId;
  const date  = req.query.date || new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(`
      SELECT id, member_id, member_name, cedula, plan, type, date,
             TO_CHAR(attended_at AT TIME ZONE 'America/Costa_Rica', 'HH24:MI') AS time,
             TO_CHAR(exit_at AT TIME ZONE 'America/Costa_Rica', 'HH24:MI') AS exit_time
      FROM attendance
      WHERE gym_id = $1 AND date = $2
      ORDER BY attended_at DESC
    `, [gymId, date]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener asistencia" });
  }
});

// ── GET /api/attendance/stats ────────────────────────────────────────────────
// Estadísticas de la semana actual
router.get("/stats", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const result = await pool.query(`
      SELECT date, COUNT(*) AS visits,
             COUNT(*) FILTER (WHERE type='visitor') AS visitors
      FROM attendance
      WHERE gym_id=$1 AND date >= DATE_TRUNC('week', CURRENT_DATE)
      GROUP BY date ORDER BY date ASC
    `, [gymId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// ── POST /api/attendance ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { memberId, memberName, cedula, plan, type = "member" } = req.body;
  const gymId = req.user.gymId;
  const today = new Date().toISOString().split("T")[0];

  // Verificar si ya registró hoy sin salida (solo para miembros)
  if (memberId) {
    const existing = await pool.query(
      "SELECT id FROM attendance WHERE gym_id=$1 AND member_id=$2 AND date=$3 AND exit_at IS NULL",
      [gymId, memberId, today]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Este miembro ya está dentro del gimnasio hoy" });
  }

  try {
    const result = await pool.query(`
      INSERT INTO attendance (gym_id, member_id, member_name, cedula, plan, type, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *,
        TO_CHAR(attended_at AT TIME ZONE 'America/Costa_Rica', 'HH24:MI') AS time,
        NULL AS exit_time
    `, [gymId, memberId || null, memberName, cedula || null, plan, type, req.user.userId]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

// ── PATCH /api/attendance/:id/exit ───────────────────────────────────────────
router.patch("/:id/exit", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const result = await pool.query(`
      UPDATE attendance SET exit_at = NOW()
      WHERE id = $1 AND gym_id = $2 AND exit_at IS NULL
      RETURNING *,
        TO_CHAR(attended_at AT TIME ZONE 'America/Costa_Rica', 'HH24:MI') AS time,
        TO_CHAR(exit_at AT TIME ZONE 'America/Costa_Rica', 'HH24:MI') AS exit_time
    `, [req.params.id, gymId]);
    if (!result.rows[0]) return res.status(404).json({ error: "Registro no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al registrar salida" });
  }
});

module.exports = router;
