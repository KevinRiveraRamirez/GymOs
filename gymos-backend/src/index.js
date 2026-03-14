require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");

const authRoutes       = require("./routes/auth");
const membersRoutes    = require("./routes/members");
const paymentsRoutes   = require("./routes/payments");
const attendanceRoutes = require("./routes/attendance");
const gymsRoutes       = require("./routes/gyms");

const app  = express();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      "https://gym-os-qtw7.vercel.app",
      "http://localhost:5173",
      process.env.FRONTEND_URL
    ].filter(Boolean);
    if(!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// Rate limiting — evita fuerza bruta en login
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." }
}));

// Rate limiting general
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Demasiadas solicitudes" }
}));

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use("/api/auth",       authRoutes);
app.use("/api/members",    membersRoutes);
app.use("/api/payments",   paymentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/gyms",       gymsRoutes);

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok", version: "1.0.0" }));

// 404
app.use((_, res) => res.status(404).json({ error: "Endpoint no encontrado" }));

// Error handler global
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// ─── ARRANCAR ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GymOS API corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Frontend: ${process.env.FRONTEND_URL || "* (todos)"}\n`);
});
