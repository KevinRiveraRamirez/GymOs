const express = require("express");
const pool    = require("../db/pool");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const CR_TODAY = `((NOW() AT TIME ZONE 'America/Costa_Rica')::date)`;

// ── GET /api/analytics/overview ───────────────────────────────────────────────
router.get("/overview", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const [membersRes, revenueRes, attendanceTodayRes, attendanceAvgRes, newMembersRes, churnRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='active'  AND NOT blocked) AS active,
          COUNT(*) FILTER (WHERE status='overdue' AND NOT blocked) AS overdue,
          COUNT(*) FILTER (WHERE blocked)                          AS blocked,
          COUNT(*)                                                  AS total
        FROM members WHERE gym_id=$1
      `, [gymId]),

      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE paid_at >= DATE_TRUNC('month', ${CR_TODAY})), 0)   AS this_month,
          COALESCE(SUM(amount) FILTER (WHERE
            paid_at >= DATE_TRUNC('month', ${CR_TODAY} - INTERVAL '1 month') AND
            paid_at <  DATE_TRUNC('month', ${CR_TODAY})), 0)                                     AS last_month,
          COALESCE(SUM(amount) FILTER (WHERE paid_at = ${CR_TODAY}), 0)                         AS today
        FROM payments WHERE gym_id=$1
      `, [gymId]),

      // Asistencia hoy — query separada
      pool.query(`
        SELECT COUNT(*) AS today
        FROM attendance
        WHERE gym_id=$1
          AND date = ${CR_TODAY}
          AND type != 'denied'
      `, [gymId]),

      // Promedio últimos 30 días — query separada
      pool.query(`
        SELECT COALESCE(ROUND(AVG(daily_count)), 0) AS avg_30
        FROM (
          SELECT date, COUNT(*) FILTER (WHERE type != 'denied') AS daily_count
          FROM attendance
          WHERE gym_id=$1
            AND date >= (${CR_TODAY} - INTERVAL '30 days')
            AND date <  ${CR_TODAY}
          GROUP BY date
        ) sub
      `, [gymId]),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE joined_at >= DATE_TRUNC('month', ${CR_TODAY}))                 AS this_month,
          COUNT(*) FILTER (WHERE
            joined_at >= DATE_TRUNC('month', ${CR_TODAY} - INTERVAL '1 month') AND
            joined_at <  DATE_TRUNC('month', ${CR_TODAY}))                                       AS last_month
        FROM members WHERE gym_id=$1
      `, [gymId]),

      pool.query(`
        SELECT COUNT(DISTINCT member_id) AS retained
        FROM payments
        WHERE gym_id=$1
          AND member_id IS NOT NULL
          AND paid_at >= DATE_TRUNC('month', ${CR_TODAY} - INTERVAL '1 month')
          AND member_id IN (
            SELECT DISTINCT member_id FROM payments
            WHERE gym_id=$1
              AND paid_at >= DATE_TRUNC('month', ${CR_TODAY} - INTERVAL '2 months')
              AND paid_at <  DATE_TRUNC('month', ${CR_TODAY} - INTERVAL '1 month')
              AND member_id IS NOT NULL
          )
      `, [gymId]),
    ]);

    const m   = membersRes.rows[0];
    const r   = revenueRes.rows[0];
    const at  = attendanceTodayRes.rows[0];
    const avg = attendanceAvgRes.rows[0];
    const nm  = newMembersRes.rows[0];

    const revChange = Number(r.last_month) > 0
      ? Math.round(((Number(r.this_month) - Number(r.last_month)) / Number(r.last_month)) * 100)
      : null;
    const newMembersChange = Number(nm.last_month) > 0
      ? Math.round(((Number(nm.this_month) - Number(nm.last_month)) / Number(nm.last_month)) * 100)
      : null;

    res.json({
      members: {
        active:   Number(m.active),
        overdue:  Number(m.overdue),
        blocked:  Number(m.blocked),
        total:    Number(m.total),
      },
      revenue: {
        today:     Number(r.today),
        thisMonth: Number(r.this_month),
        lastMonth: Number(r.last_month),
        change:    revChange,
      },
      attendance: {
        today: Number(at.today),
        avg30: Number(avg.avg_30 || 0),
      },
      newMembers: {
        thisMonth: Number(nm.this_month),
        lastMonth: Number(nm.last_month),
        change:    newMembersChange,
      },
      retention: {
        count: Number(churnRes.rows[0].retained),
      },
    });
  } catch (err) {
    console.error("analytics/overview error:", err.message);
    res.status(500).json({ error: "Error al obtener overview" });
  }
});

// ── GET /api/analytics/revenue ────────────────────────────────────────────────
router.get("/revenue", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YY')          AS month,
        DATE_TRUNC('month', paid_at)                              AS month_date,
        COALESCE(SUM(amount), 0)                                  AS total,
        COALESCE(SUM(amount) FILTER (WHERE method='SINPE'), 0)    AS sinpe,
        COALESCE(SUM(amount) FILTER (WHERE method='Efectivo'), 0) AS efectivo,
        COUNT(*)                                                  AS transactions
      FROM payments
      WHERE gym_id=$1
        AND paid_at >= DATE_TRUNC('month', (${CR_TODAY} - INTERVAL '5 months'))
      GROUP BY month_date, month
      ORDER BY month_date ASC
    `, [gymId]);

    res.json(result.rows.map(r => ({
      month:        r.month,
      total:        Number(r.total),
      sinpe:        Number(r.sinpe),
      efectivo:     Number(r.efectivo),
      transactions: Number(r.transactions),
    })));
  } catch (err) {
    console.error("analytics/revenue error:", err.message);
    res.status(500).json({ error: "Error al obtener ingresos" });
  }
});

