const jwt = require("jsonwebtoken");

// Verifica el token JWT y adjunta el usuario + gym_id al request.
// Cada endpoint protegido usa req.user.gymId para filtrar sus datos,
// garantizando que ningún gimnasio vea datos de otro.
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, gymId, role, name }
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// Middleware adicional: solo admins pueden ejecutar ciertas acciones
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Se requiere rol de administrador" });
  }
  next();
};

module.exports = { auth, adminOnly };
