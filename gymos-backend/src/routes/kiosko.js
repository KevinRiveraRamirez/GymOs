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
      SELECT id, name, cedula, plan, blocked,
             TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at,
             CASE
               WHEN blocked = true THEN 'blocked'
               WHEN expires_at < CURRENT_DATE THEN 'inactive'
               ELSE 'active'
             END AS status
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
      SELECT id, name, cedula, plan, blocked, blacklist_reason,
             TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at,
             CASE
               WHEN blocked = true THEN 'blocked'
               WHEN expires_at < CURRENT_DATE THEN 'inactive'
               ELSE 'active'
             END AS status
      FROM members
      WHERE cedula = $1 AND gym_id = $2
    `, [cedula.trim(), parseInt(gymId)]);

    if (!memberRes.rows[0])
      return res.status(404).json({ error: "Miembro no encontrado" });

    const member = memberRes.rows[0];
    const attRes = await pool.query(`
      SELECT id FROM attendance
      WHERE member_id = $1 AND gym_id = $2 AND date = (NOW() AT TIME ZONE 'America/Costa_Rica')::date AND exit_at IS NULL
    `, [member.id, parseInt(gymId)]);

    res.json({ ...member, alreadyIn: attRes.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ── GET /api/kiosko/inside?memberId=...&gymId=...&date=... ───────────────────────
// Verifica si un miembro ya está dentro del gimnasio hoy
router.get("/inside", async (req, res) => {
  const { memberId, gymId, date } = req.query;
  if (!memberId || !gymId) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const result = await pool.query(`
      SELECT id FROM attendance
      WHERE member_id = $1 AND gym_id = $2 AND date = (NOW() AT TIME ZONE 'America/Costa_Rica')::date AND exit_at IS NULL
    `, [parseInt(memberId), parseInt(gymId)]);

    res.json({
      inside: result.rows.length > 0,
      attendanceId: result.rows[0]?.id || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ── PATCH /api/kiosko/attendance/:id/exit ────────────────────────────────────
// Marca salida desde el kiosko
router.patch("/attendance/:id/exit", async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE attendance
      SET exit_at = NOW()
      WHERE id = $1 AND exit_at IS NULL
      RETURNING id
    `, [req.params.id]);

    if (!result.rows[0])
      return res.status(404).json({ error: "Registro no encontrado" });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar salida" });
  }
});

// ── POST /api/kiosko/attendance ───────────────────────────────────────────────
router.post("/attendance", async (req, res) => {
  const { gymId, memberId, memberName, cedula, plan } = req.body;
  if (!gymId || !memberId)
    return res.status(400).json({ error: "Datos incompletos" });

  try {
    const existing = await pool.query(`
      SELECT id FROM attendance
      WHERE member_id = $1 AND gym_id = $2 AND date = (NOW() AT TIME ZONE 'America/Costa_Rica')::date AND exit_at IS NULL
    `, [memberId, parseInt(gymId)]);

    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Este miembro ya esta dentro del gimnasio" });

    await pool.query(`
      INSERT INTO attendance (gym_id, member_id, member_name, cedula, plan, type, date, created_by)
      VALUES ($1, $2, $3, $4, $5, 'member', (NOW() AT TIME ZONE 'America/Costa_Rica')::date, NULL)
    `, [parseInt(gymId), memberId, memberName, cedula || null, plan]);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

// ── POST /api/kiosko/denied ──────────────────────────────────────────────────
// Registra acceso denegado desde la tablet kiosko
router.post("/denied", async (req, res) => {
  const { gymId, memberName, cedula, reason } = req.body;
  if (!gymId || !memberName) return res.status(400).json({ error: "Datos incompletos" });

  const CR_TODAY_EXPR = "(NOW() AT TIME ZONE 'America/Costa_Rica')::date";
  try {
    await pool.query(`
      INSERT INTO attendance (gym_id, member_id, member_name, cedula, plan, type, date, notes, created_by)
      VALUES ($1, NULL, $2, $3, 'N/A', 'denied', ${CR_TODAY_EXPR}, $4, NULL)
    `, [parseInt(gymId), memberName, cedula || null, reason || 'Acceso denegado']);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar acceso denegado" });
  }
});

module.exports = router;