// ── GET /api/analytics/attendance ─────────────────────────────────────────────
router.get("/attendance", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const [byDayRes, byHourRes, dailyRes] = await Promise.all([
      pool.query(`
        SELECT
          EXTRACT(DOW FROM date) AS dow,
          COUNT(*) FILTER (WHERE type != 'denied') AS visits
        FROM attendance
        WHERE gym_id=$1
          AND date >= (${CR_TODAY} - INTERVAL '30 days')
        GROUP BY dow
        ORDER BY dow
      `, [gymId]),

      pool.query(`
        SELECT
          EXTRACT(HOUR FROM (attended_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')) AS hour,
          COUNT(*) AS visits
        FROM attendance
        WHERE gym_id=$1
          AND date >= (${CR_TODAY} - INTERVAL '30 days')
          AND type != 'denied'
        GROUP BY hour
        ORDER BY hour
      `, [gymId]),

      pool.query(`
        SELECT
          date,
          COUNT(*) FILTER (WHERE type != 'denied') AS visits,
          COUNT(*) FILTER (WHERE type = 'visitor')  AS visitors
        FROM attendance
        WHERE gym_id=$1
          AND date >= (${CR_TODAY} - INTERVAL '13 days')
        GROUP BY date
        ORDER BY date ASC
      `, [gymId]),
    ]);

    const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    res.json({
      byDay: DAYS.map((d, i) => {
        const row = byDayRes.rows.find(r => Number(r.dow) === i);
        return { day: d, visits: row ? Number(row.visits) : 0 };
      }),
      byHour: Array.from({length:24}, (_, h) => {
        const row = byHourRes.rows.find(r => Number(r.hour) === h);
        return { hour: `${h}:00`, visits: row ? Number(row.visits) : 0 };
      }).filter(r => r.visits > 0 || (r.hour >= "05:00" && r.hour <= "22:00")),
      daily: dailyRes.rows.map(r => ({
        date:     String(r.date).slice(0,10),
        visits:   Number(r.visits),
        visitors: Number(r.visitors),
      })),
    });
  } catch (err) {
    console.error("analytics/attendance error:", err.message);
    res.status(500).json({ error: "Error al obtener asistencia" });
  }
});

// ── GET /api/analytics/members ────────────────────────────────────────────────
router.get("/members", async (req, res) => {
  const gymId = req.user.gymId;
  try {
    const [growthRes, plansRes, statusRes, topRes] = await Promise.all([
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', joined_at), 'Mon YY') AS month,
          DATE_TRUNC('month', joined_at)                     AS month_date,
          COUNT(*)                                           AS new_members
        FROM members
        WHERE gym_id=$1
          AND joined_at >= DATE_TRUNC('month', (${CR_TODAY} - INTERVAL '5 months'))
        GROUP BY month_date, month
        ORDER BY month_date ASC
      `, [gymId]),

      pool.query(`
        SELECT plan, COUNT(*) AS count
        FROM members
        WHERE gym_id=$1 AND status='active' AND NOT blocked
        GROUP BY plan ORDER BY count DESC
      `, [gymId]),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='active'  AND NOT blocked) AS active,
          COUNT(*) FILTER (WHERE status='overdue' AND NOT blocked) AS overdue,
          COUNT(*) FILTER (WHERE status='inactive')                AS inactive,
          COUNT(*) FILTER (WHERE blocked)                          AS blocked
        FROM members WHERE gym_id=$1
      `, [gymId]),

      pool.query(`
        SELECT member_name, COUNT(*) AS visits
        FROM attendance
        WHERE gym_id=$1
          AND date >= (${CR_TODAY} - INTERVAL '30 days')
          AND type = 'member'
        GROUP BY member_name
        ORDER BY visits DESC
        LIMIT 5
      `, [gymId]),
    ]);

    const s = statusRes.rows[0];
    res.json({
      growth: growthRes.rows.map(r => ({
        month:      r.month,
        newMembers: Number(r.new_members),
      })),
      byPlan: plansRes.rows.map(r => ({
        plan:  r.plan,
        count: Number(r.count),
      })),
      byStatus: {
        active:   Number(s.active),
        overdue:  Number(s.overdue),
        inactive: Number(s.inactive),
        blocked:  Number(s.blocked),
      },
      topAttendees: topRes.rows.map(r => ({
        name:   r.member_name,
        visits: Number(r.visits),
      })),
    });
  } catch (err) {
    console.error("analytics/members error:", err.message);
    res.status(500).json({ error: "Error al obtener datos de miembros" });
  }
});

module.exports = router;