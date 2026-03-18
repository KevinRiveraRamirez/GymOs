const express = require("express");
const pool    = require("../db/pool");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const PLAN_DAYS = { "Día": 1, Semanal: 7, Quincenal: 15, Mensual: 30, Bimensual: 60 };

const expiresDate = (plan, joinedAt) => {
  const d = joinedAt ? new Date(joinedAt) : new Date();
  d.setDate(d.getDate() + (PLAN_DAYS[plan] || 30));
  return d.toISOString().split("T")[0];
};

// ── GET /api/members ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { search = "", status = "all", plan = "all", page = 1, limit = 50 } = req.query;
  const gymId = req.user.gymId;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let conditions = ["gym_id = $1"];
    let params = [gymId];
    let i = 2;

    if (search) {
      conditions.push(`(LOWER(name) LIKE $${i} OR cedula LIKE $${i+1} OR phone LIKE $${i+2})`);
      const q = `%${search.toLowerCase()}%`;
      params.push(q, `%${search}%`, `%${search}%`);
      i += 3;
    }
    if (status !== "all") {
      if (status === "blocked") {
        conditions.push(`blocked = true`);
      } else {
        conditions.push(`status = $${i} AND blocked = false`);
        params.push(status); i++;
      }
    }
    if (plan !== "all") {
      conditions.push(`plan = $${i}`);
      params.push(plan); i++;
    }

    const where = conditions.join(" AND ");

    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, cedula, name, phone, plan, status,
                TO_CHAR(joined_at, 'YYYY-MM-DD')  AS joined_at,
                TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at,
                family_group, notes, blocked, blacklist_reason, created_at
         FROM members WHERE ${where}
         ORDER BY joined_at DESC
         LIMIT $${i} OFFSET $${i+1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM members WHERE ${where}`, params)
    ]);

    res.json({
      members: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener miembros" });
  }
});

// ── GET /api/members/alerts ──────────────────────────────────────────────────
router.get("/alerts", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const result = await pool.query(`
      SELECT id, cedula, name, phone, plan, status,
             TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at
      FROM members
      WHERE gym_id = $1 AND blocked = false
        AND plan != 'Día'
        AND expires_at <= CURRENT_DATE + INTERVAL '3 days'
      ORDER BY expires_at ASC
    `, [gymId]);

    const members = result.rows;
    const today = new Date().toISOString().split("T")[0];

    res.json({
      overdue:       members.filter(m => m.expires_at < today),
      expiringToday: members.filter(m => m.expires_at === today),
      expiringSoon:  members.filter(m => m.expires_at > today),
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener alertas" });
  }
});

// ── GET /api/members/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const [memberRes, paymentsRes, attendanceRes] = await Promise.all([
      pool.query(
        `SELECT id, cedula, name, phone, plan, status, blocked, blacklist_reason,
                family_group, notes, created_at, updated_at,
                TO_CHAR(joined_at, 'YYYY-MM-DD')  AS joined_at,
                TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at
         FROM members WHERE id = $1 AND gym_id = $2`,
        [req.params.id, gymId]
      ),
      pool.query(
        "SELECT * FROM payments WHERE member_id = $1 AND gym_id = $2 ORDER BY paid_at DESC LIMIT 24",
        [req.params.id, gymId]
      ),
      pool.query(
        "SELECT date, attended_at, plan FROM attendance WHERE member_id = $1 AND gym_id = $2 ORDER BY attended_at DESC LIMIT 30",
        [req.params.id, gymId]
      )
    ]);

    if (!memberRes.rows[0])
      return res.status(404).json({ error: "Miembro no encontrado" });

    res.json({
      ...memberRes.rows[0],
      payments: paymentsRes.rows,
      recentAttendance: attendanceRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener miembro" });
  }
});

// ── POST /api/members ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { cedula, name, phone, plan, familyGroup, notes, joinedAt } = req.body;
  const gymId = req.user.gymId;

  if (!cedula || !name || !plan)
    return res.status(400).json({ error: "Cédula, nombre y plan son requeridos" });
  if (!PLAN_DAYS[plan])
    return res.status(400).json({ error: "Plan inválido" });

  const joinedDate = joinedAt || new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(`
      INSERT INTO members
        (gym_id, cedula, name, phone, plan, status, joined_at, expires_at, family_group, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10)
      RETURNING *
    `, [gymId, cedula.trim(), name.trim(), phone, plan,
        joinedDate, expiresDate(plan, joinedDate),
        familyGroup || null, notes || null, req.user.userId]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un miembro con esa cédula en este gimnasio" });
    console.error(err);
    res.status(500).json({ error: "Error al registrar miembro" });
  }
});

// ── PUT /api/members/:id ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { name, phone, plan, familyGroup, notes, joinedAt } = req.body;
  const gymId = req.user.gymId;

  if (!PLAN_DAYS[plan])
    return res.status(400).json({ error: "Plan inválido" });

  const joinedDate = joinedAt || new Date().toISOString().split("T")[0];
  const newExpiry = expiresDate(plan, joinedDate);

  try {
    const result = await pool.query(`
      UPDATE members
      SET name=$1, phone=$2, plan=$3, family_group=$4, notes=$5,
          joined_at=$6, expires_at=$7, updated_at=NOW()
      WHERE id=$8 AND gym_id=$9
      RETURNING *
    `, [name, phone, plan, familyGroup || null, notes || null,
        joinedDate, newExpiry, req.params.id, gymId]);

    if (!result.rows[0]) return res.status(404).json({ error: "Miembro no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar miembro" });
  }
});

// ── PATCH /api/members/:id/block ─────────────────────────────────────────────
router.patch("/:id/block", adminOnly, async (req, res) => {
  const { blocked, blacklistReason } = req.body;
  const gymId = req.user.gymId;

  try {
    const result = await pool.query(`
      UPDATE members
      SET blocked=$1, blacklist_reason=$2,
          status = CASE WHEN $1 THEN 'inactive' ELSE status END,
          updated_at=NOW()
      WHERE id=$3 AND gym_id=$4
      RETURNING id, name, blocked, blacklist_reason, status
    `, [blocked, blacklistReason || null, req.params.id, gymId]);

    if (!result.rows[0]) return res.status(404).json({ error: "Miembro no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

// ── DELETE /api/members/:id ──────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const result = await pool.query(
      "DELETE FROM members WHERE id=$1 AND gym_id=$2 RETURNING id, name",
      [req.params.id, gymId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Miembro no encontrado" });
    res.json({ ok: true, deleted: result.rows[0].name });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar miembro" });
  }
});

module.exports = router;
