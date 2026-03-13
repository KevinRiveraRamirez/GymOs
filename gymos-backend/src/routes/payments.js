const express = require("express");
const pool    = require("../db/pool");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const PLAN_DAYS = { Mensual: 30, Semanal: 7, "Día": 1 };

// Fecha de hoy en hora de Costa Rica
const CR_TODAY = `(NOW() AT TIME ZONE 'America/Costa_Rica')::date`;

// ── GET /api/payments ────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { period = "month", method, page = 1, limit = 100 } = req.query;
  const gymId = req.user.gymId;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let dateFilter = "";
  if (period === "day")   dateFilter = `AND (paid_at AT TIME ZONE 'America/Costa_Rica')::date = ${CR_TODAY}`;
  if (period === "week")  dateFilter = `AND (paid_at AT TIME ZONE 'America/Costa_Rica')::date >= DATE_TRUNC('week', ${CR_TODAY})`;
  if (period === "month") dateFilter = `AND (paid_at AT TIME ZONE 'America/Costa_Rica')::date >= DATE_TRUNC('month', ${CR_TODAY})`;

  const methodFilter = method ? `AND method = '${method}'` : "";

  try {
    const result = await pool.query(`
      SELECT id, member_id, member_name, cedula, plan, amount, method, discount, type,
             paid_at,
             created_at
      FROM payments
      WHERE gym_id = $1 ${dateFilter} ${methodFilter}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [gymId, parseInt(limit), offset]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pagos" });
  }
});

// ── GET /api/payments/report ─────────────────────────────────────────────────
router.get("/report", async (req, res) => {
  const { period = "day" } = req.query;
  const gymId = req.user.gymId;

let dateFilter = `paid_at = CURRENT_DATE`;
  if (period === "week")  dateFilter = `(paid_at AT TIME ZONE 'America/Costa_Rica')::date >= DATE_TRUNC('week', ${CR_TODAY})`;
  if (period === "month") dateFilter = `(paid_at AT TIME ZONE 'America/Costa_Rica')::date >= DATE_TRUNC('month', ${CR_TODAY})`;

  try {
    const [totalsRes, byMethodRes, byPlanRes, listRes] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS transactions, COALESCE(SUM(amount),0) AS total,
               COUNT(*) FILTER (WHERE type='visitor') AS visitors
        FROM payments WHERE gym_id=$1 AND ${dateFilter}
      `, [gymId]),
      pool.query(`
        SELECT method, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
        FROM payments WHERE gym_id=$1 AND ${dateFilter}
        GROUP BY method
      `, [gymId]),
      pool.query(`
        SELECT plan, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
        FROM payments WHERE gym_id=$1 AND ${dateFilter}
        GROUP BY plan ORDER BY total DESC
      `, [gymId]),
      pool.query(`
        SELECT id, member_name, cedula, plan, amount, method, discount, type,
               (paid_at AT TIME ZONE 'America/Costa_Rica')::date AS paid_at
        FROM payments WHERE gym_id=$1 AND ${dateFilter}
        ORDER BY created_at DESC
      `, [gymId])
    ]);

    res.json({
      period,
      summary: totalsRes.rows[0],
      byMethod: byMethodRes.rows,
      byPlan:   byPlanRes.rows,
      payments: listRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

// ── POST /api/payments ───────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { memberId, memberName, cedula, plan, amount, method, discount = 0, type = "member" } = req.body;
  const gymId = req.user.gymId;

  if (!method || !["SINPE","Efectivo"].includes(method))
    return res.status(400).json({ error: "Método de pago inválido" });

  const finalAmount = parseInt(amount);
  if (!finalAmount || finalAmount <= 0)
    return res.status(400).json({ error: "Monto inválido" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

 const payRes = await client.query(`
  INSERT INTO payments
    (gym_id, member_id, member_name, cedula, plan, amount, method, discount, type, created_by, paid_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, (NOW() AT TIME ZONE 'America/Costa_Rica')::date)
  RETURNING *,
    (paid_at AT TIME ZONE 'America/Costa_Rica')::date AS paid_at
`, [gymId, memberId||null, memberName, cedula||null, plan,
    finalAmount, method, parseInt(discount), type, req.user.userId]);

    // Renovar membresía automáticamente al pagar
    if (type === "member" && memberId) {
      const days = PLAN_DAYS[plan] || 30;
      await client.query(`
        UPDATE members
        SET status = 'active',
            expires_at = ${CR_TODAY} + $1::interval,
            updated_at = NOW()
        WHERE id = $2 AND gym_id = $3
      `, [`${days} days`, memberId, gymId]);
    }

    await client.query("COMMIT");
    res.status(201).json(payRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error al registrar pago" });
  } finally {
    client.release();
  }
});

module.exports = router;