const express = require("express");
const pool    = require("../db/pool");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Fecha de hoy en Costa Rica
const CR_TODAY = `(NOW() AT TIME ZONE 'America/Costa_Rica')::date`;

// ── GET /api/attendance ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const gymId = req.user.gymId;
  // Si viene date en query usarla, si no usar hoy en CR
  const date = req.query.date || null;

  try {
    const result = await pool.query(`
      SELECT id, member_id, member_name, cedula, plan, type, date,
             TO_CHAR(attended_at AT TIME ZONE 'America/Costa_Rica', 'HH:MI AM') AS time,
             TO_CHAR(exit_at AT TIME ZONE 'America/Costa_Rica', 'HH:MI AM') AS exit_time
      FROM attendance
      WHERE gym_id = $1 AND date = ${date ? '$2' : CR_TODAY}
      ORDER BY attended_at DESC
    `, date ? [gymId, date] : [gymId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener asistencia" });
  }
});

// ── GET /api/attendance/stats ────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const result = await pool.query(`
      SELECT date, COUNT(*) AS visits,
             COUNT(*) FILTER (WHERE type='visitor') AS visitors
      FROM attendance
      WHERE gym_id=$1 AND date >= DATE_TRUNC('week', ${CR_TODAY})
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

  // Verificar si ya registró hoy sin salida (solo para miembros)
  if (memberId) {
    const existing = await pool.query(
      `SELECT id FROM attendance WHERE gym_id=$1 AND member_id=$2 AND date=${CR_TODAY} AND exit_at IS NULL`,
      [gymId, memberId]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Este miembro ya está dentro del gimnasio hoy" });
  }

  try {
    const result = await pool.query(`
      INSERT INTO attendance (gym_id, member_id, member_name, cedula, plan, type, date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6, ${CR_TODAY}, $7)
      RETURNING *,
        TO_CHAR(attended_at AT TIME ZONE 'America/Costa_Rica', 'HH:MI AM') AS time,
        NULL AS exit_time
    `, [gymId, memberId || null, memberName, cedula || null, plan, type, req.user.userId]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
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
        TO_CHAR(attended_at AT TIME ZONE 'America/Costa_Rica', 'HH:MI AM') AS time,
        TO_CHAR(exit_at AT TIME ZONE 'America/Costa_Rica', 'HH:MI AM') AS exit_time
    `, [req.params.id, gymId]);
    if (!result.rows[0]) return res.status(404).json({ error: "Registro no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al registrar salida" });
  }
});

// ── POST /api/attendance/denied ──────────────────────────────────────────────
// Registra un intento de acceso denegado desde el kiosko
router.post("/denied", async (req, res) => {
  const { gymId, memberName, cedula, reason } = req.body;
  if (!gymId || !memberName) return res.status(400).json({ error: "Datos incompletos" });

  try {
    await pool.query(`
      INSERT INTO attendance (gym_id, member_id, member_name, cedula, plan, type, date, created_by)
      VALUES ($1, NULL, $2, $3, 'N/A', 'denied', (NOW() AT TIME ZONE 'America/Costa_Rica')::date, NULL)
    `, [parseInt(gymId), memberName, cedula || null]);

    // Guardar razón en notes usando una actualización inmediata
    await pool.query(`
      UPDATE attendance SET notes = $1
      WHERE gym_id = $2 AND member_name = $3 AND type = 'denied'
        AND date = (NOW() AT TIME ZONE 'America/Costa_Rica')::date
        AND notes IS NULL
    `, [reason || 'Acceso denegado', parseInt(gymId), memberName]);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar acceso denegado" });
  }
});

module.exports = router;
